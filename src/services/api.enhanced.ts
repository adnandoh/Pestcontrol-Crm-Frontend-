import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { apiConfig, API_ENDPOINTS, CACHE_KEYS } from '../config/api.config';
import { apiCache } from './apiCache';
import type {
  LoginCredentials,
  AuthTokens,
  AuthUser,
  Client,
  Inquiry,
  JobCard,
  Renewal,
  PaginatedResponse,
  ClientFilters,
  InquiryFilters,
  JobCardFilters,
  RenewalFilters,
  ClientFormData,
  InquiryFormData,
  JobCardFormData,
  DashboardStats,
  DashboardStatisticsResponse,
} from '../types';

// Enhanced API Error class
export class ApiError extends Error {
  public status: number;
  public details?: any;
  
  constructor(
    message: string,
    status: number,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Request/Response logging
const logRequest = (config: AxiosRequestConfig) => {
  if (apiConfig.enableLogging) {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data,
    });
  }
};

const logResponse = (response: AxiosResponse) => {
  if (apiConfig.enableLogging) {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`, {
      data: response.data,
    });
  }
};

const logError = (error: AxiosError) => {
  if (apiConfig.enableLogging) {
    console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, {
      message: error.message,
      response: error.response?.data,
    });
  }
};

// Enhanced API Service Class
class EnhancedApiService {
  private api: AxiosInstance;
  private requestQueue: Map<string, Promise<any>> = new Map();

  constructor() {
    this.api = axios.create({
      baseURL: apiConfig.baseUrl,
      timeout: apiConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log request
        logRequest(config);

        return config;
      },
      (error) => {
        logError(error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        logResponse(response);
        return response;
      },
      async (error: AxiosError) => {
        logError(error);

        const originalRequest = error.config as any;

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const response = await axios.post(
                `${apiConfig.baseUrl}${API_ENDPOINTS.AUTH.REFRESH}`,
                { refresh: refreshToken },
                {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );

              const newAccessToken = response.data.access;
              localStorage.setItem('access_token', newAccessToken);

              // Retry original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              }

              return this.api(originalRequest);
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              // Refresh failed, clear tokens and redirect to login
              this.clearTokens();
              // Use setTimeout to avoid potential issues with immediate redirect
              setTimeout(() => {
                window.location.href = '/login';
              }, 100);
              return Promise.reject(refreshError);
            }
          } else {
            // No refresh token, redirect to login
            console.warn('No refresh token available, redirecting to login');
            this.clearTokens();
            setTimeout(() => {
              window.location.href = '/login';
            }, 100);
          }
        }

        // Transform error
        const apiError = new ApiError(
          (error.response?.data as any)?.message || error.message,
          error.response?.status || 0,
          error.response?.data
        );

        return Promise.reject(apiError);
      }
    );
  }

  // Request deduplication
  private async makeRequest<T>(
    key: string,
    requestFn: () => Promise<AxiosResponse<T>>
  ): Promise<T> {
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key);
    }

    const promise = requestFn().then(response => response.data);
    this.requestQueue.set(key, promise);

    try {
      const result = await promise;
      this.requestQueue.delete(key);
      return result;
    } catch (error) {
      this.requestQueue.delete(key);
      throw error;
    }
  }

  // Retry logic
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    attempts: number = apiConfig.retryAttempts
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (attempts > 1 && this.isRetryableError(error)) {
        await this.delay(apiConfig.retryDelay);
        return this.retryRequest(requestFn, attempts - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors or 5xx server errors
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Token management
  private clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    apiCache.clear();
  }

  // Cached request method
  private async cachedRequest<T>(
    cacheKey: string,
    requestFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    if (apiConfig.enableCache) {
      const cached = apiCache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await requestFn();

    if (apiConfig.enableCache) {
      apiCache.set(cacheKey, result, ttl);
    }

    return result;
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; access: string; refresh: string }> {
    const response = await this.retryRequest(() =>
      this.api.post<AuthTokens>(API_ENDPOINTS.AUTH.LOGIN, credentials)
    );

    // Store tokens
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);

    // Create user object from login response data
    const user: AuthUser = {
      id: response.data.user_id || 0,
      username: response.data.username || credentials.username,
      email: response.data.email || '',
      first_name: response.data.first_name || '',
      last_name: response.data.last_name || '',
      is_staff: response.data.is_staff || false,
      is_superuser: response.data.is_superuser || false,
    };

    // Store user information for later use
    localStorage.setItem('user_info', JSON.stringify(user));

    return {
      user,
      access: response.data.access,
      refresh: response.data.refresh,
    };
  }

  async refreshToken(): Promise<{ user: AuthUser }> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await this.api.post<{ access: string }>(
      API_ENDPOINTS.AUTH.REFRESH,
      { refresh: refreshToken }
    );

    localStorage.setItem('access_token', response.data.access);

    // Get user information from localStorage
    const userInfoStr = localStorage.getItem('user_info');
    
    if (!userInfoStr) {
      throw new Error('No user information available in localStorage');
    }

    const user: AuthUser = JSON.parse(userInfoStr);
    return { user };
  }

  logout(): void {
    this.clearTokens();
  }

  async getCurrentUser(): Promise<AuthUser> {
    const userInfoStr = localStorage.getItem('user_info');
    
    if (!userInfoStr) {
      throw new Error('No user information available in localStorage');
    }

    return JSON.parse(userInfoStr);
  }

  // Client methods
  async getClients(params?: ClientFilters & { page?: number; page_size?: number }): Promise<PaginatedResponse<Client>> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.CLIENTS, params);
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<PaginatedResponse<Client>>(API_ENDPOINTS.CLIENTS, { params })
        )
      ),
      5 * 60 * 1000 // 5 minutes cache
    );
  }

  async getClient(id: number): Promise<Client> {
    const cacheKey = `${API_ENDPOINTS.CLIENTS}${id}`;
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<Client>(`${API_ENDPOINTS.CLIENTS}${id}/`)
        )
      )
    );
  }

  async createClient(data: ClientFormData): Promise<Client> {
    const result = await this.retryRequest(() =>
      this.api.post<Client>(API_ENDPOINTS.CLIENTS, data)
    );

    // Invalidate clients cache
    apiCache.delete(CACHE_KEYS.CLIENTS);
    
    return result.data;
  }

  async updateClient(id: number, data: Partial<ClientFormData>): Promise<Client> {
    const result = await this.retryRequest(() =>
      this.api.patch<Client>(`${API_ENDPOINTS.CLIENTS}${id}/`, data)
    );

    // Invalidate related caches
    apiCache.delete(CACHE_KEYS.CLIENTS);
    apiCache.delete(`${API_ENDPOINTS.CLIENTS}${id}`);
    
    return result.data;
  }

  async deleteClient(id: number): Promise<void> {
    await this.retryRequest(() =>
      this.api.delete(`${API_ENDPOINTS.CLIENTS}${id}/`)
    );

    // Invalidate related caches
    apiCache.delete(CACHE_KEYS.CLIENTS);
    apiCache.delete(`${API_ENDPOINTS.CLIENTS}${id}`);
  }

  // Inquiry methods
  async getInquiries(params?: InquiryFilters & { page?: number; page_size?: number }): Promise<PaginatedResponse<Inquiry>> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.INQUIRIES, params);
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<PaginatedResponse<Inquiry>>(API_ENDPOINTS.INQUIRIES, { params })
        )
      ),
      2 * 60 * 1000 // 2 minutes cache for inquiries (more dynamic)
    );
  }

  async getInquiry(id: number): Promise<Inquiry> {
    const cacheKey = `${API_ENDPOINTS.INQUIRIES}${id}`;
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<Inquiry>(`${API_ENDPOINTS.INQUIRIES}${id}/`)
        )
      )
    );
  }

  async createInquiry(data: InquiryFormData): Promise<Inquiry> {
    const result = await this.retryRequest(() =>
      this.api.post<Inquiry>(API_ENDPOINTS.INQUIRIES, data)
    );

    // Invalidate inquiries cache
    apiCache.delete(CACHE_KEYS.INQUIRIES);
    
    return result.data;
  }

  async updateInquiry(id: number, data: Partial<InquiryFormData>): Promise<Inquiry> {
    const result = await this.retryRequest(() =>
      this.api.patch<Inquiry>(`${API_ENDPOINTS.INQUIRIES}${id}/`, data)
    );

    // Invalidate related caches
    apiCache.delete(CACHE_KEYS.INQUIRIES);
    apiCache.delete(`${API_ENDPOINTS.INQUIRIES}${id}`);
    
    return result.data;
  }

  async convertInquiry(id: number, jobCardData?: Partial<JobCardFormData>): Promise<JobCard> {
    let requestData = {};
    
    // If jobCardData is provided, structure it properly
    if (jobCardData) {
      requestData = {
        client_data: {
          full_name: jobCardData.client_name || '',
          mobile: jobCardData.client_mobile || '',
          email: jobCardData.client_email || '',
          city: jobCardData.client_city || '',
          address: jobCardData.client_address || ''
        },
        client_address: jobCardData.client_address || '', // Send as direct field too
        job_type: jobCardData.job_type || 'Customer',
        is_paused: jobCardData.is_paused || false,
        service_type: jobCardData.service_type || '',
        schedule_date: jobCardData.schedule_date || '',
        status: jobCardData.status || 'Enquiry',
        payment_status: jobCardData.payment_status || 'Unpaid',
        price: (() => {
          const priceStr = jobCardData.price === '' ? '0' : String(jobCardData.price || '0');
          if (priceStr.length > 50) {
            throw new ApiError('Price value is too long (max 50 characters)', 400);
          }
          return priceStr;
        })(),
        next_service_date: jobCardData.next_service_date || null,
        contract_duration: jobCardData.contract_duration || null,
        reference: jobCardData.reference || '',
        extra_notes: jobCardData.extra_notes || ''
      };
    }

    const result = await this.retryRequest(() =>
      this.api.post<JobCard>(`${API_ENDPOINTS.INQUIRIES}${id}/convert/`, requestData)
    );

    // Invalidate related caches
    apiCache.delete(CACHE_KEYS.INQUIRIES);
    apiCache.delete(CACHE_KEYS.JOBCARDS);
    apiCache.delete(`${API_ENDPOINTS.INQUIRIES}${id}`);
    
    return result.data;
  }

  async markInquiryAsRead(id: number): Promise<Inquiry> {
    const result = await this.retryRequest(() =>
      this.api.post<Inquiry>(`${API_ENDPOINTS.INQUIRIES}${id}/mark_as_read/`)
    );

    // Invalidate related caches
    apiCache.delete(CACHE_KEYS.INQUIRIES);
    apiCache.delete(`${API_ENDPOINTS.INQUIRIES}${id}`);
    
    return result.data;
  }

  async deleteInquiry(id: number): Promise<void> {
    await this.retryRequest(() =>
      this.api.delete(`${API_ENDPOINTS.INQUIRIES}${id}/`)
    );

    // Invalidate related caches
    apiCache.delete(CACHE_KEYS.INQUIRIES);
    apiCache.delete(`${API_ENDPOINTS.INQUIRIES}${id}`);
  }

  // Job Card methods
  async getJobCards(params?: JobCardFilters & { page?: number; page_size?: number }): Promise<PaginatedResponse<JobCard>> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.JOBCARDS, params);
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<PaginatedResponse<JobCard>>(API_ENDPOINTS.JOBCARDS, { params })
        )
      ),
      3 * 60 * 1000 // 3 minutes cache
    );
  }

  async getJobCard(id: number): Promise<JobCard> {
    const cacheKey = `${API_ENDPOINTS.JOBCARDS}${id}`;
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<JobCard>(`${API_ENDPOINTS.JOBCARDS}${id}/`)
        )
      )
    );
  }

  async createJobCard(data: JobCardFormData, clientExists: boolean = false): Promise<JobCard> {
    // Validate field lengths to prevent database errors
    const priceStr = data.price === '' ? '0' : String(data.price || '0');
    if (priceStr.length > 50) {
      throw new ApiError('Price value is too long (max 50 characters)', 400);
    }

    // IMPORTANT: Always create a NEW job card - never update existing ones
    // Multiple job cards can be created for the same client (same phone number)
    // Ensure no 'id' field is sent to prevent accidental updates
    
    // Structure the data according to API expectations
    const requestData: any = {
      client_data: {
        // Only send full_name if client doesn't exist - client name should not be updated for existing clients
        ...(clientExists ? {} : { full_name: data.client_name }),
        mobile: data.client_mobile,
        email: data.client_email || '',
        city: data.client_city,
        address: data.client_address || '',
        notes: data.client_notes || ''
      },
      client_address: data.client_address || '', // Send as direct field too
      job_type: data.job_type || 'Customer',
      is_paused: data.is_paused || false,
      service_type: data.service_type,
      schedule_date: data.schedule_date,
      status: data.status || 'Enquiry',
      payment_status: data.payment_status || 'Unpaid',
      price: priceStr,
      next_service_date: data.next_service_date || null,
      contract_duration: data.contract_duration || null,
      reference: data.reference || '',
      extra_notes: data.extra_notes || ''
    };

    // Explicitly ensure no 'id' is sent during creation
    if ('id' in requestData) {
      delete requestData.id;
    }

    const result = await this.retryRequest(() =>
      this.api.post<JobCard>(API_ENDPOINTS.JOBCARDS, requestData)
    );

    // Invalidate job cards cache
    apiCache.delete(CACHE_KEYS.JOBCARDS);
    
    return result.data;
  }

  async updateJobCard(id: number, data: Partial<JobCardFormData>): Promise<JobCard> {
    // Structure the data according to API expectations
    const requestData: any = {};
    
    // Always send client_data if any client field is present in the form data
    // IMPORTANT: Do NOT send full_name (client_name) when updating - client name should not be updated
    if (data.client_mobile !== undefined || data.client_email !== undefined || data.client_city !== undefined || data.client_address !== undefined || data.client_notes !== undefined) {
      requestData.client_data = {};
      // Do NOT include full_name - client name should remain unchanged
      if (data.client_mobile !== undefined) requestData.client_data.mobile = data.client_mobile;
      if (data.client_email !== undefined) requestData.client_data.email = data.client_email;
      if (data.client_city !== undefined) requestData.client_data.city = data.client_city;
      if (data.client_address !== undefined) requestData.client_data.address = data.client_address;
      if (data.client_notes !== undefined) requestData.client_data.notes = data.client_notes || '';
    }
    
    // Also send client_address as direct field
    if (data.client_address !== undefined) {
      requestData.client_address = data.client_address;
    }
    
    // Add other supported fields directly
    if (data.job_type !== undefined) requestData.job_type = data.job_type;
    if (data.is_paused !== undefined) requestData.is_paused = data.is_paused;
    if (data.service_type !== undefined) requestData.service_type = data.service_type;
    if (data.schedule_date !== undefined) requestData.schedule_date = data.schedule_date;
    if (data.status !== undefined) requestData.status = data.status;
    if (data.payment_status !== undefined) requestData.payment_status = data.payment_status;
    if (data.price !== undefined) {
      const priceStr = data.price === '' ? '0' : String(data.price || '0');
      if (priceStr.length > 50) {
        throw new ApiError('Price value is too long (max 50 characters)', 400);
      }
      requestData.price = priceStr;
    }
    if (data.next_service_date !== undefined) requestData.next_service_date = data.next_service_date || null;
    if (data.contract_duration !== undefined) requestData.contract_duration = data.contract_duration;
    if (data.reference !== undefined) requestData.reference = data.reference;
    if (data.extra_notes !== undefined) requestData.extra_notes = data.extra_notes;



    const result = await this.retryRequest(() =>
      this.api.patch<JobCard>(`${API_ENDPOINTS.JOBCARDS}${id}/`, requestData)
    );

    // Invalidate related caches
    apiCache.delete(CACHE_KEYS.JOBCARDS);
    apiCache.delete(`${API_ENDPOINTS.JOBCARDS}${id}`);
    
    return result.data;
  }

  async updateJobCardPaymentStatus(id: number, paymentStatus: string): Promise<JobCard> {
    const result = await this.retryRequest(() =>
      this.api.patch<JobCard>(`${API_ENDPOINTS.JOBCARDS}${id}/update_payment_status/`, { payment_status: paymentStatus })
    );

    // Invalidate related caches
    apiCache.delete(CACHE_KEYS.JOBCARDS);
    apiCache.delete(`${API_ENDPOINTS.JOBCARDS}${id}`);
    
    return result.data;
  }

  async checkClientExists(mobile: string): Promise<{ exists: boolean; client?: Client }> {
    const response = await this.retryRequest(() =>
      this.api.get<{ exists: boolean; client?: Client }>(`${API_ENDPOINTS.DASHBOARD}check-client/`, {
        params: { mobile }
      })
    );
    return response.data;
  }

  async getJobCardStatistics(): Promise<any> {
    const cacheKey = 'jobcard_statistics';
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.api.get<any>(`${API_ENDPOINTS.JOBCARDS}statistics/`)
      ),
      1 * 60 * 1000 // 1 minute cache for statistics
    );
  }

  async getReferenceStatistics(): Promise<any> {
    const cacheKey = 'reference_statistics';
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<any>(`${API_ENDPOINTS.JOBCARDS}reference-statistics/`)
        )
      ),
      2 * 60 * 1000 // 2 minutes cache for reference statistics
    );
  }

  async getReferenceReport(): Promise<any> {
    const cacheKey = 'reference_report';
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<any>(`${API_ENDPOINTS.JOBCARDS}reference-report/`)
        )
      ),
      2 * 60 * 1000 // 2 minutes cache for reference report
    );
  }

  // Renewal methods
  async getRenewals(params?: RenewalFilters & { page?: number; page_size?: number }): Promise<PaginatedResponse<Renewal>> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.RENEWALS, params);
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<PaginatedResponse<Renewal>>(API_ENDPOINTS.RENEWALS, { params })
        )
      ),
      3 * 60 * 1000 // 3 minutes cache
    );
  }

  async getRenewal(id: number): Promise<Renewal> {
    const cacheKey = `${API_ENDPOINTS.RENEWALS}${id}`;
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<Renewal>(`${API_ENDPOINTS.RENEWALS}${id}/`)
        )
      )
    );
  }

  async updateRenewal(id: number, data: Partial<Renewal>): Promise<Renewal> {
    const result = await this.retryRequest(() =>
      this.api.patch<Renewal>(`${API_ENDPOINTS.RENEWALS}${id}/`, data)
    );

    // Invalidate related caches
    apiCache.delete(CACHE_KEYS.RENEWALS);
    apiCache.delete(`${API_ENDPOINTS.RENEWALS}${id}`);
    
    return result.data;
  }

  async markRenewalCompleted(id: number): Promise<Renewal> {
    const result = await this.retryRequest(() =>
      this.api.post<Renewal>(`${API_ENDPOINTS.RENEWALS}${id}/mark_completed/`)
    );

    // Invalidate related caches
    apiCache.delete(CACHE_KEYS.RENEWALS);
    apiCache.delete(`${API_ENDPOINTS.RENEWALS}${id}`);
    
    return result.data;
  }

  async getActiveRenewals(params?: RenewalFilters & { page?: number; page_size?: number }): Promise<PaginatedResponse<Renewal>> {
    const cacheKey = apiCache.generateKey(`${API_ENDPOINTS.RENEWALS}active/`, params);
    
    return this.cachedRequest(
      this.makeRequest(
        cacheKey,
        () => this.api.get<PaginatedResponse<Renewal>>(`${API_ENDPOINTS.RENEWALS}active/`, { params })
      ),
      2 * 60 * 1000 // 2 minutes cache
    );
  }

  async updateRenewalUrgencyLevels(): Promise<{ updated: number }> {
    const result = await this.retryRequest(() =>
      this.api.post<{ updated: number }>(`${API_ENDPOINTS.RENEWALS}update_urgency_levels/`)
    );

    // Invalidate renewals cache
    apiCache.delete(CACHE_KEYS.RENEWALS);
    
    return result.data;
  }

  async toggleJobCardPause(jobcardId: number, isPaused: boolean): Promise<{ message: string; is_paused: boolean }> {
    const result = await this.retryRequest(() =>
      this.api.patch<{ message: string; is_paused: boolean }>(`${API_ENDPOINTS.JOBCARDS}${jobcardId}/toggle_pause/`, {
        is_paused: isPaused
      })
    );

    // Invalidate related caches
    apiCache.delete(CACHE_KEYS.RENEWALS);
    apiCache.delete(CACHE_KEYS.JOBCARDS);
    apiCache.delete(`${API_ENDPOINTS.JOBCARDS}${jobcardId}`);
    
    return result.data;
  }

  async bulkMarkRenewalsCompleted(renewalIds: number[]): Promise<{ success_count: number; failed_count: number; failed_ids: number[]; total: number }> {
    const result = await this.retryRequest(() =>
      this.api.post<{ success_count: number; failed_count: number; failed_ids: number[]; total: number }>(
        `${API_ENDPOINTS.RENEWALS}bulk_mark_completed/`,
        { renewal_ids: renewalIds }
      )
    );

    // Invalidate renewals cache
    apiCache.delete(CACHE_KEYS.RENEWALS);
    
    return result.data;
  }

  async generateRenewalsForJobCard(jobcardId: number, forceRegenerate: boolean = false): Promise<{ renewals_count: number; renewals: Renewal[] }> {
    const result = await this.retryRequest(() =>
      this.api.post<{ renewals_count: number; renewals: Renewal[] }>(
        `${API_ENDPOINTS.RENEWALS}generate_renewals/`,
        { jobcard_id: jobcardId, force_regenerate: forceRegenerate }
      )
    );

    // Invalidate renewals cache
    apiCache.delete(CACHE_KEYS.RENEWALS);
    apiCache.delete(CACHE_KEYS.JOBCARDS);
    
    return result.data;
  }

  // Dashboard Statistics
  async getDashboardStatistics(): Promise<DashboardStatisticsResponse> {
    const cacheKey = CACHE_KEYS.DASHBOARD_STATS;
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<DashboardStatisticsResponse>(API_ENDPOINTS.DASHBOARD_STATS)
        )
      ),
      2 * 60 * 1000 // 2 minutes cache for dashboard stats
    );
  }

  // Health check methods
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.retryRequest(() =>
      this.api.get<{ status: string; timestamp: string }>(API_ENDPOINTS.HEALTH)
    );
    return response.data;
  }

  async firebaseHealthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.retryRequest(() =>
      this.api.get<{ status: string; timestamp: string }>(API_ENDPOINTS.FIREBASE_HEALTH)
    );
    return response.data;
  }

  // Cache management
  clearCache(): void {
    apiCache.clear();
  }

  getCacheStats() {
    return apiCache.getStats();
  }
}

// Export singleton instance
export const enhancedApiService = new EnhancedApiService();

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { apiConfig, API_ENDPOINTS, CACHE_KEYS } from '../config/api.config';
import { apiCache } from './apiCache';
import {
  forceSessionLogout,
  refreshAccessTokenFromStorage,
  scheduleProactiveAccessRefresh,
  SESSION_EXPIRED_MESSAGE,
  stopAuthSessionScheduler,
} from './authSession';
import type {
  LoginCredentials,
  AuthTokens,
  AuthUser,
  Client,
  Inquiry,
  JobCard,
  Renewal,
  Technician,
  PaginatedResponse,
  Feedback,
  TechnicianPerformance,
  ClientFilters,
  InquiryFilters,
  JobCardFilters,
  RenewalFilters,
  ReminderFilters,
  StaffUser,
  ActivityLog,
  ClientFormData,
  InquiryFormData,
  JobCardFormData,
  DashboardStatisticsResponse,
  CRMInquiry,
  CRMInquiryFormData,
  CRMInquiryFilters,
  PartnerReferral,
  PartnerAppVersionConfig,
  CRMInquiryStatus,
  DashboardCounts,
  StaffPerformance,
  GlobalSearchResult,
  CustomerHistory,
  Reminder,
  ReminderFormData,
  Country,
  State,
  City,
  Location as MasterLocation,
  Quotation,
  QuotationFormData,
  QuotationFilters,
  PartnerJobSelfie,
  InquiryRemarkEntry,
  PricingRegion,
  PricingRate,
  PricingRateFormData,
  PricingRateFilters,
  PricingRateAuditLog,
  BookingPaymentRecord,
  PendingPaymentStats,
  PendingPaymentFilters,
  CollectPaymentPayload,
  StaffTrackingLive,
  StaffTrackingProfile,
  StaffTrackingAttendance,
  StaffTrackingHistory,
  StaffTrackingDistanceRow, FieldVisit, StaffTask, LeaveApplication, ExpenseClaim,
} from '../types';
import { isSocietyBooking } from '../constants/bookingPropertyTypes';

function flattenValidationDetails(value: unknown, prefix = ''): string[] {
  if (value == null) return [];
  if (typeof value === 'string') return prefix ? [`${prefix}: ${value}`] : [value];
  if (Array.isArray(value)) {
    if (!value.length) return [];
    const first = value[0];
    if (typeof first === 'string') return prefix ? [`${prefix}: ${first}`] : [first];
    return flattenValidationDetails(first, prefix);
  }
  if (typeof value !== 'object') return [];
  const parts: string[] = [];
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const label = prefix ? `${prefix} → ${key.replace(/_/g, ' ')}` : key.replace(/_/g, ' ');
    parts.push(...flattenValidationDetails(val, label));
  }
  return parts;
}

function formatApiErrorMessage(data: Record<string, unknown> | undefined, fallback: string): string {
  if (!data) return fallback;
  if (typeof data.message === 'string' && data.message) return data.message;
  const nestedDetails = data.details;
  if (nestedDetails) {
    const parts = flattenValidationDetails(nestedDetails);
    if (parts.length) return parts.join('\n');
  }
  if (typeof data.error === 'string' && data.error && data.error !== 'Validation failed') {
    return data.error;
  }
  const fieldParts: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (['message', 'error', 'details', 'success', 'code'].includes(key)) continue;
    fieldParts.push(...flattenValidationDetails(val, key.replace(/_/g, ' ')));
  }
  if (fieldParts.length) return fieldParts.join('\n');
  if (typeof data.error === 'string' && data.error) return data.error;
  return fallback;
}

function nullIfEmpty(value: unknown): unknown {
  if (value === '' || value === undefined) return null;
  return value;
}

function normalizeServiceCategory(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  const sc = String(value).trim();
  if (sc === 'AMC' || sc.includes('AMC')) return 'AMC';
  if (sc === 'One-Time Service' || sc.includes('One Time') || sc.includes('One-Time')) {
    return 'One-Time Service';
  }
  return sc;
}

function sanitizeJobCardPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out = { ...payload };
  const emptyToNull = [
    'bhk_size', 'property_type', 'contract_duration', 'society_billing_type', 'payment_mode',
    'reminder_date', 'reminder_time', 'reminder_note', 'next_service_date',
    'assigned_to', 'notes', 'extra_notes', 'cancellation_reason', 'removal_remarks',
    'technician', 'master_country', 'master_state', 'master_city', 'master_location',
    'full_address',
  ];
  for (const field of emptyToNull) {
    if (field in out) out[field] = nullIfEmpty(out[field]);
  }
  if ('service_category' in out) {
    const normalized = normalizeServiceCategory(out.service_category);
    if (normalized === null) delete out.service_category;
    else out.service_category = normalized;
  }
  return out;
}

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
        'Accept': 'application/json',
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

        // Handle 401 — silent refresh + retry (skip auth endpoints)
        const url = originalRequest?.url ?? '';
        const isAuthEndpoint =
          url.includes(API_ENDPOINTS.AUTH.LOGIN) || url.includes(API_ENDPOINTS.AUTH.REFRESH);

        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          !isAuthEndpoint
        ) {
          originalRequest._retry = true;

          try {
            const newAccess = await refreshAccessTokenFromStorage();
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            }
            return this.api(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            forceSessionLogout(SESSION_EXPIRED_MESSAGE);
            return Promise.reject(refreshError);
          }
        }

        const data = error.response?.data as Record<string, unknown> | undefined;
        const apiError = new ApiError(
          formatApiErrorMessage(data, error.message),
          error.response?.status || 0,
          data
        );

        return Promise.reject(apiError);
      }
    );
  }

  // Request deduplication
  private async makeRequest<T>(
    key: string,
    requestFn: () => Promise<AxiosResponse<T>>,
    bypassQueue: boolean = false
  ): Promise<T> {
    if (!bypassQueue && this.requestQueue.has(key)) {
      return this.requestQueue.get(key);
    }

    const promise = requestFn().then(response => response.data);
    
    if (!bypassQueue) {
      this.requestQueue.set(key, promise);
    }

    try {
      const result = await promise;
      if (!bypassQueue) {
        this.requestQueue.delete(key);
      }
      return result;
    } catch (error) {
      if (!bypassQueue) {
        this.requestQueue.delete(key);
      }
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
    stopAuthSessionScheduler();
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
        if (apiConfig.enableLogging) {
          console.debug(`📦 API cache hit (no network): ${cacheKey}`);
        }
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
      role: response.data.role,
      role_display: response.data.role_display,
    };

    // Store user information for later use
    localStorage.setItem('user_info', JSON.stringify(user));

    scheduleProactiveAccessRefresh();

    return {
      user,
      access: response.data.access,
      refresh: response.data.refresh,
    };
  }

  async refreshToken(): Promise<{ user: AuthUser }> {
    await refreshAccessTokenFromStorage();

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

  // Technician methods
  async getTechnicians(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
    ordering?: string;
  }): Promise<PaginatedResponse<Technician>> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.TECHNICIANS, params);

    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<PaginatedResponse<Technician>>(API_ENDPOINTS.TECHNICIANS, { params }),
        ),
      ),
      2 * 60 * 1000,
    );
  }

  async getActiveTechnicians(options?: { fresh?: boolean }): Promise<Technician[]> {
    const cacheKey = `${API_ENDPOINTS.TECHNICIANS}active/`;

    if (options?.fresh) {
      return this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<Technician[]>(cacheKey),
        ),
      );
    }

    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<Technician[]>(cacheKey),
        ),
      ),
      5 * 60 * 1000,
    );
  }

  async createTechnician(data: Partial<Technician>): Promise<Technician> {
    const result = await this.retryRequest(() =>
      this.api.post<Technician>(API_ENDPOINTS.TECHNICIANS, data),
    );
    apiCache.deletePattern(CACHE_KEYS.TECHNICIANS);
    return result.data;
  }

  async updateTechnician(id: number, data: Partial<Technician>): Promise<Technician> {
    const result = await this.retryRequest(() =>
      this.api.patch<Technician>(`${API_ENDPOINTS.TECHNICIANS}${id}/`, data),
    );
    apiCache.deletePattern(CACHE_KEYS.TECHNICIANS);
    return result.data;
  }

  async approvePartnerApp(technicianId: number): Promise<Technician> {
    const result = await this.retryRequest(() =>
      this.api.post<{ technician: Technician }>(
        `${API_ENDPOINTS.TECHNICIANS}${technicianId}/approve-partner-app/`,
      ),
    );
    apiCache.deletePattern(CACHE_KEYS.TECHNICIANS);
    return result.data.technician ?? (result.data as unknown as Technician);
  }

  async revokePartnerApp(technicianId: number): Promise<Technician> {
    const result = await this.retryRequest(() =>
      this.api.post<{ technician: Technician }>(
        `${API_ENDPOINTS.TECHNICIANS}${technicianId}/revoke-partner-app/`,
      ),
    );
    apiCache.deletePattern(CACHE_KEYS.TECHNICIANS);
    return result.data.technician ?? (result.data as unknown as Technician);
  }

  async getTechnicianPerformance(params?: { from?: string; to?: string; service_type?: string }): Promise<{ stats: any; technicians: TechnicianPerformance[] }> {
    const cacheKey = apiCache.generateKey(`${API_ENDPOINTS.TECHNICIANS}performance/`, params);
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<{ stats: any; technicians: TechnicianPerformance[] }>(`${API_ENDPOINTS.TECHNICIANS}performance/`, { params })
        )
      ),
      2 * 60 * 1000 // 2 minutes cache
    );
  }

  async getTechnicianPerformanceDetail(id: number): Promise<any> {
    const cacheKey = `/technicians/${id}/performance_detail/`;
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<any>(`/technicians/${id}/performance_detail/`)
        )
      ),
      5 * 60 * 1000 // 5 minutes cache
    );
  }

  // CRM Inquiry methods
  async getCRMInquiries(params?: CRMInquiryFilters & { page?: number; page_size?: number }): Promise<PaginatedResponse<CRMInquiry>> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.CRM_INQUIRIES, params);
    return this.retryRequest(() =>
      this.makeRequest(
        cacheKey,
        () => this.api.get<PaginatedResponse<CRMInquiry>>(API_ENDPOINTS.CRM_INQUIRIES, { params }),
      ),
    );
  }

  async getCRMInquiry(id: number): Promise<CRMInquiry> {
    const cacheKey = `${API_ENDPOINTS.CRM_INQUIRIES}${id}`;
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<CRMInquiry>(`${API_ENDPOINTS.CRM_INQUIRIES}${id}/`)
        )
      )
    );
  }

  async createCRMInquiry(data: CRMInquiryFormData): Promise<CRMInquiry> {
    const requestData = {
      ...data,
      reminder_date: data.reminder_date || null,
      reminder_time: data.reminder_time || null,
      reminder_note: data.reminder_note || null
    };
    const result = await this.retryRequest(() =>
      this.api.post<CRMInquiry>(API_ENDPOINTS.CRM_INQUIRIES, requestData)
    );
    apiCache.deletePattern(CACHE_KEYS.CRM_INQUIRIES);
    return result.data;
  }

  async updateCRMInquiry(id: number, data: Partial<CRMInquiryFormData>): Promise<CRMInquiry> {
    const requestData = { ...data };
    if (data.reminder_date !== undefined) requestData.reminder_date = data.reminder_date || null;
    if (data.reminder_time !== undefined) requestData.reminder_time = data.reminder_time || null;
    if (data.reminder_note !== undefined) requestData.reminder_note = data.reminder_note || null;

    const result = await this.retryRequest(() =>
      this.api.patch<CRMInquiry>(`${API_ENDPOINTS.CRM_INQUIRIES}${id}/`, requestData)
    );
    apiCache.deletePattern(CACHE_KEYS.CRM_INQUIRIES);
    apiCache.deletePattern(`${API_ENDPOINTS.CRM_INQUIRIES}${id}`);
    return result.data;
  }

  async convertInquiryToBooking(id: number): Promise<{ job_card_id: number; job_card_code: string }> {
    const result = await this.retryRequest(() =>
      this.api.post<{ job_card_id: number; job_card_code: string }>(`${API_ENDPOINTS.CRM_INQUIRIES}${id}/convert/`)
    );
    // Invalidate both caches
    apiCache.deletePattern(CACHE_KEYS.CRM_INQUIRIES);
    apiCache.deletePattern(CACHE_KEYS.JOBCARDS);
    return result.data;
  }

  async getPartnerReferrals(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: CRMInquiryStatus;
    partner_status?: string;
    ordering?: string;
  }): Promise<PaginatedResponse<PartnerReferral>> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.PARTNER_REFERRALS, params);
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<PaginatedResponse<PartnerReferral>>(API_ENDPOINTS.PARTNER_REFERRALS, { params }),
        ),
      ),
      2 * 60 * 1000,
    );
  }

  async updatePartnerReferralStatus(id: number, status: CRMInquiryStatus): Promise<PartnerReferral> {
    const result = await this.retryRequest(() =>
      this.api.patch<PartnerReferral>(`${API_ENDPOINTS.PARTNER_REFERRALS}${id}/`, { status }),
    );
    apiCache.deletePattern(CACHE_KEYS.PARTNER_REFERRALS);
    apiCache.deletePattern(CACHE_KEYS.CRM_INQUIRIES);
    return result.data;
  }

  async getCRMInquiryRemarks(
    inquiryId: number,
    params?: { page?: number; page_size?: number },
  ): Promise<PaginatedResponse<InquiryRemarkEntry>> {
    const result = await this.retryRequest(() =>
      this.api.get<PaginatedResponse<InquiryRemarkEntry>>(
        `${API_ENDPOINTS.CRM_INQUIRIES}${inquiryId}/remarks/`,
        { params },
      ),
    );
    return result.data;
  }

  async createCRMInquiryRemark(
    inquiryId: number,
    data: { remark: string; remark_type?: string },
  ): Promise<InquiryRemarkEntry> {
    const result = await this.retryRequest(() =>
      this.api.post<InquiryRemarkEntry>(
        `${API_ENDPOINTS.CRM_INQUIRIES}${inquiryId}/remarks/`,
        data,
      ),
    );
    apiCache.deletePattern(CACHE_KEYS.CRM_INQUIRIES);
    return result.data;
  }

  async getWebsiteLeadRemarks(
    leadId: number,
    params?: { page?: number; page_size?: number },
  ): Promise<PaginatedResponse<InquiryRemarkEntry>> {
    const result = await this.retryRequest(() =>
      this.api.get<PaginatedResponse<InquiryRemarkEntry>>(
        `${API_ENDPOINTS.WEBSITE_LEADS}${leadId}/remarks/`,
        { params },
      ),
    );
    return result.data;
  }

  async createWebsiteLeadRemark(
    leadId: number,
    data: { remark: string; remark_type?: string },
  ): Promise<InquiryRemarkEntry> {
    const result = await this.retryRequest(() =>
      this.api.post<InquiryRemarkEntry>(
        `${API_ENDPOINTS.WEBSITE_LEADS}${leadId}/remarks/`,
        data,
      ),
    );
    apiCache.deletePattern(CACHE_KEYS.INQUIRIES);
    return result.data;
  }

  async getCRMInquiryReminders(params?: { from?: string; to?: string }): Promise<{ count: number; results: CRMInquiry[] }> {
    const result = await this.retryRequest(() =>
      this.api.get<{ count: number; results: CRMInquiry[] }>(`${API_ENDPOINTS.CRM_INQUIRIES}reminders/`, { params })
    );
    return result.data;
  }

  async markCRMInquiryReminderDone(id: number): Promise<void> {
    await this.retryRequest(() =>
      this.api.post(`${API_ENDPOINTS.CRM_INQUIRIES}${id}/mark_reminder_done/`)
    );
    apiCache.deletePattern(CACHE_KEYS.CRM_INQUIRIES);
  }

  async markCRMInquiryAsRead(id: number): Promise<CRMInquiry> {
    const result = await this.retryRequest(() =>
      this.api.post<CRMInquiry>(`${API_ENDPOINTS.CRM_INQUIRIES}${id}/mark_as_read/`),
    );
    apiCache.deletePattern(CACHE_KEYS.CRM_INQUIRIES);
    return result.data;
  }

  async markCRMInquiriesAsRead(): Promise<{ updated: number }> {
    const result = await this.retryRequest(() =>
      this.api.post<{ status: string; updated: number }>(`${API_ENDPOINTS.CRM_INQUIRIES}mark-all-read/`),
    );
    apiCache.deletePattern(CACHE_KEYS.CRM_INQUIRIES);
    return { updated: result.data.updated ?? 0 };
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
    apiCache.deletePattern(CACHE_KEYS.CLIENTS);
    
    return result.data;
  }

  async updateClient(id: number, data: Partial<ClientFormData>): Promise<Client> {
    const result = await this.retryRequest(() =>
      this.api.patch<Client>(`${API_ENDPOINTS.CLIENTS}${id}/`, data)
    );

    // Invalidate related caches
    apiCache.deletePattern(CACHE_KEYS.CLIENTS);
    apiCache.deletePattern(`${API_ENDPOINTS.CLIENTS}${id}`);
    
    return result.data;
  }

  // Inquiry methods
  async getInquiries(params?: InquiryFilters & { page?: number; page_size?: number }): Promise<PaginatedResponse<Inquiry>> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.INQUIRIES, params);
    return this.retryRequest(() =>
      this.makeRequest(
        cacheKey,
        () => this.api.get<PaginatedResponse<Inquiry>>(API_ENDPOINTS.INQUIRIES, { params }),
      ),
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
    apiCache.deletePattern(CACHE_KEYS.INQUIRIES);
    
    return result.data;
  }

  async updateInquiry(id: number, data: Partial<InquiryFormData>): Promise<Inquiry> {
    const result = await this.retryRequest(() =>
      this.api.patch<Inquiry>(`${API_ENDPOINTS.INQUIRIES}${id}/`, data)
    );

    // Invalidate related caches
    apiCache.deletePattern(CACHE_KEYS.INQUIRIES);
    apiCache.deletePattern(`${API_ENDPOINTS.INQUIRIES}${id}`);
    
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
        schedule_datetime: jobCardData.schedule_datetime || '',
        reminder_date: jobCardData.reminder_date || null,
        reminder_time: jobCardData.reminder_time || null,
        reminder_note: jobCardData.reminder_note || null,
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
    apiCache.deletePattern(CACHE_KEYS.INQUIRIES);
    apiCache.deletePattern(CACHE_KEYS.JOBCARDS);
    apiCache.deletePattern(`${API_ENDPOINTS.INQUIRIES}${id}`);
    
    return result.data;
  }

  async markInquiryAsRead(id: number): Promise<Inquiry> {
    const result = await this.retryRequest(() =>
      this.api.post<Inquiry>(`${API_ENDPOINTS.INQUIRIES}${id}/mark_as_read/`)
    );

    // Invalidate related caches
    apiCache.deletePattern(CACHE_KEYS.INQUIRIES);
    apiCache.deletePattern(`${API_ENDPOINTS.INQUIRIES}${id}`);
    
    return result.data;
  }

  async markInquiriesAsRead(): Promise<void> {
    await this.api.post(`${API_ENDPOINTS.INQUIRIES}mark-all-read/`);
    apiCache.deletePattern(CACHE_KEYS.INQUIRIES);
  }

  // Reminder methods
  async getReminders(params?: ReminderFilters & { page?: number; page_size?: number }): Promise<PaginatedResponse<Reminder>> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.REMINDERS, params);
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<PaginatedResponse<Reminder>>(API_ENDPOINTS.REMINDERS, { params })
        )
      ),
      1 * 60 * 1000 // 1 minute cache
    );
  }

  async createReminder(data: ReminderFormData): Promise<Reminder> {
    const result = await this.retryRequest(() =>
      this.api.post<Reminder>(API_ENDPOINTS.REMINDERS, data)
    );
    apiCache.deletePattern(CACHE_KEYS.REMINDERS);
    return result.data;
  }

  async updateReminder(id: number, data: Partial<ReminderFormData>): Promise<Reminder> {
    const result = await this.retryRequest(() =>
      this.api.patch<Reminder>(`${API_ENDPOINTS.REMINDERS}${id}/`, data)
    );
    apiCache.deletePattern(CACHE_KEYS.REMINDERS);
    return result.data;
  }

  async markReminderComplete(id: number): Promise<void> {
    await this.retryRequest(() =>
      this.api.post(`${API_ENDPOINTS.REMINDERS}${id}/mark_complete/`)
    );
    apiCache.deletePattern(CACHE_KEYS.REMINDERS);
  }

  // Job Card methods
  async getJobCards(params?: JobCardFilters & { page?: number; page_size?: number }, signal?: AbortSignal): Promise<PaginatedResponse<JobCard>> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.JOBCARDS, params);

    // Booking lists are sorted/filtered dynamically — always fetch fresh data.
    return this.retryRequest(() =>
      this.makeRequest(
        cacheKey,
        () => this.api.get<PaginatedResponse<JobCard>>(API_ENDPOINTS.JOBCARDS, { params, signal }),
        !!signal,
      ),
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
        state: data.client_state || data.state || '',
        city: data.client_city || data.city || '',
        address: data.client_address || '',
        notes: data.client_notes || ''
      },
      client_address: data.client_address || '', // Send as direct field too
      job_type: data.job_type || 'Customer',
      service_category: data.service_category || 'One-Time Service',
      property_type: data.property_type || null,
      bhk_size: data.bhk_size || null,
      is_paused: data.is_paused || false,
      service_type: data.service_type,
      service_items: data.service_items || [],
      schedule_datetime: data.schedule_datetime,
      time_slot: data.time_slot || null,
      state: data.state || '',
      city: data.city || '',
      status: data.status || 'Pending',
      payment_status: data.payment_status || 'Unpaid',
      assigned_to: data.assigned_to || '',
      technician: data.technician || null,
      price: priceStr,
      next_service_date: data.next_service_date || null,
      contract_duration: data.contract_duration || null,
      reference: data.reference || '',
      notes: data.notes || '',
      extra_notes: data.extra_notes || '',
      cancellation_reason: data.cancellation_reason || '',
      removal_remarks: data.removal_remarks || '',
      reminder_date: data.reminder_date || null,
      reminder_time: data.reminder_time || null,
      reminder_note: data.reminder_note || null,
      is_reminder_done: data.is_reminder_done || false,
      master_country: data.master_country ?? null,
      master_state: data.master_state ?? null,
      master_city: data.master_city ?? null,
      master_location: data.master_location ?? null,
      full_address: data.full_address ?? null,
      commercial_type: data.commercial_type || 'home',
      society_billing_type: isSocietyBooking(data) ? (data.society_billing_type ?? 'Paid') : null,
      is_price_estimated: data.is_price_estimated ?? false,
      is_amc_main_booking: data.is_amc_main_booking ?? false,
      is_followup_visit: data.is_followup_visit ?? false,
      included_in_amc: data.included_in_amc ?? false,
      is_complaint_call: data.is_complaint_call ?? false,
    };

    // Explicitly ensure no 'id' is sent during creation
    if ('id' in requestData) {
      delete requestData.id;
    }

    const result = await this.retryRequest(() =>
      this.api.post<JobCard>(API_ENDPOINTS.JOBCARDS, sanitizeJobCardPayload(requestData))
    );

    // Invalidate job cards cache
    apiCache.deletePattern(CACHE_KEYS.JOBCARDS);
    
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
    if (data.service_category !== undefined) requestData.service_category = data.service_category;
    if (data.property_type !== undefined) requestData.property_type = data.property_type;
    if (data.bhk_size !== undefined) requestData.bhk_size = data.bhk_size;
    if (data.is_paused !== undefined) requestData.is_paused = data.is_paused;
    if (data.service_type !== undefined) requestData.service_type = data.service_type;
    if (data.service_items !== undefined) requestData.service_items = data.service_items;
    if (data.schedule_datetime !== undefined) requestData.schedule_datetime = data.schedule_datetime;
    if (data.time_slot !== undefined) requestData.time_slot = data.time_slot;
    if (data.state !== undefined) requestData.state = data.state;
    if (data.city !== undefined) requestData.city = data.city;
    if (data.status !== undefined) requestData.status = data.status;
    if (data.payment_status !== undefined) requestData.payment_status = data.payment_status;
    if (data.payment_mode !== undefined) requestData.payment_mode = data.payment_mode;
    if (data.payment_collection_type !== undefined) {
      requestData.payment_collection_type = data.payment_collection_type;
    }
    if (data.completion_paid_amount !== undefined) {
      requestData.completion_paid_amount = data.completion_paid_amount;
    }
    if (data.completion_pending_amount !== undefined) {
      requestData.completion_pending_amount = data.completion_pending_amount;
    }
    if (data.payment_remarks !== undefined) requestData.payment_remarks = data.payment_remarks;
    if (data.assigned_to !== undefined) requestData.assigned_to = data.assigned_to;
    if (data.technician !== undefined) requestData.technician = data.technician;
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
    if (data.notes !== undefined) requestData.notes = data.notes;
    if (data.extra_notes !== undefined) requestData.extra_notes = data.extra_notes;
    if (data.cancellation_reason !== undefined) requestData.cancellation_reason = data.cancellation_reason;
    if (data.removal_remarks !== undefined) requestData.removal_remarks = data.removal_remarks;
    if (data.reminder_date !== undefined) requestData.reminder_date = data.reminder_date || null;
    if (data.reminder_time !== undefined) requestData.reminder_time = data.reminder_time || null;
    if (data.reminder_note !== undefined) requestData.reminder_note = data.reminder_note || null;
    if (data.is_reminder_done !== undefined) requestData.is_reminder_done = data.is_reminder_done;

    // Master location FKs (required for Service State/City dropdowns)
    if (data.master_country !== undefined) requestData.master_country = data.master_country ?? null;
    if (data.master_state !== undefined) requestData.master_state = data.master_state ?? null;
    if (data.master_city !== undefined) requestData.master_city = data.master_city ?? null;
    if (data.master_location !== undefined) requestData.master_location = data.master_location ?? null;
    if (data.full_address !== undefined) requestData.full_address = data.full_address ?? null;

    if (data.commercial_type !== undefined) requestData.commercial_type = data.commercial_type;
    if (data.society_billing_type !== undefined) {
      requestData.society_billing_type = data.society_billing_type ?? null;
    }
    if (data.is_price_estimated !== undefined) requestData.is_price_estimated = data.is_price_estimated;
    if (data.is_amc_main_booking !== undefined) requestData.is_amc_main_booking = data.is_amc_main_booking;
    if (data.is_followup_visit !== undefined) requestData.is_followup_visit = data.is_followup_visit;
    if (data.included_in_amc !== undefined) requestData.included_in_amc = data.included_in_amc;
    if (data.is_complaint_call !== undefined) requestData.is_complaint_call = data.is_complaint_call;

    const result = await this.retryRequest(() =>
      this.api.patch<JobCard>(
        `${API_ENDPOINTS.JOBCARDS}${id}/`,
        sanitizeJobCardPayload(requestData),
      )
    );

    // Invalidate related caches
    apiCache.deletePattern(CACHE_KEYS.JOBCARDS);
    apiCache.deletePattern(`${API_ENDPOINTS.JOBCARDS}${id}`);
    
    return result.data;
  }

  async assignTechnician(id: number, technicianId: number): Promise<JobCard> {
    const result = await this.retryRequest(() =>
      this.api.post<JobCard>(`${API_ENDPOINTS.JOBCARDS}${id}/assign/`, { technician_id: technicianId })
    );

    // Invalidate related caches
    apiCache.deletePattern(CACHE_KEYS.JOBCARDS);
    apiCache.deletePattern(`${API_ENDPOINTS.JOBCARDS}${id}`);
    
    return result.data;
  }

  /** Broadcast booking to all approved partner-app technicians (no single-tech pick). */
  async sendJobToPartnerApp(id: number): Promise<{ job: JobCard; message: string; refloated: boolean }> {
    const result = await this.api.post<{
      success: boolean;
      message: string;
      refloated?: boolean;
      job: JobCard;
    }>(`${API_ENDPOINTS.JOBCARDS}${id}/send-to-app/`, {});
    apiCache.deletePattern(CACHE_KEYS.JOBCARDS);
    apiCache.deletePattern(`${API_ENDPOINTS.JOBCARDS}${id}`);
    const data = result.data;
    if (!data.success) {
      throw new ApiError(data.message || 'Failed to send to partner app', 400);
    }
    return {
      job: data.job,
      message: data.message,
      refloated: Boolean(data.refloated),
    };
  }

  async getPartnerSelfies(params?: {
    page?: number;
    page_size?: number;
    booking_id?: number;
  }): Promise<PaginatedResponse<PartnerJobSelfie>> {
    const result = await this.retryRequest(() =>
      this.api.get<PaginatedResponse<PartnerJobSelfie>>(
        `${API_ENDPOINTS.JOBCARDS}partner-selfies/`,
        { params },
      ),
    );
    return result.data;
  }

  async updateJobCardPaymentStatus(id: number, paymentStatus: string): Promise<JobCard> {
    const result = await this.retryRequest(() =>
      this.api.patch<JobCard>(`${API_ENDPOINTS.JOBCARDS}${id}/update_payment_status/`, { payment_status: paymentStatus })
    );

    // Invalidate related caches
    apiCache.deletePattern(CACHE_KEYS.JOBCARDS);
    apiCache.deletePattern(`${API_ENDPOINTS.JOBCARDS}${id}`);
    
    return result.data;
  }

  async getPendingPayments(
    params?: PendingPaymentFilters,
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<JobCard>> {
    const result = await this.retryRequest(() =>
      this.api.get<PaginatedResponse<JobCard>>(API_ENDPOINTS.PENDING_PAYMENTS, { params, signal }),
    );
    return result.data;
  }

  async getPendingPaymentStats(
    params?: PendingPaymentFilters,
    signal?: AbortSignal,
  ): Promise<PendingPaymentStats> {
    const result = await this.retryRequest(() =>
      this.api.get<PendingPaymentStats>(`${API_ENDPOINTS.PENDING_PAYMENTS}stats/`, {
        params,
        signal,
      }),
    );
    return result.data;
  }

  async getBookingPaymentHistory(jobCardId: number): Promise<BookingPaymentRecord[]> {
    const result = await this.retryRequest(() =>
      this.api.get<BookingPaymentRecord[]>(
        `${API_ENDPOINTS.PENDING_PAYMENTS}${jobCardId}/history/`,
      ),
    );
    return result.data;
  }

  async collectPendingPayment(
    jobCardId: number,
    data: CollectPaymentPayload,
  ): Promise<JobCard> {
    const result = await this.retryRequest(() =>
      this.api.post<JobCard>(
        `${API_ENDPOINTS.PENDING_PAYMENTS}${jobCardId}/collect/`,
        data,
      ),
    );
    apiCache.deletePattern(CACHE_KEYS.JOBCARDS);
    apiCache.deletePattern(API_ENDPOINTS.PENDING_PAYMENTS);
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
        this.makeRequest(
          cacheKey,
          () => this.api.get<any>(`${API_ENDPOINTS.JOBCARDS}statistics/`)
        )
      ),
      5 * 60 * 1000 // 5 minutes cache
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
    apiCache.deletePattern(CACHE_KEYS.RENEWALS);
    apiCache.deletePattern(`${API_ENDPOINTS.RENEWALS}${id}`);
    
    return result.data;
  }

  async markRenewalCompleted(id: number): Promise<Renewal> {
    const result = await this.retryRequest(() =>
      this.api.post<Renewal>(`${API_ENDPOINTS.RENEWALS}${id}/mark_completed/`)
    );

    // Invalidate related caches
    apiCache.deletePattern(CACHE_KEYS.RENEWALS);
    apiCache.deletePattern(`${API_ENDPOINTS.RENEWALS}${id}`);
    
    return result.data;
  }

  async getActiveRenewals(params?: RenewalFilters & { page?: number; page_size?: number }): Promise<PaginatedResponse<Renewal>> {
    const cacheKey = apiCache.generateKey(`${API_ENDPOINTS.RENEWALS}active/`, params);
    
    return this.cachedRequest(
      cacheKey,
      () => this.makeRequest(
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
    apiCache.deletePattern(CACHE_KEYS.RENEWALS);
    
    return result.data;
  }

  async toggleJobCardPause(jobcardId: number, isPaused: boolean): Promise<{ message: string; is_paused: boolean }> {
    const result = await this.retryRequest(() =>
      this.api.patch<{ message: string; is_paused: boolean }>(`${API_ENDPOINTS.JOBCARDS}${jobcardId}/toggle_pause/`, {
        is_paused: isPaused
      })
    );

    // Invalidate related caches
    apiCache.deletePattern(CACHE_KEYS.RENEWALS);
    apiCache.deletePattern(CACHE_KEYS.JOBCARDS);
    apiCache.deletePattern(`${API_ENDPOINTS.JOBCARDS}${jobcardId}`);
    
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
    apiCache.deletePattern(CACHE_KEYS.RENEWALS);
    
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
    apiCache.deletePattern(CACHE_KEYS.RENEWALS);
    apiCache.deletePattern(CACHE_KEYS.JOBCARDS);
    
    return result.data;
  }

  // Dashboard Statistics
  async getDashboardStatistics(params?: { from?: string; to?: string }): Promise<DashboardStatisticsResponse> {
    const cacheKey = apiCache.generateKey(CACHE_KEYS.DASHBOARD_STATS, params);
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<DashboardStatisticsResponse>(API_ENDPOINTS.DASHBOARD_STATS, { params })
        )
      ),
      2 * 60 * 1000 // 2 minutes cache for dashboard stats
    );
  }

  // Dashboard methods
  async getDashboardCounts(): Promise<DashboardCounts> {
    const cacheKey = CACHE_KEYS.DASHBOARD_COUNTS;
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<DashboardCounts>(`${API_ENDPOINTS.DASHBOARD}counts/`)
        )
      ),
      1 * 60 * 1000 // 1 minute cache for counts
    );
  }

  async getStaffPerformance(period: string = 'today'): Promise<StaffPerformance[]> {
    const response = await this.api.get<StaffPerformance[]>(`${API_ENDPOINTS.DASHBOARD}performance/`, {
      params: { period }
    });
    return response.data;
  }

  // Staff Tracking
  async getStaffTrackingLive(params?: { city?: string }): Promise<StaffTrackingLive[]> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.STAFF_TRACKING.LIVE, params);
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(cacheKey, () =>
          this.api.get<StaffTrackingLive[]>(API_ENDPOINTS.STAFF_TRACKING.LIVE, { params }),
        ),
      ),
      30 * 1000,
    );
  }

  async getStaffTrackingProfiles(params?: { city?: string }): Promise<StaffTrackingProfile[]> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.STAFF_TRACKING.STAFF, params);
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(cacheKey, () =>
          this.api.get<StaffTrackingProfile[]>(API_ENDPOINTS.STAFF_TRACKING.STAFF, { params }),
        ),
      ),
      2 * 60 * 1000,
    );
  }

  async getStaffTrackingAttendanceToday(): Promise<StaffTrackingAttendance[]> {
    const result = await this.retryRequest(() =>
      this.api.get<StaffTrackingAttendance[]>(API_ENDPOINTS.STAFF_TRACKING.ATTENDANCE_TODAY),
    );
    return result.data;
  }

  async getStaffTrackingAttendanceReport(params?: {
    from?: string;
    to?: string;
    page_size?: number;
  }): Promise<StaffTrackingAttendance[]> {
    const result = await this.retryRequest(() =>
      this.api.get<StaffTrackingAttendance[]>(API_ENDPOINTS.STAFF_TRACKING.ATTENDANCE_REPORT, { params }),
    );
    return result.data;
  }

  async getStaffTrackingHistory(
    technicianId: number,
    date?: string,
  ): Promise<StaffTrackingHistory> {
    const result = await this.retryRequest(() =>
      this.api.get<StaffTrackingHistory>(
        API_ENDPOINTS.STAFF_TRACKING.LOCATION_HISTORY(technicianId),
        { params: date ? { date } : undefined },
      ),
    );
    return result.data;
  }

  async getStaffTrackingDistance(date?: string): Promise<StaffTrackingDistanceRow[]> {
    const result = await this.retryRequest(() =>
      this.api.get<StaffTrackingDistanceRow[]>(API_ENDPOINTS.STAFF_TRACKING.DISTANCE, {
        params: date ? { date } : undefined,
      }),
    );
    return result.data;
  }


  async getStaffTrackingVisits(params?: { status?: string; date?: string; profile_id?: number }): Promise<FieldVisit[]> {
    const result = await this.retryRequest(() =>
      this.api.get<FieldVisit[]>(API_ENDPOINTS.STAFF_TRACKING.VISITS, { params }),
    );
    return result.data;
  }

  async getStaffTrackingTasks(params?: { status?: string; assigned_to?: number }): Promise<StaffTask[]> {
    const result = await this.retryRequest(() =>
      this.api.get<StaffTask[]>(API_ENDPOINTS.STAFF_TRACKING.TASKS, { params }),
    );
    return result.data;
  }

  async createStaffTrackingTask(body: Partial<StaffTask>): Promise<StaffTask> {
    const result = await this.retryRequest(() =>
      this.api.post<StaffTask>(API_ENDPOINTS.STAFF_TRACKING.TASKS, body),
    );
    return result.data;
  }

  async getStaffTrackingLeaveApplications(params?: { status?: string }): Promise<LeaveApplication[]> {
    const result = await this.retryRequest(() =>
      this.api.get<LeaveApplication[]>(API_ENDPOINTS.STAFF_TRACKING.LEAVE_APPLICATIONS, { params }),
    );
    return result.data;
  }

  async reviewStaffTrackingLeave(id: number, body: { approved: boolean; comment?: string }): Promise<LeaveApplication> {
    const result = await this.retryRequest(() =>
      this.api.patch<LeaveApplication>(API_ENDPOINTS.STAFF_TRACKING.LEAVE_REVIEW(id), body),
    );
    return result.data;
  }

  async getStaffTrackingExpenses(params?: { status?: string }): Promise<ExpenseClaim[]> {
    const result = await this.retryRequest(() =>
      this.api.get<ExpenseClaim[]>(API_ENDPOINTS.STAFF_TRACKING.EXPENSES, { params }),
    );
    return result.data;
  }

  async reviewStaffTrackingExpense(id: number, body: { approved: boolean; comment?: string }): Promise<ExpenseClaim> {
    const result = await this.retryRequest(() =>
      this.api.patch<ExpenseClaim>(API_ENDPOINTS.STAFF_TRACKING.EXPENSE_REVIEW(id), body),
    );
    return result.data;
  }

  // Feedback methods
  async getFeedbacks(params?: any): Promise<PaginatedResponse<Feedback>> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.FEEDBACKS, params);
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<PaginatedResponse<Feedback>>(API_ENDPOINTS.FEEDBACKS, { params })
        )
      ),
      2 * 60 * 1000
    );
  }

  async markFeedbacksAsRead(): Promise<void> {
    await this.api.post(`${API_ENDPOINTS.FEEDBACKS}mark-all-read/`);
    apiCache.deletePattern(CACHE_KEYS.FEEDBACKS);
  }

  async generateFeedbackLink(bookingId: number): Promise<{ booking_id: number; token: string; link: string; customer_name: string }> {
    const response = await this.api.post(`${API_ENDPOINTS.FEEDBACKS}generate/`, { booking_id: bookingId });
    return response.data;
  }

  async submitFeedback(data: { booking_id: number | string; token: string; rating: number; remark: string; technician_behavior: string }): Promise<{ message: string }> {
    const response = await this.api.post(`${API_ENDPOINTS.FEEDBACKS}submit/`, data);
    return response.data;
  }

  async getFeedbackBookingInfo(bookingId: string, token?: string): Promise<{ booking_id: string; service_name: string; service_date: string; technician_name: string; is_submitted: boolean }> {
    const url = token ? `${API_ENDPOINTS.FEEDBACKS}booking-info/${bookingId}/?token=${token}` : `${API_ENDPOINTS.FEEDBACKS}booking-info/${bookingId}/`;
    const response = await this.api.get(url);
    return response.data;
  }

  async createManualFeedback(data: { booking: number; rating: number; remark: string; technician_behavior: string }): Promise<Feedback> {
    const response = await this.api.post<Feedback>(API_ENDPOINTS.FEEDBACKS, data);
    apiCache.deletePattern(CACHE_KEYS.FEEDBACKS);
    return response.data;
  }

  // Global Search methods
  async getGlobalSearch(query: string): Promise<GlobalSearchResult[]> {
    if (!query || query.length < 2) return [];
    
    // We don't cache global search results heavily as they change frequently
    const response = await this.api.get<GlobalSearchResult[]>('/global-search/', {
      params: { q: query }
    });
    return response.data;
  }

  async getCustomerHistory(clientId: number): Promise<CustomerHistory> {
    const cacheKey = `/customer-history/${clientId}/`;
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<CustomerHistory>(`/customer-history/${clientId}/`)
        )
      ),
      2 * 60 * 1000 // 2 minutes cache
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

  // Complaint methods
  async getComplaints(params?: any): Promise<PaginatedResponse<JobCard>> {
    const cacheKey = apiCache.generateKey('/complaints/', params);
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<PaginatedResponse<JobCard>>('/complaints/', { params })
        )
      ),
      2 * 60 * 1000 // 2 minutes cache
    );
  }

  async createComplaint(data: {
    parent_booking_id: number;
    complaint_type: string;
    complaint_note?: string;
    priority?: string;
    revisit_date?: string;
    technician_id?: number | null;
  }): Promise<JobCard> {
    const response = await this.api.post<JobCard>('/complaints/create_complaint/', data);
    apiCache.deletePattern('/complaints/');
    apiCache.deletePattern(CACHE_KEYS.JOBCARDS);
    return response.data;
  }

  async getCustomerComplaints(clientId: number): Promise<JobCard[]> {
    const response = await this.api.get<JobCard[]>(`/complaints/?client=${clientId}`);
    return response.data;
  }

  // Location methods
  async getLocations(): Promise<Record<string, string[]>> {
    const cacheKey = 'location_data';
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<Record<string, string[]>>(`${API_ENDPOINTS.JOBCARDS}locations/`)
        )
      ),
      24 * 60 * 60 * 1000 // 24 hours cache (static data)
    );
  }

  // Staff Management methods
  async getStaff(params?: any): Promise<PaginatedResponse<StaffUser>> {
    const cacheKey = apiCache.generateKey('/staff/', params);
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(cacheKey, () => this.api.get<PaginatedResponse<StaffUser>>('/staff/', { params }))
      ),
      5 * 60 * 1000 // 5 minutes cache
    );
  }

  async createStaff(data: Partial<StaffUser>): Promise<StaffUser> {
    const response = await this.api.post<StaffUser>('/staff/', data);
    apiCache.deletePattern('/staff/');
    return response.data;
  }

  async updateStaff(id: number, data: Partial<StaffUser>): Promise<StaffUser> {
    const response = await this.api.patch<StaffUser>(`/staff/${id}/`, data);
    apiCache.deletePattern('/staff/');
    return response.data;
  }

  async resetStaffPassword(id: number, password: string): Promise<any> {
    const response = await this.api.post(`/staff/${id}/reset_password/`, { password });
    return response.data;
  }

  // Activity Log methods
  async getActivityLogs(params?: any): Promise<PaginatedResponse<ActivityLog>> {
    const cacheKey = apiCache.generateKey('/activity-logs/', params);
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(cacheKey, () => this.api.get<PaginatedResponse<ActivityLog>>('/activity-logs/', { params }))
      ),
      1 * 60 * 1000 // 1 minute cache
    );
  }

  // Master Location methods
  async getCountries(params?: any): Promise<PaginatedResponse<Country>> {
    return this.api.get<PaginatedResponse<Country>>('/countries/', { params }).then(r => r.data);
  }

  async createCountry(data: any): Promise<Country> {
    return this.api.post<Country>('/countries/', data).then(r => r.data);
  }

  async updateCountry(id: number, data: any): Promise<Country> {
    return this.api.patch<Country>(`/countries/${id}/`, data).then(r => r.data);
  }

  async bulkCreateCountries(data: any[]): Promise<Country[]> {
    return this.api.post<Country[]>('/countries/bulk-create/', data).then(r => r.data);
  }

  async getStates(params?: any): Promise<PaginatedResponse<State>> {
    return this.api.get<PaginatedResponse<State>>('/states/', { params }).then(r => r.data);
  }

  async createState(data: any): Promise<State> {
    return this.api.post<State>('/states/', data).then(r => r.data);
  }

  async updateState(id: number, data: any): Promise<State> {
    return this.api.patch<State>(`/states/${id}/`, data).then(r => r.data);
  }

  async bulkCreateStates(data: any[]): Promise<State[]> {
    return this.api.post<State[]>('/states/bulk-create/', data).then(r => r.data);
  }

  async getCities(params?: any): Promise<PaginatedResponse<City>> {
    return this.api.get<PaginatedResponse<City>>('/cities/', { params }).then(r => r.data);
  }

  async createCity(data: any): Promise<City> {
    return this.api.post<City>('/cities/', data).then(r => r.data);
  }

  async updateCity(id: number, data: any): Promise<City> {
    return this.api.patch<City>(`/cities/${id}/`, data).then(r => r.data);
  }

  async bulkCreateCities(data: any[]): Promise<City[]> {
    return this.api.post<City[]>('/cities/bulk-create/', data).then(r => r.data);
  }

  async getMasterLocations(params?: any): Promise<PaginatedResponse<MasterLocation>> {
    return this.api.get<PaginatedResponse<MasterLocation>>('/locations/', { params }).then(r => r.data);
  }

  async getMasterLocation(id: number): Promise<MasterLocation & { display_name?: string; state_id?: number }> {
    return this.api.get<MasterLocation & { display_name?: string; state_id?: number }>(`/locations/${id}/`).then(r => r.data);
  }

  async createMasterLocation(data: any): Promise<MasterLocation> {
    return this.api.post<MasterLocation>('/locations/', data).then(r => r.data);
  }

  async updateMasterLocation(id: number, data: any): Promise<MasterLocation> {
    return this.api.patch<MasterLocation>(`/locations/${id}/`, data).then(r => r.data);
  }

  async bulkCreateMasterLocations(data: any[]): Promise<MasterLocation[]> {
    return this.api.post<MasterLocation[]>('/locations/bulk-create/', data).then(r => r.data);
  }

  async searchLocations(q: string): Promise<any[]> {
    return this.api.get<any[]>('/locations/search/', { params: { q } }).then(r => r.data);
  }

  async getPricingConfig(
    params?: { city?: string; master_city?: number },
    signal?: AbortSignal,
  ): Promise<import('../utils/jobCardPricing').PricingConfig> {
    return this.api
      .get<import('../utils/jobCardPricing').PricingConfig>(API_ENDPOINTS.PRICING_CONFIG, { params, signal })
      .then((r) => r.data);
  }

  async getPricingRegions(params?: { search?: string; page_size?: number }): Promise<PaginatedResponse<PricingRegion>> {
    return this.api.get<PaginatedResponse<PricingRegion>>(API_ENDPOINTS.PRICING_REGIONS, { params }).then((r) => r.data);
  }

  async getPricingRates(params?: PricingRateFilters): Promise<PaginatedResponse<PricingRate>> {
    return this.api.get<PaginatedResponse<PricingRate>>(API_ENDPOINTS.PRICING_RATES, { params }).then((r) => r.data);
  }

  async createPricingRate(data: PricingRateFormData): Promise<PricingRate> {
    const result = await this.api.post<PricingRate>(API_ENDPOINTS.PRICING_RATES, data);
    apiCache.deletePattern(CACHE_KEYS.PRICING_RATES);
    return result.data;
  }

  async updatePricingRate(id: number, data: Partial<PricingRateFormData>): Promise<PricingRate> {
    const result = await this.api.patch<PricingRate>(`${API_ENDPOINTS.PRICING_RATES}${id}/`, data);
    apiCache.deletePattern(CACHE_KEYS.PRICING_RATES);
    return result.data;
  }

  async getPricingAuditLogs(params?: {
    search?: string;
    region_slug?: string;
    service_package?: string;
    action?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<PricingRateAuditLog>> {
    return this.api
      .get<PaginatedResponse<PricingRateAuditLog>>(API_ENDPOINTS.PRICING_AUDIT_LOGS, { params })
      .then((r) => r.data);
  }

  // Quotation methods
  async getQuotations(params?: QuotationFilters & { page?: number; page_size?: number }): Promise<PaginatedResponse<Quotation>> {
    const cacheKey = apiCache.generateKey(API_ENDPOINTS.QUOTATIONS, params);
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<PaginatedResponse<Quotation>>(API_ENDPOINTS.QUOTATIONS, { params })
        )
      ),
      2 * 60 * 1000 // 2 minutes cache
    );
  }

  async getQuotation(id: number): Promise<Quotation> {
    const cacheKey = `${API_ENDPOINTS.QUOTATIONS}${id}`;
    
    return this.cachedRequest(
      cacheKey,
      () => this.retryRequest(() =>
        this.makeRequest(
          cacheKey,
          () => this.api.get<Quotation>(`${API_ENDPOINTS.QUOTATIONS}${id}/`)
        )
      )
    );
  }

  async createQuotation(data: QuotationFormData): Promise<Quotation> {
    const result = await this.retryRequest(() =>
      this.api.post<Quotation>(API_ENDPOINTS.QUOTATIONS, data)
    );
    apiCache.deletePattern(CACHE_KEYS.QUOTATIONS);
    return result.data;
  }

  async updateQuotation(id: number, data: Partial<QuotationFormData>): Promise<Quotation> {
    const result = await this.retryRequest(() =>
      this.api.patch<Quotation>(`${API_ENDPOINTS.QUOTATIONS}${id}/`, data)
    );
    apiCache.deletePattern(CACHE_KEYS.QUOTATIONS);
    apiCache.deletePattern(`${API_ENDPOINTS.QUOTATIONS}${id}`);
    return result.data;
  }

  async convertQuotationToBooking(id: number): Promise<{ booking_id: number; booking_code: string }> {
    const result = await this.retryRequest(() =>
      this.api.post<{ booking_id: number; booking_code: string }>(`${API_ENDPOINTS.QUOTATIONS}${id}/convert_to_booking/`)
    );
    apiCache.deletePattern(CACHE_KEYS.QUOTATIONS);
    apiCache.deletePattern(CACHE_KEYS.JOBCARDS);
    return result.data;
  }

  async getQuotationStats(): Promise<{ total: number; pending: number; approved: number; converted: number; revenue: number }> {
    const result = await this.retryRequest(() =>
      this.api.get<{ total: number; pending: number; approved: number; converted: number; revenue: number }>(`${API_ENDPOINTS.QUOTATIONS}stats/`)
    );
    return result.data;
  }

  async getUserTheme(): Promise<{ theme: string }> {
    const result = await this.retryRequest(() =>
      this.api.get<{ theme: string }>(API_ENDPOINTS.USERS_THEME),
    );
    return result.data;
  }

  async updateUserTheme(theme: string): Promise<{ theme: string }> {
    const result = await this.retryRequest(() =>
      this.api.patch<{ theme: string }>(API_ENDPOINTS.USERS_THEME, { theme }),
    );
    return result.data;
  }

  async getPartnerAppVersion(): Promise<PartnerAppVersionConfig> {
    const result = await this.retryRequest(() =>
      this.api.get<PartnerAppVersionConfig>(API_ENDPOINTS.PARTNER_APP_VERSION),
    );
    return result.data;
  }

  async updatePartnerAppVersion(
    data: Partial<PartnerAppVersionConfig>,
  ): Promise<PartnerAppVersionConfig> {
    const result = await this.retryRequest(() =>
      this.api.patch<PartnerAppVersionConfig>(API_ENDPOINTS.PARTNER_APP_VERSION, data),
    );
    return result.data;
  }
}

// Export singleton instance
export const enhancedApiService = new EnhancedApiService();

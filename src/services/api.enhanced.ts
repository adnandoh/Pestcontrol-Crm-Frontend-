/**
 * Enhanced API Service with Best Practices
 * - Environment-aware configuration
 * - Retry logic and error handling
 * - Request/response logging
 * - Token management and refresh
 * - Health monitoring
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { apiConfig, environment, API_ENDPOINTS, ApiError, ApiResponse } from '../config/api.config';
import { AuthTokens, PaginatedResponse, Client, Inquiry, JobCard, Renewal } from '../types';

// Logger utility
class Logger {
  private static shouldLog = apiConfig.enableLogging;
  private static logLevel = apiConfig.logLevel;

  static debug(message: string, ...args: any[]) {
    if (this.shouldLog && ['debug'].includes(this.logLevel)) {
      console.log(`🔍 [API Debug] ${message}`, ...args);
    }
  }

  static info(message: string, ...args: any[]) {
    if (this.shouldLog && ['debug', 'info'].includes(this.logLevel)) {
      console.info(`ℹ️ [API Info] ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: any[]) {
    if (this.shouldLog && ['debug', 'info', 'warn'].includes(this.logLevel)) {
      console.warn(`⚠️ [API Warning] ${message}`, ...args);
    }
  }

  static error(message: string, ...args: any[]) {
    if (this.shouldLog) {
      console.error(`❌ [API Error] ${message}`, ...args);
    }
  }
}

// Token Management
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly USER_DATA_KEY = 'user_data';

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setTokens(tokens: AuthTokens): void {
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.access);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh);
      localStorage.setItem(this.USER_DATA_KEY, JSON.stringify({
        user_id: tokens.user_id,
        username: tokens.username,
        is_staff: tokens.is_staff,
      }));
      Logger.debug('Tokens stored successfully');
    } catch (error) {
      Logger.error('Failed to store tokens:', error);
      throw new Error('Failed to store authentication data');
    }
  }

  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_DATA_KEY);
    Logger.debug('Tokens cleared');
  }

  static getUserData() {
    try {
      const userData = localStorage.getItem(this.USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

// API Client with enhanced features
class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.startHealthMonitoring();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token
        const token = TokenManager.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        const requestId = Math.random().toString(36).substring(7);
        config.metadata = { requestId, startTime: Date.now() };

        Logger.debug(`Request [${requestId}]: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
        });

        return config;
      },
      (error) => {
        Logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const { requestId, startTime } = response.config.metadata || {};
        const duration = Date.now() - (startTime || 0);

        Logger.debug(`Response [${requestId}]: ${response.status} (${duration}ms)`, {
          data: response.data,
        });

        return response;
      },
      async (error: AxiosError) => {
        const { requestId, startTime } = error.config?.metadata || {};
        const duration = Date.now() - (startTime || 0);

        Logger.error(`Response Error [${requestId}]: ${error.response?.status} (${duration}ms)`, error);

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !error.config?.url?.includes('/token/')) {
          return this.handleUnauthorized(error);
        }

        // Handle network errors
        if (!error.response) {
          Logger.error('Network error detected');
          throw this.createApiError('Network error. Please check your connection.', 0);
        }

        // Transform error
        throw this.transformError(error);
      }
    );
  }

  private async handleUnauthorized(error: AxiosError): Promise<AxiosResponse> {
    const originalRequest = error.config!;

    // Prevent infinite refresh loops
    if (originalRequest.url?.includes('/token/refresh/')) {
      Logger.warn('Refresh token expired, redirecting to login');
      this.redirectToLogin();
      throw error;
    }

    // Handle token refresh
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshPromise = this.refreshAccessToken();
    }

    try {
      const newToken = await this.refreshPromise!;
      originalRequest.headers!.Authorization = `Bearer ${newToken}`;
      return this.client.request(originalRequest);
    } catch (refreshError) {
      Logger.error('Token refresh failed:', refreshError);
      this.redirectToLogin();
      throw refreshError;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async refreshAccessToken(): Promise<string> {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      Logger.debug('Refreshing access token...');
      const response = await this.client.post<{ access: string }>(
        API_ENDPOINTS.AUTH.REFRESH,
        { refresh: refreshToken }
      );

      const newToken = response.data.access;
      localStorage.setItem('access_token', newToken);
      Logger.debug('Access token refreshed successfully');

      return newToken;
    } catch (error) {
      Logger.error('Failed to refresh token:', error);
      TokenManager.clearTokens();
      throw error;
    }
  }

  private redirectToLogin(): void {
    TokenManager.clearTokens();
    
    // Use React Router navigation if available, otherwise fallback to window.location
    if (window.location.pathname !== '/login') {
      Logger.info('Redirecting to login page');
      window.location.href = '/login';
    }
  }

  private transformError(error: AxiosError): ApiError {
    const response = error.response;
    const data = response?.data as any;

    let message = 'An unexpected error occurred';
    
    if (data?.error) {
      message = data.error;
    } else if (data?.detail) {
      message = data.detail;
    } else if (data?.message) {
      message = data.message;
    } else if (error.message) {
      message = error.message;
    }

    return this.createApiError(message, response?.status || 0, data);
  }

  private createApiError(message: string, status: number, details?: any): ApiError {
    return {
      message,
      status,
      details,
      code: details?.code,
    };
  }

  private startHealthMonitoring(): void {
    if (!environment.isDevelopment) return;

    setInterval(async () => {
      try {
        await this.client.get(API_ENDPOINTS.HEALTH, { timeout: 5000 });
        Logger.debug('Health check: API is healthy');
      } catch (error) {
        Logger.warn('Health check: API is unhealthy', error);
      }
    }, apiConfig.healthCheckInterval);
  }

  // Generic request method with retry logic
  private async request<T>(
    config: AxiosRequestConfig,
    retryCount = 0
  ): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error) {
      // Retry logic for network errors
      if (
        retryCount < apiConfig.retryAttempts &&
        (error as AxiosError).code === 'NETWORK_ERROR'
      ) {
        Logger.warn(`Retrying request (${retryCount + 1}/${apiConfig.retryAttempts})`);
        await new Promise(resolve => setTimeout(resolve, apiConfig.retryDelay));
        return this.request<T>(config, retryCount + 1);
      }

      throw error;
    }
  }

  // Public API methods
  async get<T>(url: string, params?: any): Promise<T> {
    return this.request<T>({ method: 'GET', url, params });
  }

  async post<T>(url: string, data?: any): Promise<T> {
    return this.request<T>({ method: 'POST', url, data });
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    return this.request<T>({ method: 'PATCH', url, data });
  }

  async put<T>(url: string, data?: any): Promise<T> {
    return this.request<T>({ method: 'PUT', url, data });
  }

  async delete<T>(url: string): Promise<T> {
    return this.request<T>({ method: 'DELETE', url });
  }
}

// Create API client instance
const apiClient = new ApiClient();

// Authentication services
export const authService = {
  login: async (username: string, password: string): Promise<AuthTokens> => {
    Logger.info('Attempting login...');
    const response = await apiClient.post<AuthTokens>(API_ENDPOINTS.AUTH.LOGIN, {
      username,
      password,
    });
    
    TokenManager.setTokens(response);
    Logger.info('Login successful');
    return response;
  },

  logout: (): void => {
    Logger.info('Logging out...');
    TokenManager.clearTokens();
  },

  refreshToken: async (): Promise<string> => {
    const refresh = TokenManager.getRefreshToken();
    if (!refresh) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<{ access: string }>(
      API_ENDPOINTS.AUTH.REFRESH,
      { refresh }
    );

    localStorage.setItem('access_token', response.access);
    return response.access;
  },

  verifyToken: async (): Promise<boolean> => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return false;

      await apiClient.post(API_ENDPOINTS.AUTH.VERIFY, { token });
      return true;
    } catch {
      return false;
    }
  },

  isAuthenticated: (): boolean => TokenManager.isAuthenticated(),
  getUserData: () => TokenManager.getUserData(),
};

// Client services
export const clientService = {
  getClients: async (params?: { q?: string; city?: string; page?: number }): Promise<PaginatedResponse<Client>> => {
    return apiClient.get<PaginatedResponse<Client>>(API_ENDPOINTS.CLIENTS, params);
  },

  getClient: async (id: number): Promise<Client> => {
    return apiClient.get<Client>(`${API_ENDPOINTS.CLIENTS}${id}/`);
  },

  createClient: async (client: Partial<Client>): Promise<Client> => {
    return apiClient.post<Client>(API_ENDPOINTS.CLIENTS, client);
  },

  updateClient: async (id: number, client: Partial<Client>): Promise<Client> => {
    return apiClient.patch<Client>(`${API_ENDPOINTS.CLIENTS}${id}/`, client);
  },

  deleteClient: async (id: number): Promise<void> => {
    return apiClient.delete<void>(`${API_ENDPOINTS.CLIENTS}${id}/`);
  },
};

// Inquiry services
export const inquiryService = {
  getInquiries: async (params?: { status?: string; page?: number }): Promise<PaginatedResponse<Inquiry>> => {
    return apiClient.get<PaginatedResponse<Inquiry>>(API_ENDPOINTS.INQUIRIES, params);
  },

  getInquiry: async (id: number): Promise<Inquiry> => {
    return apiClient.get<Inquiry>(`${API_ENDPOINTS.INQUIRIES}${id}/`);
  },

  createInquiry: async (inquiry: Partial<Inquiry>): Promise<Inquiry> => {
    return apiClient.post<Inquiry>(API_ENDPOINTS.INQUIRIES, inquiry);
  },

  updateInquiry: async (id: number, inquiry: Partial<Inquiry>): Promise<Inquiry> => {
    return apiClient.patch<Inquiry>(`${API_ENDPOINTS.INQUIRIES}${id}/`, inquiry);
  },

  convertToJobCard: async (id: number, data?: any): Promise<JobCard> => {
    return apiClient.post<JobCard>(API_ENDPOINTS.ACTIONS.CONVERT_INQUIRY(id), data);
  },
};

// JobCard services
export const jobCardService = {
  getJobCards: async (params?: {
    status?: string;
    from?: string;
    to?: string;
    q?: string;
    city?: string;
    page?: number;
  }): Promise<PaginatedResponse<JobCard>> => {
    return apiClient.get<PaginatedResponse<JobCard>>(API_ENDPOINTS.JOBCARDS, params);
  },

  getJobCard: async (id: number): Promise<JobCard> => {
    return apiClient.get<JobCard>(`${API_ENDPOINTS.JOBCARDS}${id}/`);
  },

  createJobCard: async (jobCard: Partial<JobCard>): Promise<JobCard> => {
    return apiClient.post<JobCard>(API_ENDPOINTS.JOBCARDS, jobCard);
  },

  updateJobCard: async (id: number, jobCard: Partial<JobCard>): Promise<JobCard> => {
    return apiClient.patch<JobCard>(`${API_ENDPOINTS.JOBCARDS}${id}/`, jobCard);
  },

  updatePaymentStatus: async (id: number, status: string): Promise<JobCard> => {
    return apiClient.patch<JobCard>(API_ENDPOINTS.ACTIONS.UPDATE_PAYMENT(id), {
      payment_status: status,
    });
  },

  getStatistics: async (): Promise<any> => {
    return apiClient.get<any>(API_ENDPOINTS.STATS.JOBCARDS);
  },
};

// Renewal services
export const renewalService = {
  getRenewals: async (params?: { upcoming?: boolean; page?: number }): Promise<PaginatedResponse<Renewal>> => {
    return apiClient.get<PaginatedResponse<Renewal>>(API_ENDPOINTS.RENEWALS, params);
  },

  getRenewal: async (id: number): Promise<Renewal> => {
    return apiClient.get<Renewal>(`${API_ENDPOINTS.RENEWALS}${id}/`);
  },

  updateRenewal: async (id: number, renewal: Partial<Renewal>): Promise<Renewal> => {
    return apiClient.patch<Renewal>(`${API_ENDPOINTS.RENEWALS}${id}/`, renewal);
  },

  markCompleted: async (id: number): Promise<Renewal> => {
    return apiClient.patch<Renewal>(API_ENDPOINTS.ACTIONS.MARK_RENEWAL_COMPLETED(id), {});
  },

  getUpcomingSummary: async (): Promise<any> => {
    return apiClient.get<any>(API_ENDPOINTS.STATS.RENEWALS);
  },
};

// Health check service
export const healthService = {
  check: async (): Promise<{ status: string; service: string; version: string }> => {
    return apiClient.get<any>(API_ENDPOINTS.HEALTH);
  },
};

// Export API client for advanced usage
export { apiClient, Logger, TokenManager };

// Development helpers
if (environment.isDevelopment) {
  // Expose services to window for debugging
  (window as any).apiServices = {
    auth: authService,
    client: clientService,
    inquiry: inquiryService,
    jobCard: jobCardService,
    renewal: renewalService,
    health: healthService,
  };
}

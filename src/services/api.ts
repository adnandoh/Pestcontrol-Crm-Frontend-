import axios from 'axios';
import { AuthTokens, PaginatedResponse, Client, Inquiry, JobCard, Renewal, InquiryConversionData } from '../types';
import { getPaginationParams } from '../utils/pagination';

const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';

// Debug: Log the API URL being used
console.log('🔍 API Service: Using API URL:', API_URL);
console.log('🔍 API Service: Environment:', process.env.REACT_APP_ENVIRONMENT || 'development');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle 401 errors with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Skip refresh for auth endpoints to prevent infinite loops
      if (originalRequest.url?.includes('/token/')) {
        console.log('API: Auth endpoint failed, redirecting to login');
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      try {
        console.log('API: Access token expired, attempting refresh...');
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          console.log('API: No refresh token available, redirecting to login');
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        // Attempt to refresh the token
        const refreshResponse = await api.post('/token/refresh/', { 
          refresh: refreshToken 
        });
        
        const { access, refresh: newRefresh } = refreshResponse.data;
        
        // Update access token
        localStorage.setItem('access_token', access);
        
        // Update refresh token if a new one is provided (token rotation)
        if (newRefresh) {
          localStorage.setItem('refresh_token', newRefresh);
          console.log('API: Refresh token rotated successfully');
        }
        
        console.log('API: Token refreshed successfully, retrying original request');
        
        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        
        // Retry the original request
        return api(originalRequest);
        
      } catch (refreshError) {
        console.error('API: Token refresh failed:', refreshError);
        
        // Refresh failed, clear tokens and redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Token validation utility
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch {
    return true; // If we can't parse the token, consider it expired
  }
};

// Authentication services
export const authService = {
  login: async (username: string, password: string): Promise<AuthTokens> => {
    try {
      console.log('API: Making login request...');
      const response = await api.post<AuthTokens>('/token/', { username, password });
      console.log('API: Login response received:', response.data);
      
      // Store tokens and user data in localStorage
      try {
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        localStorage.setItem('user_id', response.data.user_id.toString());
        localStorage.setItem('username', response.data.username);
        localStorage.setItem('is_staff', response.data.is_staff.toString());
        console.log('API: Data stored in localStorage successfully');
      } catch (storageError) {
        console.error('API: Error storing data in localStorage:', storageError);
        throw new Error('Failed to store authentication data');
      }
      
      return response.data;
    } catch (error) {
      console.error('API: Login request failed:', error);
      throw error;
    }
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('is_staff');
  },
  refreshToken: async (): Promise<string> => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await api.post<{ access: string; refresh?: string }>('/token/refresh/', { refresh });
      const { access, refresh: newRefresh } = response.data;
      
      // Update access token
      localStorage.setItem('access_token', access);
      
      // Update refresh token if a new one is provided (token rotation)
      if (newRefresh) {
        localStorage.setItem('refresh_token', newRefresh);
        console.log('API: Refresh token rotated successfully');
      }
      
      return access;
    } catch (error) {
      console.error('API: Manual token refresh failed:', error);
      // Clear tokens on refresh failure
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      throw error;
    }
  },

  // Proactive token refresh - checks if token is close to expiry and refreshes it
  ensureValidToken: async (): Promise<string | null> => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!accessToken || !refreshToken) {
      return null;
    }
    
    // Check if token is expired or will expire in the next 5 minutes
    if (isTokenExpired(accessToken)) {
      try {
        console.log('API: Token expired, refreshing proactively...');
        return await authService.refreshToken();
      } catch (error) {
        console.error('API: Proactive token refresh failed:', error);
        return null;
      }
    }
    
    return accessToken;
  },

  // Check if user is authenticated with valid tokens
  isAuthenticated: (): boolean => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!accessToken || !refreshToken) {
      return false;
    }
    
    // If access token is expired but refresh token exists, user is still authenticated
    // (the interceptor will handle the refresh)
    return !isTokenExpired(refreshToken);
  },
};

// Client services
export const clientService = {
  getClients: async (params?: { q?: string; city?: string; page?: number }): Promise<PaginatedResponse<Client>> => {
    const paginationParams = getPaginationParams(params?.page || 1);
    const queryParams = { ...params, ...paginationParams };
    const response = await api.get<PaginatedResponse<Client>>('/clients/', { params: queryParams });
    return response.data;
  },
  getClient: async (id: number): Promise<Client> => {
    const response = await api.get<Client>(`/clients/${id}/`);
    return response.data;
  },
  createClient: async (client: Partial<Client>): Promise<Client> => {
    const response = await api.post<Client>('/clients/', client);
    return response.data;
  },
  updateClient: async (id: number, client: Partial<Client>): Promise<Client> => {
    const response = await api.patch<Client>(`/clients/${id}/`, client);
    return response.data;
  },
};

// Inquiry services
export const inquiryService = {
  getInquiries: async (params?: { status?: string; page?: number }): Promise<PaginatedResponse<Inquiry>> => {
    const paginationParams = getPaginationParams(params?.page || 1);
    const queryParams = { ...params, ...paginationParams };
    const response = await api.get<PaginatedResponse<Inquiry>>('/inquiries/', { params: queryParams });
    return response.data;
  },
  getInquiry: async (id: number): Promise<Inquiry> => {
    const response = await api.get<Inquiry>(`/inquiries/${id}/`);
    return response.data;
  },
  createInquiry: async (inquiry: Partial<Inquiry>): Promise<Inquiry> => {
    const response = await api.post<Inquiry>('/inquiries/', inquiry);
    return response.data;
  },
  updateInquiry: async (id: number, inquiry: Partial<Inquiry>): Promise<Inquiry> => {
    const response = await api.patch<Inquiry>(`/inquiries/${id}/`, inquiry);
    return response.data;
  },
  convertToJobCard: async (id: number, conversionData?: InquiryConversionData): Promise<JobCard> => {
    const response = await api.post<JobCard>(`/inquiries/${id}/convert/`, conversionData || {});
    return response.data;
  },
  markAsRead: async (id: number): Promise<void> => {
    await api.post(`/inquiries/${id}/mark_as_read/`);
  },
  deleteInquiry: async (id: number): Promise<void> => {
    await api.delete(`/inquiries/${id}/`);
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
    const paginationParams = getPaginationParams(params?.page || 1);
    const queryParams = { ...params, ...paginationParams };
    const response = await api.get<PaginatedResponse<JobCard>>('/jobcards/', { params: queryParams });
    return response.data;
  },
  getJobCard: async (id: number): Promise<JobCard> => {
    const response = await api.get<JobCard>(`/jobcards/${id}/`);
    return response.data;
  },
  createJobCard: async (jobCard: Partial<JobCard>): Promise<JobCard> => {
    const response = await api.post<JobCard>('/jobcards/', jobCard);
    return response.data;
  },
  updateJobCard: async (id: number, jobCard: Partial<JobCard>): Promise<JobCard> => {
    const response = await api.patch<JobCard>(`/jobcards/${id}/`, jobCard);
    return response.data;
  },
  getReferenceReport: async (): Promise<{
    results: Array<{ reference_name: string; reference_count: number }>;
    total_job_cards: number;
    total_with_reference: number;
  }> => {
    const response = await api.get('/jobcards/reference-report/');
    return response.data;
  },
};

// Renewal services
export const renewalService = {
  getRenewals: async (params?: { upcoming?: boolean; page?: number }): Promise<PaginatedResponse<Renewal>> => {
    const paginationParams = getPaginationParams(params?.page || 1);
    const queryParams = { ...params, ...paginationParams };
    const response = await api.get<PaginatedResponse<Renewal>>('/renewals/', { params: queryParams });
    return response.data;
  },
  getRenewal: async (id: number): Promise<Renewal> => {
    const response = await api.get<Renewal>(`/renewals/${id}/`);
    return response.data;
  },
  updateRenewal: async (id: number, renewal: Partial<Renewal>): Promise<Renewal> => {
    const response = await api.patch<Renewal>(`/renewals/${id}/`, renewal);
    return response.data;
  },
};
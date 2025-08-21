/**
 * API Configuration with Environment Detection
 * Supports both local development and Railway production environments
 */

export interface ApiConfig {
  baseURL: string;
  version: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  healthCheckInterval: number;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
}

export interface Environment {
  name: 'development' | 'production' | 'staging';
  isProduction: boolean;
  isDevelopment: boolean;
  apiBaseURL: string;
}

// Environment detection
const getEnvironment = (): Environment => {
  const env = process.env.REACT_APP_ENVIRONMENT || 'development';
  const isProduction = env === 'production' || process.env.NODE_ENV === 'production';
  const isDevelopment = env === 'development' || process.env.NODE_ENV === 'development';

  // Auto-detect Railway production environment
  const isRailway = window.location.hostname.includes('railway.app') || 
                   window.location.hostname.includes('up.railway.app');

  let apiBaseURL: string;
  
  if (isRailway || isProduction) {
    apiBaseURL = 'https://pestcontrol-backend-production.up.railway.app/api';
  } else {
    apiBaseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
  }

  return {
    name: isProduction ? 'production' : 'development',
    isProduction,
    isDevelopment,
    apiBaseURL
  };
};

// Get current environment
export const environment = getEnvironment();

// API Configuration based on environment
export const apiConfig: ApiConfig = {
  baseURL: environment.apiBaseURL,
  version: process.env.REACT_APP_API_VERSION || 'v1',
  timeout: parseInt(process.env.REACT_APP_REQUEST_TIMEOUT || '10000'),
  retryAttempts: environment.isProduction ? 3 : 1,
  retryDelay: environment.isProduction ? 1000 : 500,
  healthCheckInterval: parseInt(
    process.env.REACT_APP_HEALTH_CHECK_INTERVAL || 
    (environment.isProduction ? '60000' : '30000')
  ),
  enableLogging: process.env.REACT_APP_DEBUG_MODE === 'true' || environment.isDevelopment,
  logLevel: (process.env.REACT_APP_LOG_LEVEL as any) || (environment.isProduction ? 'error' : 'debug'),
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true' && environment.isProduction,
  enableErrorReporting: process.env.REACT_APP_ENABLE_ERROR_REPORTING === 'true' && environment.isProduction,
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/token/',
    REFRESH: '/token/refresh/',
    VERIFY: '/token/verify/',
  },
  
  // Core Resources (with versioning)
  CLIENTS: `/v1/clients/`,
  INQUIRIES: `/v1/inquiries/`,
  JOBCARDS: `/v1/jobcards/`,
  RENEWALS: `/v1/renewals/`,
  
  // Health and Status
  HEALTH: '/health/',
  
  // Statistics
  STATS: {
    JOBCARDS: `/v1/jobcards/statistics/`,
    RENEWALS: `/v1/renewals/upcoming_summary/`,
  },
  
  // Actions
  ACTIONS: {
    CONVERT_INQUIRY: (id: number) => `/v1/inquiries/${id}/convert/`,
    UPDATE_PAYMENT: (id: number) => `/v1/jobcards/${id}/update_payment_status/`,
    MARK_RENEWAL_COMPLETED: (id: number) => `/v1/renewals/${id}/mark_completed/`,
  }
};

// Request/Response Types
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

// Utility functions
export const getFullApiUrl = (endpoint: string): string => {
  const baseUrl = apiConfig.baseURL.replace(/\/$/, ''); // Remove trailing slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

export const isApiHealthy = async (): Promise<boolean> => {
  try {
    const response = await fetch(getFullApiUrl(API_ENDPOINTS.HEALTH), {
      method: 'GET',
      timeout: 5000,
    } as any);
    return response.ok;
  } catch {
    return false;
  }
};

// Development helpers
if (environment.isDevelopment && apiConfig.enableLogging) {
  console.group('🚀 API Configuration');
  console.log('Environment:', environment.name);
  console.log('Base URL:', apiConfig.baseURL);
  console.log('Version:', apiConfig.version);
  console.log('Timeout:', apiConfig.timeout);
  console.log('Logging:', apiConfig.enableLogging);
  console.log('Analytics:', apiConfig.enableAnalytics);
  console.groupEnd();
}

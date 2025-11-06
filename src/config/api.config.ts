// API Configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
  enableCache: boolean;
  cacheTimeout: number;
}

// Environment detection
const isProduction = import.meta.env.PROD;
const isRailway = import.meta.env.VITE_RAILWAY_ENVIRONMENT === 'production';

// API Configuration based on environment
export const apiConfig: ApiConfig = {
  baseUrl: isProduction || isRailway 
    ? 'https://pestcontrol-backend-production.up.railway.app/api'
    : import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  enableLogging: !isProduction,
  enableCache: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/token/',
    REFRESH: '/token/refresh/',
    VERIFY: '/token/verify/',
  },
  
  // Core Resources
  CLIENTS: '/v1/clients/',
  INQUIRIES: '/v1/inquiries/',
  JOBCARDS: '/v1/jobcards/',
  RENEWALS: '/v1/renewals/',
  
  // Dashboard
  DASHBOARD_STATS: '/v1/dashboard/statistics/',
  DASHBOARD: '/v1/dashboard/',
  
  // Health Check
  HEALTH: '/v1/health/',
  FIREBASE_HEALTH: '/v1/firebase/health/',
} as const;

// Cache Keys
export const CACHE_KEYS = {
  CLIENTS: 'clients',
  INQUIRIES: 'inquiries',
  JOBCARDS: 'jobcards',
  RENEWALS: 'renewals',
  DASHBOARD_STATS: 'dashboard_stats',
} as const;

// Request timeout configurations for different operations
export const TIMEOUT_CONFIG = {
  FAST: 5000,    // 5 seconds for quick operations
  NORMAL: 15000, // 15 seconds for normal operations
  SLOW: 30000,   // 30 seconds for heavy operations
  UPLOAD: 60000, // 60 seconds for file uploads
} as const;

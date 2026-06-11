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
const apiBase =
  isProduction || isRailway
    ? 'https://api.vacationbna.site/api'
    : import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Local dev: disable in-memory API cache so every page navigation shows real Network requests
const isLocalDev =
  !isProduction &&
  !isRailway &&
  (apiBase.includes('localhost') || apiBase.includes('127.0.0.1'));

// API Configuration based on environment
export const apiConfig: ApiConfig = {
  baseUrl: apiBase,
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  enableLogging: !isProduction,
  enableCache: import.meta.env.VITE_DISABLE_API_CACHE === 'true'
    ? false
    : import.meta.env.VITE_ENABLE_API_CACHE === 'true'
      ? true
      : !isLocalDev,
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
  TECHNICIANS: '/v1/technicians/',
  CRM_INQUIRIES: '/v1/crm-inquiries/',
  PARTNER_REFERRALS: '/v1/partner-referrals/',
  PARTNER_APP_VERSION: '/v1/partner-app-version/',
  WEBSITE_LEADS: '/v1/website-leads/',
  
  // Dashboard
  DASHBOARD_STATS: '/v1/dashboard/statistics/',
  DASHBOARD: '/v1/dashboard/',
  
  USERS_THEME: '/v1/users/theme/',

  // Health Check
  HEALTH: '/v1/health/',
  FIREBASE_HEALTH: '/v1/firebase/health/',
  FEEDBACKS: '/v1/feedbacks/',
  REMINDERS: '/v1/reminders/',
  QUOTATIONS: '/v1/quotations/',
  PRICING_CONFIG: '/pricing-config/',
  PRICING_REGIONS: '/pricing-regions/',
  PRICING_RATES: '/pricing-rates/',
  PRICING_AUDIT_LOGS: '/pricing-audit-logs/',

  // Blog CMS
  BLOG: {
    DASHBOARD: '/blogs/dashboard-stats/',
    LIST: '/blogs/',
    CREATE: '/blogs/create/',
    DETAIL: (id: number) => `/blogs/${id}/`,
    UPDATE: (id: number) => `/blogs/${id}/update/`,
    DELETE: (id: number) => `/blogs/${id}/delete/`,
    TOGGLE_PUBLISH: (id: number) => `/blogs/${id}/toggle-publish/`,
    UPLOAD_IMAGE: '/blogs/upload-image/',
    CATEGORIES: '/blogs/categories/',
    CATEGORY_DETAIL: (id: number) => `/blogs/categories/${id}/`,
    TAGS: '/blogs/tags/',
    TAG_DETAIL: (id: number) => `/blogs/tags/${id}/`,
  },
} as const;

// Cache Keys
export const CACHE_KEYS = {
  CLIENTS: 'clients',
  INQUIRIES: 'inquiries',
  JOBCARDS: 'jobcards',
  RENEWALS: 'renewals',
  DASHBOARD_STATS: 'dashboard_stats',
  TECHNICIANS: 'technicians',
  CRM_INQUIRIES: 'crm_inquiries',
  PARTNER_REFERRALS: 'partner_referrals',
  FEEDBACKS: 'feedbacks',
  REMINDERS: 'reminders',
  DASHBOARD_COUNTS: 'dashboard_counts',
  QUOTATIONS: 'quotations',
  PRICING_RATES: 'pricing_rates',
  PRICING_REGIONS: 'pricing_regions',
} as const;

// Request timeout configurations for different operations
export const TIMEOUT_CONFIG = {
  FAST: 5000,    // 5 seconds for quick operations
  NORMAL: 15000, // 15 seconds for normal operations
  SLOW: 30000,   // 30 seconds for heavy operations
  UPLOAD: 60000, // 60 seconds for file uploads
} as const;

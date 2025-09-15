/**
 * Comprehensive TypeScript types for API responses and requests
 * Ensures type safety across the entire application
 */

// Base API response structure
export interface BaseApiResponse {
  success: boolean;
  message?: string;
  timestamp: string;
}

// Paginated response structure
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Error response structure
export interface ApiErrorResponse {
  error: string;
  details?: Record<string, string[]>;
  code?: string;
  timestamp: string;
}

// Client types
export interface Client {
  id: number;
  full_name: string;
  mobile: string;
  email?: string;
  city: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClientRequest {
  full_name: string;
  mobile: string;
  email?: string;
  city: string;
  address?: string;
  notes?: string;
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {
  is_active?: boolean;
}

// Inquiry types
export interface Inquiry {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  message: string;
  service_interest: string;
  city: string;
  status: InquiryStatus;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export type InquiryStatus = 'New' | 'Contacted' | 'Converted' | 'Closed';

export interface CreateInquiryRequest {
  name: string;
  mobile: string;
  email?: string;
  message: string;
  service_interest: string;
  city: string;
}

export interface UpdateInquiryRequest extends Partial<CreateInquiryRequest> {
  status?: InquiryStatus;
  is_read?: boolean;
}

export interface InquiryConversionRequest {
  technician_name?: string;
  schedule_date?: string;
  price?: string;
  client_id?: number;
}

// Job Card types
export interface JobCard {
  id: number;
  code: string;
  client: number;
  client_name?: string;
  client_mobile?: string;
  client_city?: string;
  job_type: JobType;
  contract_duration?: ContractDuration;
  status: JobStatus;
  service_type: string;
  schedule_date: string;
  technician_name: string;
  price: string;
  payment_status: PaymentStatus;
  next_service_date?: string;
  notes?: string;
  is_paused: boolean;
  reference?: string; // New reference field
  created_at: string;
  updated_at: string;
}

export type JobType = 'Customer' | 'Society';
export type ContractDuration = '12' | '6' | '3';
export type JobStatus = 'Enquiry' | 'WIP' | 'Done' | 'Hold' | 'Cancel' | 'Inactive';
export type PaymentStatus = 'Unpaid' | 'Paid';

export interface CreateJobCardRequest {
  client: number;
  job_type: JobType;
  contract_duration?: ContractDuration;
  service_type: string;
  schedule_date: string;
  technician_name: string;
  price: string;
  next_service_date?: string;
  notes?: string;
}

export interface UpdateJobCardRequest extends Partial<CreateJobCardRequest> {
  status?: JobStatus;
  payment_status?: PaymentStatus;
  is_paused?: boolean;
}

// Renewal types
export interface Renewal {
  id: number;
  jobcard: number;
  jobcard_code?: string;
  client_name?: string;
  is_paused?: boolean;
  due_date: string;
  status: RenewalStatus;
  renewal_type: RenewalType;
  urgency_level: UrgencyLevel;
  urgency_color?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export type RenewalStatus = 'Due' | 'Completed';
export type RenewalType = 'Contract' | 'Monthly';
export type UrgencyLevel = 'High' | 'Medium' | 'Normal';

export interface CreateRenewalRequest {
  jobcard: number;
  due_date: string;
  renewal_type?: RenewalType;
  remarks?: string;
}

export interface UpdateRenewalRequest extends Partial<CreateRenewalRequest> {
  status?: RenewalStatus;
  urgency_level?: UrgencyLevel;
}

// Authentication types
export interface AuthTokens {
  access: string;
  refresh: string;
  user_id: number;
  username: string;
  email?: string;
  is_staff: boolean;
  is_superuser?: boolean;
  first_name?: string;
  last_name?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
}

// Statistics types
export interface JobCardStatistics {
  total_jobs: number;
  completed_jobs: number;
  pending_jobs: number;
  total_revenue: string;
  completion_rate: number;
}

export interface RenewalSummary {
  due_this_week: number;
  due_this_month: number;
  overdue: number;
  high_urgency: number;
  medium_urgency: number;
  normal_urgency: number;
}

export interface InquiryCounts {
  new: number;
  contacted: number;
  total_new: number;
  unread_new: number;
  unread_contacted: number;
  unread_total: number;
  converted: number;
  closed: number;
  total: number;
}

// Filter and search types
export interface ClientFilters {
  q?: string;
  city?: string;
  is_active?: boolean;
  page?: number;
}

export interface InquiryFilters {
  q?: string;
  status?: InquiryStatus;
  city?: string;
  is_read?: boolean;
  page?: number;
}

export interface JobCardFilters {
  q?: string;
  status?: JobStatus;
  job_type?: JobType;
  payment_status?: PaymentStatus;
  city?: string;
  from?: string;
  to?: string;
  page?: number;
}

export interface RenewalFilters {
  q?: string;
  status?: RenewalStatus;
  renewal_type?: RenewalType;
  urgency_level?: UrgencyLevel;
  due_date_gte?: string;
  due_date_lte?: string;
  due_date_lt?: string;
  include_paused?: boolean;
  page?: number;
}

// Action response types
export interface ActionResponse {
  message: string;
  success: boolean;
  data?: any;
}

export interface ClientExistsResponse {
  exists: boolean;
  client?: Client;
  message: string;
}

// Health check types
export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  endpoint: string;
  timestamp?: string;
}

// Utility types
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  order: SortOrder;
}

export interface TableColumn {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  sortable?: boolean;
  format?: (value: any) => React.ReactNode;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormErrors {
  [key: string]: string[];
}

// API configuration types
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  size: number;
  pendingRequests: number;
  keys: string[];
}

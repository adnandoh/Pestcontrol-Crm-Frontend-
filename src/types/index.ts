// Core data models for PestControl99 CRM

export interface Client {
  id: number;
  full_name: string;
  mobile: string;
  email?: string;
  city?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Inquiry {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  message: string;
  service_interest: string;
  city?: string;
  status: 'New' | 'Contacted' | 'Converted' | 'Closed';
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobCard {
  id: number;
  code: string;
  client: number;
  client_name: string;
  client_mobile: string;
  client_email?: string;
  client_city?: string;
  client_address?: string;
  client_notes?: string;
  job_type: 'Customer' | 'Society';
  contract_duration?: '12' | '6' | '3';
  status: 'Enquiry' | 'WIP' | 'Done' | 'Hold' | 'Cancel' | 'Inactive';
  service_type: string;
  schedule_date?: string;
  price?: string;
  payment_status: 'Unpaid' | 'Paid';
  next_service_date?: string;
  notes?: string;
  is_paused: boolean;
  reference?: string;
  customer_type?: string;
  extra_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Renewal {
  id: number;
  jobcard: number;
  jobcard_code: string;
  client_name: string;
  is_paused: boolean;
  due_date: string;
  status: 'Due' | 'Completed';
  renewal_type: 'Contract' | 'Monthly';
  urgency_level: 'High' | 'Medium' | 'Normal';
  urgency_color: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
}

// API Response types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

// Auth types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
  user_id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
}

// Form types
export interface ClientFormData {
  full_name: string;
  mobile: string;
  email?: string;
  city?: string;
  address?: string;
  notes?: string;
}

export interface InquiryFormData {
  name: string;
  mobile: string;
  email?: string;
  message: string;
  service_interest: string;
  city?: string;
}

export interface JobCardFormData {
  client?: number;
  client_name: string;
  client_mobile: string;
  client_email?: string;
  client_city: string;
  client_address: string;
  client_notes?: string;
  job_type: 'Customer' | 'Society';
  is_paused: boolean;
  service_type: string;
  schedule_date: string;
  status: string;
  payment_status: string;
  price: number | string;
  next_service_date?: string;
  contract_duration?: string;
  reference?: string;
  extra_notes?: string;
}

// Filter types
export interface ClientFilters {
  search?: string;
  city?: string;
  is_active?: boolean;
  ordering?: string;
}

export interface InquiryFilters {
  search?: string;
  status?: string;
  city?: string;
  is_read?: boolean;
  ordering?: string;
}

export interface JobCardFilters {
  search?: string;
  status?: string;
  city?: string;
  service_type?: string;
  payment_status?: string;
  job_type?: string;
  ordering?: string;
}

export interface RenewalFilters {
  search?: string;
  urgency?: string;
  status?: string;
  ordering?: string;
}

// Dashboard types
export interface DashboardStats {
  inquiries: {
    new: number;
    contacted: number;
    converted: number;
    closed: number;
  };
  jobcards: {
    total: number;
    enquiry: number;
    wip: number;
    done: number;
    hold: number;
    cancel: number;
    inactive: number;
  };
  renewals: {
    due: number;
    overdue: number;
    upcoming: number;
  };
  payments: {
    paid: number;
    unpaid: number;
  };
  clients?: {
    total: number;
    active: number;
    inactive: number;
  };
}

// Dashboard Statistics API Response
export interface DashboardStatisticsResponse {
  total_inquiries: number;
  total_job_cards: number;
  total_clients: number;
  renewals: number;
  status: string;
  timestamp: string;
  cache_hit: boolean;
}
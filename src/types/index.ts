// Core data models for PestControl99 CRM

export interface Client {
  id: number;
  full_name: string;
  mobile: string;
  email?: string;
  state?: string;
  city?: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Technician {
  id: number;
  name: string;
  mobile: string;
  age?: number;
  alternative_mobile?: string;
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
  state?: string;
  city?: string;
  status: 'New' | 'Contacted' | 'Converted' | 'Closed';
  updated_at: string;
}

export type CRMInquiryStatus = 'New' | 'Contacted' | 'Converted' | 'Closed';
export type PestType = string; // Using string for maximum flexibility in CRM

export interface CRMInquiry {
  id: number;
  name: string;
  mobile: string;
  location?: string;
  pest_type: PestType;
  remark?: string;
  inquiry_date: string;
  inquiry_time: string;
  status: CRMInquiryStatus;
  created_by?: number;
  created_by_name?: string;
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
  client_state?: string;
  client_city?: string;
  client_address?: string;
  client_notes?: string;
  job_type: 'Customer' | 'Society';
  service_category?: 'One-Time Service' | 'AMC';
  property_type?: 'Home / Flat' | 'Bungalow' | 'Hotel' | 'Office' | 'Commercial Space';
  bhk_size?: '1 RK' | '1 BHK' | '2 BHK' | '3 BHK' | '4 BHK';
  contract_duration?: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Hold' | 'Inactive';
  service_type: string;
  time_slot?: string;
  state?: string;
  city?: string;
  assigned_to?: string;
  technician?: number;
  technician_name?: string;
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
  state?: string;
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
  state?: string;
  city?: string;
}

export interface CRMInquiryFormData {
  name: string;
  mobile: string;
  location?: string;
  pest_type: PestType;
  remark?: string;
  inquiry_date: string;
  inquiry_time: string;
  status?: CRMInquiryStatus;
}

export interface JobCardFormData {
  client?: number;
  client_name: string;
  client_mobile: string;
  client_email?: string;
  client_state?: string;
  client_city: string;
  client_address: string;
  client_notes?: string;
  job_type: 'Customer' | 'Society';
  service_category?: string;
  property_type?: string;
  bhk_size?: string;
  is_paused: boolean;
  service_type: string;
  schedule_date: string;
  time_slot?: string;
  state?: string;
  city?: string;
  status: string;
  payment_status: string;
  assigned_to?: string;
  technician?: number;
  price: number | string;
  next_service_date?: string;
  contract_duration?: string;
  reference?: string;
  notes?: string;
  extra_notes?: string;
}

// Filter types
export interface ClientFilters {
  search?: string;
  city?: string;
  state?: string;
  is_active?: boolean;
  ordering?: string;
}

export interface InquiryFilters {
  search?: string;
  status?: string;
  state?: string;
  city?: string;
  is_read?: boolean;
  ordering?: string;
}

export interface CRMInquiryFilters {
  search?: string;
  status?: string;
  pest_type?: string;
  inquiry_date?: string;
  from?: string;
  to?: string;
  ordering?: string;
}

export interface JobCardFilters {
  search?: string;
  status?: string;
  state?: string;
  city?: string;
  service_type?: string;
  service_category?: string;
  payment_status?: string;
  job_type?: string;
  assigned_to?: string;
  from?: string;
  to?: string;
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
  total_web_inquiries?: number;
  total_crm_inquiries?: number;
  total_job_cards: number;
  total_clients: number;
  renewals: number;
  category_stats?: {
    one_time: number;
    amc: number;
  };
  status_stats?: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    hold: number;
  };
  job_type_stats?: {
    individual: number;
    society: number;
  };
  city_stats?: Array<{
    client_city: string;
    count: number;
  }>;
  property_type_stats?: Array<{
    property_type: string;
    count: number;
  }>;
  bhk_stats?: Array<{
    bhk_size: string;
    count: number;
  }>;
  status: string;
  timestamp: string;
  cache_hit: boolean;
}
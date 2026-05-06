// Core data models for PestControl99 CRM

export interface Client {
  id: number;
  full_name: string;
  mobile: string;
  email?: string;
  state?: string;
  city?: string;
  flat_number?: string;
  building_name?: string;
  landmark?: string;
  area?: string;
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
  phone?: string;
  age?: number;
  alternative_mobile?: string;
  is_active: boolean;
  service_area?: string;
  city?: string;
  last_active?: string;
  active_jobs?: number;
  active_job_details?: {
    id: number;
    client__full_name: string;
    service_type: string;
    client_name?: string;
    service?: string;
  }[];
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
  flat_number?: string;
  building_name?: string;
  landmark?: string;
  area?: string;
  status: 'New' | 'Contacted' | 'Converted' | 'Closed';
  is_read?: boolean;
  reminder_date?: string | null;
  reminder_note?: string | null;
  is_reminder_done?: boolean;
  created_at: string;
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
  reminder_date?: string | null;
  reminder_note?: string | null;
  is_reminder_done?: boolean;
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
  flat_number?: string;
  building_name?: string;
  landmark?: string;
  area?: string;
  job_type: 'Customer' | 'Society';
  commercial_type: 'home' | 'hotel' | 'society' | 'villa' | 'office' | 'other';
  is_price_estimated: boolean;
  service_category?: 'One-Time Service' | 'AMC';
  property_type?: 'Home / Flat' | 'Bungalow' | 'Hotel' | 'Office' | 'Commercial Space';
  bhk_size?: '1 RK' | '1 BHK' | '2 BHK' | '3 BHK' | '4 BHK';
  contract_duration?: string;
  is_paused?: boolean;
  is_service_call?: boolean;
  status: 'Pending' | 'On Process' | 'Done' | 'Cancelled';
  payment_status?: string;
  service_type: string;
  schedule_datetime: string;
  time_slot?: string;
  state?: string;
  city?: string;
  price?: number | string;
  assigned_to?: string;
  technician?: number | null;
  technician_name?: string;
  reference?: string;
  customer_type?: string;
  next_service_date?: string;
  service_cycle?: number;
  max_cycle?: number;
  parent_job?: number | null;
  notes?: string;
  extra_notes?: string;
  cancellation_reason?: string;
  removal_remarks?: string;
  reminder_date?: string | null;
  reminder_note?: string | null;
  is_reminder_done?: boolean;
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
  flat_number?: string;
  building_name?: string;
  landmark?: string;
  area?: string;
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
  flat_number?: string;
  building_name?: string;
  landmark?: string;
  area?: string;
  reminder_date?: string | null;
  reminder_note?: string | null;
  is_reminder_done?: boolean;
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
  reminder_date?: string | null;
  reminder_note?: string | null;
  is_reminder_done?: boolean;
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
  commercial_type: 'home' | 'hotel' | 'society' | 'villa' | 'office' | 'other';
  is_price_estimated: boolean;
  service_category?: string;
  property_type?: string;
  bhk_size?: string;
  is_paused: boolean;
  service_type: string;
  schedule_datetime: string;
  time_slot?: string;
  state?: string;
  city?: string;
  status: string;
  payment_status: string;
  assigned_to?: string;
  technician?: number | null;
  price: number | string;
  next_service_date?: string;
  service_cycle?: number;
  max_cycle?: number;
  parent_job?: number | null;
  contract_duration?: string;
  reference?: string;
  notes?: string;
  extra_notes?: string;
  cancellation_reason?: string;
  removal_remarks?: string;
  reminder_date?: string | null;
  reminder_note?: string | null;
  is_reminder_done?: boolean;
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
    on_process: number;
    done: number;
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
    city: string;
    count: number;
  }>;
  property_type_stats?: Array<{
    property_type: string;
    count: number;
  }>;
  status: string;
  timestamp: string;
  cache_hit: boolean;
}

export interface Feedback {
  id: number;
  booking: number;
  booking_code: string;
  client_name: string;
  technician_name: string;
  service_name: string;
  service_date: string;
  rating: number;
  remark?: string;
  technician_behavior: 'excellent' | 'good' | 'average' | 'poor';
  feedback_type: string;
  token: string;
  created_at: string;
}

export interface TechnicianPerformance {
  technician_name: string;
  technician_id: number;
  average_rating: number;
  total_feedbacks: number;
}

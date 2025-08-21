// Type definitions for the application

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

export interface Inquiry {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  message: string;
  service_interest: string;
  city: string;
  status: 'New' | 'Contacted' | 'Converted' | 'Closed';
  created_at: string;
  updated_at: string;
}

export interface JobCard {
  id: number;
  code: string;
  client: number;
  client_name?: string;
  client_mobile?: string;
  client_city?: string;
  status: 'Enquiry' | 'WIP' | 'Done' | 'Hold' | 'Cancel' | 'Inactive';
  service_type: string;
  schedule_date: string;
  technician_name: string;
  price_subtotal: number;
  tax_percent: number;
  grand_total: number;
  payment_status: 'Unpaid' | 'Paid';
  next_service_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Renewal {
  id: number;
  jobcard: number;
  jobcard_code?: string;
  client_name?: string;
  due_date: string;
  status: 'Due' | 'Completed';
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

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

export interface User {
  id: number;
  username: string;
  is_staff: boolean;
}
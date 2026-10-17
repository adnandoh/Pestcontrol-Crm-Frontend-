import type { CRMInquiry, Inquiry } from '../types';

/** Passed to New Booking. Nothing is saved until Confirm Booking. */
export type LeadConversionDraft = {
  source: 'website' | 'crm';
  inquiryId: number;
  name: string;
  mobile: string;
  email?: string;
  city?: string;
  state?: string;
  address: string;
  serviceHint: string;
  premiseType?: string;
  premiseSize?: string;
  frequency?: string;
  remark?: string;
  masterStateId?: number;
  masterStateName?: string;
  masterCityId?: number;
  masterCityName?: string;
  masterLocationId?: number;
};

export function websiteLeadDraft(inquiry: Inquiry): LeadConversionDraft {
  const structured = [inquiry.flat_number, inquiry.building_name, inquiry.landmark, inquiry.area]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(', ');
  const message = (inquiry.message || '').trim();
  const address = [structured, message].filter(Boolean).join(', ');
  return {
    source: 'website',
    inquiryId: inquiry.id,
    name: inquiry.name || '',
    mobile: (inquiry.mobile || '').replace(/\D/g, '').slice(0, 10),
    email: inquiry.email || '',
    city: inquiry.city || '',
    state: inquiry.state || '',
    address,
    serviceHint: inquiry.service_interest || inquiry.pest_problems || '',
    premiseType: inquiry.premise_type || '',
    premiseSize: inquiry.premise_size || '',
    frequency: inquiry.service_frequency || '',
    remark: inquiry.remark || '',
  };
}

export function crmLeadDraft(inquiry: CRMInquiry): LeadConversionDraft {
  return {
    source: 'crm',
    inquiryId: inquiry.id,
    name: inquiry.name || '',
    mobile: (inquiry.mobile || '').replace(/\D/g, '').slice(0, 10),
    city: inquiry.master_city_name || '',
    state: inquiry.master_state_name || '',
    address: inquiry.location || '',
    serviceHint: inquiry.pest_type || '',
    premiseSize: '',
    frequency: inquiry.service_frequency || '',
    remark: inquiry.remark || '',
    masterStateId: inquiry.master_state,
    masterStateName: inquiry.master_state_name,
    masterCityId: inquiry.master_city,
    masterCityName: inquiry.master_city_name,
    masterLocationId: inquiry.master_location,
  };
}

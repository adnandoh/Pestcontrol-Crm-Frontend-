/**
 * Pest Control 99 — approved Meta Utility templates (WhatsFlow / Cloud API).
 * Variable order matches live WhatsFlow template bodies (en_US).
 */
import dayjs from 'dayjs';
import type { CRMInquiry, Inquiry, JobCard, Technician } from '../types';
import { normalizeWhatsAppPhone } from './whatsappEcard';

export const PC99_WA_LANGUAGE = 'en_US' as const;

export const PC99_TC_TEXT = 'https://www.pestcontrol99.com/terms-and-conditions/';

export const PC99_FEEDBACK_BASE = 'https://pestcontrol99.com/feedback';

export const PC99_TEMPLATES = {
  bookingConfirmation: {
    name: 'pc99_booking_confirmation',
    metaId: '1058629103411244',
    label: 'Booking confirmation',
  },
  techAssignedCustomer: {
    name: 'pc99_tech_assigned_customer',
    metaId: '2093027677915864',
    label: 'Technician assigned (customer)',
  },
  techCustomerDetails: {
    name: 'pc99_tech_customer_details',
    metaId: '1761596981525142',
    label: 'Job details (technician)',
  },
  feedbackRequest: {
    name: 'pc99_feedback_request',
    metaId: '2768588571104796',
    label: 'Feedback request',
  },
  afterServiceGuidelines: {
    name: 'pc99_after_service_guidelines',
    metaId: '1045896984680613',
    label: 'After-service guidelines',
  },
  inquiryReceived: {
    name: 'pc99_inquiry_received',
    metaId: '913141521839654',
    label: 'Inquiry received',
  },
  bookingCancelled: {
    name: 'pc99_booking_cancelled',
    metaId: '1819206949259510',
    label: 'Booking cancelled',
  },
} as const;

export type JobWhatsAppSource = {
  id: number;
  code?: string | null;
  client_name?: string | null;
  client_mobile?: string | null;
  service_type?: string | null;
  area?: string | null;
  bhk_size?: string | null;
  property_type?: string | null;
  client_city?: string | null;
  city?: string | null;
  master_city_name?: string | null;
  client_address?: string | null;
  full_address?: string | null;
  schedule_datetime?: string | null;
  time_slot?: string | null;
  price?: string | number | null;
  notes?: string | null;
  extra_notes?: string | null;
  technician_name?: string | null;
  technician_mobile?: string | null;
  assigned_to?: string | null;
};

const str = (value: unknown, fallback = '—') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const bookingIdOf = (job: JobWhatsAppSource) => str(job.code || job.id);

const areaOf = (job: JobWhatsAppSource) =>
  str(job.area || job.bhk_size || job.property_type || job.master_city_name || job.client_city || job.city);

const addressOf = (job: JobWhatsAppSource) => str(job.full_address || job.client_address);

const amountOf = (job: JobWhatsAppSource) => str(job.price ?? '0', '0');

const scheduleParts = (job: JobWhatsAppSource) => {
  const when = job.schedule_datetime ? dayjs(job.schedule_datetime) : null;
  const date = when?.isValid() ? when.format('DD MMM YYYY') : '—';
  const time = str(
    job.time_slot || (when?.isValid() ? when.format('hh:mm A') : ''),
    '—',
  );
  const dateTime = when?.isValid()
    ? `${when.format('DD MMM YYYY')} ${job.time_slot || when.format('hh:mm A')}`
    : str(job.time_slot);
  return { date, time, dateTime };
};

export function feedbackLinkForBooking(jobId: number | string): string {
  return `${PC99_FEEDBACK_BASE}/${jobId}`;
}

/** {{1}} name … {{8}} T&C */
export function paramsBookingConfirmation(job: JobWhatsAppSource): string[] {
  const { date, time } = scheduleParts(job);
  return [
    str(job.client_name, 'Customer'),
    bookingIdOf(job),
    str(job.service_type, 'Pest Control'),
    areaOf(job),
    date,
    time,
    amountOf(job),
    PC99_TC_TEXT,
  ];
}

/** {{1}} name, {{2}} booking, {{3}} tech, {{4}} service, {{5}} datetime */
export function paramsTechAssignedCustomer(
  job: JobWhatsAppSource,
  tech?: Pick<Technician, 'name'> | null,
): string[] {
  const { dateTime } = scheduleParts(job);
  return [
    str(job.client_name, 'Customer'),
    bookingIdOf(job),
    str(tech?.name || job.technician_name || job.assigned_to, 'Technician'),
    str(job.service_type, 'Pest Control'),
    dateTime,
  ];
}

/** {{1}} booking … {{9}} instructions — sent to technician phone */
export function paramsTechCustomerDetails(
  job: JobWhatsAppSource,
  tech?: Pick<Technician, 'name'> | null,
): string[] {
  const { dateTime } = scheduleParts(job);
  return [
    bookingIdOf(job),
    str(job.client_name, 'Customer'),
    str(job.client_mobile),
    str(job.service_type, 'Pest Control'),
    areaOf(job),
    addressOf(job),
    dateTime,
    amountOf(job),
    str(job.notes || job.extra_notes, 'N/A'),
  ];
}

/** {{1}} name, {{2}} booking, {{3}} service, {{4}} feedback URL */
export function paramsFeedbackRequest(job: JobWhatsAppSource): string[] {
  return [
    str(job.client_name, 'Customer'),
    bookingIdOf(job),
    str(job.service_type, 'Pest Control'),
    feedbackLinkForBooking(job.id),
  ];
}

/** {{1}} name only */
export function paramsAfterServiceGuidelines(job: JobWhatsAppSource): string[] {
  return [str(job.client_name, 'Customer')];
}

/** {{1}} name, {{2}} service, {{3}} area, {{4}} property type */
export function paramsInquiryReceived(inquiry: {
  name?: string | null;
  pest_type?: string | null;
  service_type?: string | null;
  location?: string | null;
  area?: string | null;
  city?: string | null;
  property_type?: string | null;
  message?: string | null;
}): string[] {
  return [
    str(inquiry.name, 'Customer'),
    str(inquiry.pest_type || inquiry.service_type, 'Pest Control'),
    str(inquiry.area || inquiry.location || inquiry.city, '—'),
    str(inquiry.property_type, 'Residential'),
  ];
}

/** {{1}} name, {{2}} booking id */
export function paramsBookingCancelled(job: JobWhatsAppSource): string[] {
  return [str(job.client_name, 'Customer'), bookingIdOf(job)];
}

export function phoneForCustomer(jobOrMobile: JobWhatsAppSource | string | null | undefined): string {
  if (!jobOrMobile) return '';
  if (typeof jobOrMobile === 'string') return normalizeWhatsAppPhone(jobOrMobile);
  return normalizeWhatsAppPhone(jobOrMobile.client_mobile || '');
}

export function phoneForTechnician(
  job: JobWhatsAppSource,
  tech?: Pick<Technician, 'mobile' | 'phone'> | null,
): string {
  const raw = tech?.mobile || tech?.phone || job.technician_mobile || '';
  return normalizeWhatsAppPhone(raw);
}

export function asJobWhatsAppSource(job: JobCard): JobWhatsAppSource {
  return job;
}

export function inquiryFromWebsite(inquiry: Inquiry) {
  return {
    name: inquiry.name,
    pest_type: inquiry.service_interest || inquiry.pest_type,
    service_type: inquiry.service_interest,
    location: inquiry.city || inquiry.state,
    area: inquiry.city,
    city: inquiry.city,
    property_type: 'Residential',
    message: inquiry.message,
  };
}

export function inquiryFromCrm(inquiry: CRMInquiry | {
  name?: string;
  pest_type?: string;
  location?: string;
  area?: string;
  city?: string;
  master_city_name?: string;
  property_type?: string;
  remark?: string;
}) {
  return {
    name: inquiry.name,
    pest_type: inquiry.pest_type,
    service_type: inquiry.pest_type,
    location: inquiry.location,
    area: inquiry.area || inquiry.location,
    city: ('city' in inquiry ? inquiry.city : undefined) || inquiry.master_city_name,
    property_type: inquiry.property_type || 'Residential',
    message: 'remark' in inquiry ? inquiry.remark : undefined,
  };
}

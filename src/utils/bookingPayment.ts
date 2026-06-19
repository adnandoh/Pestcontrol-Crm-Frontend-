import type { JobCard } from '../types';

const parseAmount = (value?: string | number | null): number => {
  if (value === null || value === undefined) return 0;
  const raw = String(value).replace(/[₹,\s]/g, '').trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Payment popup on Done only for the first/main paid booking.
 * Follow-ups, complaints, revisits, and included AMC visits complete directly.
 */
export function requiresPaymentOnCompletion(job: Pick<
  JobCard,
  | 'is_complaint_call'
  | 'booking_category'
  | 'booking_type'
  | 'included_in_amc'
  | 'is_followup_visit'
  | 'is_service_call'
  | 'parent_job'
  | 'service_cycle'
  | 'price'
  | 'total_amount'
  | 'paid_amount'
  | 'pending_amount'
>): boolean {
  if (job.is_complaint_call) return false;
  if (job.booking_category === 'complaint_call') return false;
  if (job.booking_type === 'Complaint Call') return false;

  if (job.included_in_amc) return false;
  if (job.is_followup_visit) return false;
  if (job.booking_category === 'amc_followup') return false;
  if (job.booking_type === 'AMC Follow-up') return false;

  if (job.is_service_call) return false;
  if (job.booking_category === 'service_call') return false;
  if (job.booking_type === 'Service Call') return false;

  if (job.parent_job && (job.service_cycle || 1) > 1) return false;

  const total = parseAmount(job.total_amount) || parseAmount(job.price);
  if (total <= 0) return false;

  const paid = parseAmount(job.paid_amount);
  const pending = parseAmount(job.pending_amount);
  if (paid >= total && pending <= 0) return false;

  return true;
}

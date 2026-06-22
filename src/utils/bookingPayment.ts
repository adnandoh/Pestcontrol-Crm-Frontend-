import type { JobCard } from '../types';

const parseAmount = (value?: string | number | null): number => {
  if (value === null || value === undefined) return 0;
  const raw = String(value).replace(/[₹,\s]/g, '').trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

function serviceItemsTotal(job: Pick<JobCard, 'service_items'>): number {
  const items = job.service_items;
  if (!Array.isArray(items) || items.length === 0) return 0;
  return items.reduce((sum, item) => sum + parseAmount(item.amount), 0);
}

/** Current service amount for payment UI — ignores stale total_amount when unpaid. */
export function getEffectiveServiceAmount(job: Pick<
  JobCard,
  'price' | 'total_amount' | 'paid_amount' | 'service_items'
>): number {
  const priceTotal = parseAmount(job.price);
  const itemsTotal = serviceItemsTotal(job);
  const storedTotal = parseAmount(job.total_amount);
  const paid = parseAmount(job.paid_amount);

  if (paid <= 0) {
    if (itemsTotal > 0) return itemsTotal;
    if (priceTotal > 0) return priceTotal;
    return storedTotal;
  }

  if (priceTotal > 0 && priceTotal >= paid) return priceTotal;
  if (itemsTotal > 0 && itemsTotal >= paid) return itemsTotal;
  if (storedTotal >= paid) return storedTotal;
  return priceTotal > 0 ? priceTotal : itemsTotal;
}

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
  | 'service_items'
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

  const total = getEffectiveServiceAmount(job);
  if (total <= 0) return false;

  const paid = parseAmount(job.paid_amount);
  const pending = parseAmount(job.pending_amount);
  if (paid >= total && pending <= 0) return false;

  return true;
}

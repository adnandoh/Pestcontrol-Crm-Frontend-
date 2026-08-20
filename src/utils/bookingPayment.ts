import type { JobCard } from '../types';

const BED_BUG_PATTERN = /bed\s*bug/i;

export function isBedBugService(text?: string | null): boolean {
  if (!text) return false;
  return BED_BUG_PATTERN.test(text.trim());
}

/** Bed Bugs visit 2+ — customer already paid on visit 1. */
export function isBedBugIncludedVisit(job: Pick<
  JobCard,
  'service_cycle' | 'source_service' | 'service_type' | 'service_items'
>): boolean {
  const cycle = job.service_cycle || 1;
  if (cycle <= 1) return false;

  if (isBedBugService(job.source_service) && !String(job.source_service).includes(',')) {
    return true;
  }
  if (isBedBugService(job.service_type) && !String(job.service_type).includes(',')) {
    return true;
  }

  const items = job.service_items;
  if (Array.isArray(items)) {
    return items.some((item) => isBedBugService(item?.service));
  }
  return false;
}

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
  'price' | 'total_amount' | 'paid_amount' | 'service_items' | 'price_display' | 'service_cycle' | 'source_service' | 'service_type'
>): number {
  if (
    job.price_display === 'Included in Service'
    || job.price_display === 'Included in AMC'
    || isBedBugIncludedVisit(job)
  ) {
    return 0;
  }

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
  | 'requires_payment_on_completion'
  | 'is_complaint_call'
  | 'booking_category'
  | 'booking_type'
  | 'included_in_amc'
  | 'is_followup_visit'
  | 'is_service_call'
  | 'parent_job'
  | 'service_cycle'
  | 'source_service'
  | 'service_type'
  | 'service_items'
  | 'price'
  | 'price_display'
  | 'total_amount'
  | 'paid_amount'
  | 'pending_amount'
>): boolean {
  if (job.requires_payment_on_completion === false) return false;
  if (job.requires_payment_on_completion === true) return true;

  if (job.is_complaint_call) return false;
  if (job.booking_category === 'complaint_call') return false;
  if (job.booking_type === 'Complaint Call') return false;

  if (isBedBugIncludedVisit(job)) return false;

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

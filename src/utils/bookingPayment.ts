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

/** Planned visit count for package split (Bed Bugs = 2, AMC = N). */
export function getPlannedServiceCount(job: Pick<
  JobCard,
  'planned_visit_count' | 'max_cycle' | 'source_service' | 'service_type' | 'service_items'
>): number {
  const planned = Number(job.planned_visit_count || 0);
  if (planned > 1) return planned;
  const maxCycle = Number(job.max_cycle || 0);
  if (maxCycle > 1) return maxCycle;
  if (
    isBedBugService(job.source_service)
    || isBedBugService(job.service_type)
    || (Array.isArray(job.service_items) && job.service_items.some((item) => isBedBugService(item?.service)))
  ) {
    return 2;
  }
  return 1;
}

/**
 * Money allocated to THIS visit for technician earnings.
 * Customer payment may still be the full package on visit 1.
 */
export function getServiceAllocationAmount(job: Pick<
  JobCard,
  | 'price'
  | 'total_amount'
  | 'paid_amount'
  | 'service_items'
  | 'price_display'
  | 'service_cycle'
  | 'source_service'
  | 'service_type'
  | 'planned_visit_count'
  | 'max_cycle'
  | 'visit_revenue_amount'
>): number {
  const storedVisit = parseAmount(job.visit_revenue_amount);
  if (storedVisit > 0) return storedVisit;

  if (isBedBugIncludedVisit(job) || job.price_display === 'Included in Service') {
    // Visit 2+ — allocate from parent package fields when present on this row.
    const packageTotal = Math.max(
      parseAmount(job.total_amount),
      parseAmount(job.price),
      serviceItemsTotal(job),
    );
    const divisor = Math.max(getPlannedServiceCount(job), 2);
    return packageTotal > 0 ? Math.round((packageTotal / divisor) * 100) / 100 : 0;
  }

  const packageOrService = getEffectiveServiceAmount(job);
  const divisor = getPlannedServiceCount(job);
  if (divisor <= 1) return packageOrService;
  return Math.round((packageOrService / divisor) * 100) / 100;
}

export function getTechnicianSharePercent(job: Pick<JobCard, 'technician_share_percent'>): number {
  const pct = Number(job.technician_share_percent ?? 40);
  return Number.isFinite(pct) && pct > 0 ? pct : 40;
}

export function getTechnicianEarningsPreview(job: Parameters<typeof getServiceAllocationAmount>[0] & Pick<
  JobCard,
  'technician_share_percent' | 'visit_payout_amount'
>): number {
  const stored = parseAmount(job.visit_payout_amount);
  if (stored > 0) return stored;
  const allocation = getServiceAllocationAmount(job);
  const pct = getTechnicianSharePercent(job);
  return Math.round((allocation * pct) / 100 * 100) / 100;
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

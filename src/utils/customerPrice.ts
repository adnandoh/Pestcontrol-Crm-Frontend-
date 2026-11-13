/**
 * Customer-facing price helpers: always show GST-exclusive base + " + GST".
 * Special booking labels (Free / Included) are left unchanged.
 */

import { splitPriceByGstMode, type GstPricingMode } from './jobCardPricing';

export type CustomerPriceSource = {
  price?: string | number | null;
  price_display?: string | null;
  total_amount?: string | number | null;
  taxable_amount?: string | number | null;
  gst_amount?: string | number | null;
  gst_mode?: string | null;
  original_service_price?: string | number | null;
  final_payable_amount?: string | number | null;
  included_in_amc?: boolean | null;
  is_complaint_call?: boolean | null;
  booking_type?: string | null;
  service_items?: Array<{
    amount?: string | number | null;
    base_amount?: string | number | null;
    baseAmount?: string | number | null;
    taxableAmount?: string | number | null;
    taxable_amount?: string | number | null;
  }> | null;
};

const SPECIAL_LABELS = new Set([
  'Free (Complaint)',
  'Included in AMC',
  'Included in Service',
]);

function toMoney(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** Indian-style grouping without currency symbol. */
export function formatInrGrouped(amount: number): string {
  const value = Math.round((Number(amount) || 0) * 100) / 100;
  const negative = value < 0;
  const abs = Math.abs(value);
  const whole = Math.abs(abs - Math.round(abs)) < 0.005;
  if (whole) {
    return `${negative ? '-' : ''}${groupInrDigits(String(Math.round(abs)))}`;
  }
  const [left, right = ''] = abs.toFixed(2).replace(/0+$/, '').replace(/\.$/, '').split('.');
  const grouped = groupInrDigits(left);
  return `${negative ? '-' : ''}${grouped}${right ? `.${right}` : ''}`;
}

function groupInrDigits(digits: string): string {
  const raw = digits.replace(/\D/g, '') || '0';
  if (raw.length <= 3) return raw;
  const last3 = raw.slice(-3);
  let rest = raw.slice(0, -3);
  const chunks: string[] = [];
  while (rest.length > 0) {
    chunks.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  return `${chunks.join(',')},${last3}`;
}

export function resolveCustomerPriceBase(job: CustomerPriceSource): number {
  const taxable = toMoney(job.taxable_amount);
  if (taxable > 0) return taxable;

  const items = Array.isArray(job.service_items) ? job.service_items : [];
  let baseSum = 0;
  let foundBase = false;
  for (const item of items) {
    const base = toMoney(item.base_amount ?? item.baseAmount ?? item.taxableAmount ?? item.taxable_amount);
    if (base > 0) {
      foundBase = true;
      baseSum += base;
    }
  }
  if (foundBase && baseSum > 0) return Math.round(baseSum * 100) / 100;

  const price = toMoney(job.price);
  const finalPayable = toMoney(job.final_payable_amount);
  const gstAmount = toMoney(job.gst_amount);
  const original = toMoney(job.original_service_price);
  const mode = String(job.gst_mode || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const reference = finalPayable > 0 ? finalPayable : price;

  if (gstAmount > 0 && reference > 0) {
    return splitPriceByGstMode(reference, 'GST_INCLUSIVE').taxable;
  }

  if (
    (mode === 'GST_INCLUSIVE' || mode === 'INCLUSIVE' || mode === '') &&
    reference > 0 &&
    (finalPayable > 0 || original > 0)
  ) {
    return splitPriceByGstMode(reference, 'GST_INCLUSIVE').taxable;
  }

  if (mode === 'GST_EXCLUSIVE' || mode === 'EXCLUSIVE') {
    // Staff amount field is the agreed base (after discount).
    if (original > 0) return original;
    if (price > 0) return price;
  }

  return reference > 0 ? reference : toMoney(job.total_amount);
}

/** ``₹1,000 + GST`` (or plain special labels). */
export function formatCustomerPricePlusGst(
  jobOrBase: CustomerPriceSource | number | string | null | undefined,
  options?: { includeRupee?: boolean },
): string {
  const includeRupee = options?.includeRupee !== false;

  if (jobOrBase && typeof jobOrBase === 'object') {
    const display = String(jobOrBase.price_display || '').trim();
    if (SPECIAL_LABELS.has(display)) return display;
    if (
      jobOrBase.is_complaint_call ||
      String(jobOrBase.booking_type || '') === 'Complaint Call'
    ) {
      return 'Free (Complaint)';
    }
    if (jobOrBase.included_in_amc || String(jobOrBase.booking_type || '') === 'AMC Follow-up') {
      return 'Included in AMC';
    }
    const base = resolveCustomerPriceBase(jobOrBase);
    if (base <= 0) return includeRupee ? '₹0' : '0';
    const plain = `${formatInrGrouped(base)} + GST`;
    return includeRupee ? `₹${plain}` : plain;
  }

  const base = toMoney(jobOrBase);
  if (base <= 0) return includeRupee ? '₹0' : '0';
  const plain = `${formatInrGrouped(base)} + GST`;
  return includeRupee ? `₹${plain}` : plain;
}

/** Meta template param (body already has ₹): ``1,000 + GST``. */
export function formatWhatsAppAmountParam(job: CustomerPriceSource): string {
  return formatCustomerPricePlusGst(job, { includeRupee: false });
}

export function normalizeGstMode(value: unknown): GstPricingMode {
  const text = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (text === 'GST_EXCLUSIVE' || text === 'EXCLUSIVE') return 'GST_EXCLUSIVE';
  return 'GST_INCLUSIVE';
}

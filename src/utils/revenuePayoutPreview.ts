/**
 * Pure payout preview helpers for CRM Revenue Model v2.
 * Mirrors backend core/payout_engine split rules for UI estimates.
 */

export type RevenueEconomics = 'one_time' | 'amc' | 'contractual' | 'salaried';

export interface PayoutPreviewInput {
  billableAmount: number;
  technicianSharePercent?: number;
  plannedVisitCount?: number | null;
  maxCycle?: number | null;
  economics: RevenueEconomics;
  eligiblePartnerCount: number;
}

export interface PayoutPreviewResult {
  visitRevenue: number;
  technicianPool: number;
  companyShare: number;
  perPartnerShares: number[];
  held: boolean;
}

function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Deterministic paise split matching backend split_pool_equally. */
export function splitPoolEqually(pool: number, count: number): number[] {
  const quantized = roundMoney(pool);
  if (count <= 0) return [];
  if (count === 1) return [quantized];
  const base = Math.floor((quantized * 100) / count) / 100;
  const amounts = Array.from({ length: count }, () => base);
  let remainderPaise = Math.round((quantized - base * count) * 100);
  let i = 0;
  while (remainderPaise > 0 && i < count) {
    amounts[i] = roundMoney(amounts[i] + 0.01);
    remainderPaise -= 1;
    i += 1;
  }
  return amounts;
}

export function resolveVisitDivisor(plannedVisitCount?: number | null, maxCycle?: number | null): number {
  for (const candidate of [plannedVisitCount, maxCycle]) {
    if (candidate && Number(candidate) > 0) return Number(candidate);
  }
  return 1;
}

export function previewVisitPayout(input: PayoutPreviewInput): PayoutPreviewResult {
  const techPct = input.technicianSharePercent ?? 40;
  if (input.economics === 'salaried') {
    return {
      visitRevenue: 0,
      technicianPool: 0,
      companyShare: 0,
      perPartnerShares: [],
      held: false,
    };
  }

  const divisor =
    input.economics === 'one_time'
      ? 1
      : resolveVisitDivisor(input.plannedVisitCount, input.maxCycle);
  const visitRevenue = roundMoney(Number(input.billableAmount || 0) / divisor);
  const technicianPool = roundMoney((visitRevenue * techPct) / 100);
  const companyShare = roundMoney(visitRevenue - technicianPool);

  if (input.eligiblePartnerCount <= 0) {
    return {
      visitRevenue,
      technicianPool,
      companyShare,
      perPartnerShares: [],
      held: true,
    };
  }

  return {
    visitRevenue,
    technicianPool,
    companyShare,
    perPartnerShares: splitPoolEqually(technicianPool, input.eligiblePartnerCount),
    held: false,
  };
}

export function payoutStatusLabel(status?: string | null): string {
  switch (status) {
    case 'legacy_exempt':
      return 'Legacy — no 40/60';
    case 'not_applicable':
      return 'Not applicable';
    case 'pending':
      return 'Pending approval';
    case 'held':
      return 'Held — admin review';
    case 'approved':
      return 'Approved';
    case 'paid':
      return 'Paid';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status || '—';
  }
}

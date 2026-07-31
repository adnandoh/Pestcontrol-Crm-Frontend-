/**
 * Settlement period helpers for CRM Revenue Model v2 Phase 3.
 */

export type SettlementCadence = 'weekly' | 'monthly';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday-start week containing `ref`. */
export function defaultWeeklyPeriod(ref: Date = new Date()): { start: string; end: string } {
  const day = ref.getDay(); // 0 Sun … 6 Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(ref);
  start.setHours(0, 0, 0, 0);
  start.setDate(ref.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: formatISODate(start), end: formatISODate(end) };
}

export function defaultMonthlyPeriod(ref: Date = new Date()): { start: string; end: string } {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return { start: formatISODate(start), end: formatISODate(end) };
}

export function defaultPeriodForCadence(
  cadence: SettlementCadence,
  ref: Date = new Date(),
): { start: string; end: string } {
  return cadence === 'monthly' ? defaultMonthlyPeriod(ref) : defaultWeeklyPeriod(ref);
}

export function settlementStatusLabel(status?: string | null): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'pending_approval':
      return 'Pending approval';
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

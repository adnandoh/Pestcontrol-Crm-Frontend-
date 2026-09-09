import type { TechnicianType } from '../types';

/**
 * Labels and badge tones for the three technician types.
 *
 * Kept in one place because the type is shown on the Technicians list, the
 * ledger report and the job crew panel; before this, each rendered a binary
 * "Salaried or Partner" and a third type would have silently displayed as
 * "Partner".
 */
export const TECHNICIAN_TYPE_LABELS: Record<TechnicianType, string> = {
  partner: 'Partner',
  salaried: 'Salaried',
  secondary: 'Secondary',
};

const TECHNICIAN_TYPE_TONES: Record<TechnicianType, string> = {
  partner: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  salaried: 'bg-slate-50 text-slate-700 ring-slate-600/20',
  secondary: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

function normalize(value: string | null | undefined): TechnicianType {
  return value === 'salaried' || value === 'secondary' ? value : 'partner';
}

export function technicianTypeLabel(value: string | null | undefined): string {
  return TECHNICIAN_TYPE_LABELS[normalize(value)];
}

export function technicianTypeTone(value: string | null | undefined): string {
  return TECHNICIAN_TYPE_TONES[normalize(value)];
}

/** Secondary technicians are paid 40/60 exactly like partners. */
export function earnsRevenueShare(value: string | null | undefined): boolean {
  return normalize(value) !== 'salaried';
}

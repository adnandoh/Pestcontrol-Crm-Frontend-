import type { TechnicianStatus } from '../types';

/**
 * The three work statuses, their labels and their badge tones.
 *
 * This replaced a six-option dropdown that mixed desk decisions (on leave,
 * suspended) with live app presence (online, offline, busy, on service). The
 * runtime values are gone, so anything the API still hands back from an older
 * row normalizes to Active here rather than rendering a raw string.
 */
export const TECHNICIAN_STATUS_OPTIONS: {
  value: TechnicianStatus;
  label: string;
  hint: string;
}[] = [
  {
    value: 'active',
    label: 'Active',
    hint: 'Available for work and sees new bookings in the partner app.',
  },
  {
    value: 'on_leave',
    label: 'On Leave',
    hint: 'Temporarily away. No new bookings, and hidden from the assign list.',
  },
  {
    value: 'suspended',
    label: 'Suspended',
    hint: 'Blocked from working and hidden from the assign list.',
  },
];

const LABELS: Record<TechnicianStatus, string> = {
  active: 'Active',
  on_leave: 'On Leave',
  suspended: 'Suspended',
};

const TONES: Record<TechnicianStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  on_leave: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  suspended: 'bg-red-50 text-red-700 ring-red-600/20',
};

export function normalizeTechnicianStatus(
  value: string | null | undefined,
): TechnicianStatus {
  return value === 'on_leave' || value === 'suspended' ? value : 'active';
}

export function technicianStatusLabel(value: string | null | undefined): string {
  return LABELS[normalizeTechnicianStatus(value)];
}

export function technicianStatusTone(value: string | null | undefined): string {
  return TONES[normalizeTechnicianStatus(value)];
}

/** On leave and suspended both stop work reaching the technician. */
export function isTechnicianAvailable(value: string | null | undefined): boolean {
  return normalizeTechnicianStatus(value) === 'active';
}

/**
 * Whether desk staff may hand this technician a job.
 *
 * On-leave and suspended are both excluded: dispatch does not reach either, so
 * listing them in the assign popup or the crew panel would only invite a
 * booking that goes nowhere. Mirrors the backend's
 * `crm_assign_technicians_queryset`.
 */
export function isTechnicianAssignable(value: string | null | undefined): boolean {
  return isTechnicianAvailable(value);
}

/**
 * Whether this technician belongs in a read-only picker — the ledger report or
 * the complaint form. Looser than `isTechnicianAssignable` on purpose: you
 * still need to pull the ledger of someone who is merely away this week.
 * Suspended stays hidden, matching `?include_on_leave=1` on the API.
 */
export function isTechnicianListable(value: string | null | undefined): boolean {
  return normalizeTechnicianStatus(value) !== 'suspended';
}

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const IST = 'Asia/Kolkata';

export type DatePreset =
  | ''
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_15_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'custom';

export interface InquiryDateFilterState {
  preset: DatePreset;
  from: string;
  to: string;
}

export const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: '', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_15_days', label: 'Last 15 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export const EMPTY_DATE_FILTER: InquiryDateFilterState = {
  preset: '',
  from: '',
  to: '',
};

function fmt(date: dayjs.Dayjs): string {
  return date.tz(IST).format('YYYY-MM-DD');
}

/** Resolve a quick preset to inclusive from/to dates (YYYY-MM-DD, IST). */
export function resolveDatePreset(preset: DatePreset): { from: string; to: string } | null {
  if (!preset || preset === 'custom') return null;

  const today = dayjs().tz(IST).startOf('day');

  switch (preset) {
    case 'today':
      return { from: fmt(today), to: fmt(today) };
    case 'yesterday': {
      const y = today.subtract(1, 'day');
      return { from: fmt(y), to: fmt(y) };
    }
    case 'last_7_days':
      return { from: fmt(today.subtract(6, 'day')), to: fmt(today) };
    case 'last_15_days':
      return { from: fmt(today.subtract(14, 'day')), to: fmt(today) };
    case 'last_30_days':
      return { from: fmt(today.subtract(29, 'day')), to: fmt(today) };
    case 'this_month':
      return { from: fmt(today.startOf('month')), to: fmt(today) };
    case 'last_month': {
      const start = today.subtract(1, 'month').startOf('month');
      const end = today.subtract(1, 'month').endOf('month');
      return { from: fmt(start), to: fmt(end) };
    }
    case 'last_3_months':
      return { from: fmt(today.subtract(3, 'month').startOf('day')), to: fmt(today) };
    case 'last_6_months':
      return { from: fmt(today.subtract(6, 'month').startOf('day')), to: fmt(today) };
    case 'this_year':
      return { from: fmt(today.startOf('year')), to: fmt(today) };
    default:
      return null;
  }
}

/** Build API from/to params from filter state. */
export function dateFilterToApiParams(dateFilter: InquiryDateFilterState): { from?: string; to?: string } {
  if (dateFilter.preset && dateFilter.preset !== 'custom') {
    const resolved = resolveDatePreset(dateFilter.preset);
    if (resolved) return resolved;
  }
  if (dateFilter.from || dateFilter.to) {
    return {
      ...(dateFilter.from ? { from: dateFilter.from } : {}),
      ...(dateFilter.to ? { to: dateFilter.to } : {}),
    };
  }
  return {};
}

export function loadStoredDateFilter(storageKey: string): InquiryDateFilterState {
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return { ...EMPTY_DATE_FILTER };
    const parsed = JSON.parse(raw) as InquiryDateFilterState;
    return {
      preset: parsed.preset ?? '',
      from: parsed.from ?? '',
      to: parsed.to ?? '',
    };
  } catch {
    return { ...EMPTY_DATE_FILTER };
  }
}

export function saveStoredDateFilter(storageKey: string, state: InquiryDateFilterState): void {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

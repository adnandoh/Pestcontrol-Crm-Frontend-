export const DEEP_CLEANING_SERVICES = [
  'Full Home Deep Cleaning',
  'Kitchen Deep Cleaning',
  'Bathroom Deep Cleaning',
  'Sofa Cleaning',
  'Mattress Cleaning',
  'Carpet Cleaning',
  'Office Deep Cleaning',
] as const;

export const DEEP_CLEANING_CITIES = [
  'Mumbai',
  'Thane',
  'Navi Mumbai',
  'Pune',
  'Lonavala',
] as const;

export const DEEP_CLEANING_SIZES = ['1RK', '1BHK', '2BHK', '3BHK', '4BHK'] as const;

export const DEEP_CLEANING_TIMES = [
  '9 AM – 12 PM',
  '12 PM – 4 PM',
  '4 PM – 8 PM',
  'Discuss another time',
] as const;

export const DEEP_CLEANING_PRESENCE = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'suspended', label: 'Suspended' },
] as const;

export function deepCleaningApiError(err: unknown, fallback: string) {
  const data = (err as { response?: { data?: unknown }; message?: string })?.response?.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    return Object.entries(record)
      .map(([field, value]) => {
        const text = Array.isArray(value) ? value.join(' ') : String(value);
        return field === 'non_field_errors' || field === 'error' ? text : `${field}: ${text}`;
      })
      .join(' · ');
  }
  return (err as { message?: string })?.message || fallback;
}

export function formatDeepCleaningMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return `₹${amount.toLocaleString('en-IN')}`;
}

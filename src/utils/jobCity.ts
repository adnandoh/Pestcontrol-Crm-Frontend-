import type { JobCard } from '../types';

/** Extract master city id from list/detail API shapes. */
export function resolveJobCityId(job?: JobCard | null): number | undefined {
  const raw = job?.master_city;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object' && 'id' in raw) {
    const id = Number((raw as { id: number }).id);
    return Number.isFinite(id) ? id : undefined;
  }
  return undefined;
}

/** Fallback city label when master_city id is missing on list rows. */
export function resolveJobCityName(job?: JobCard | null): string | undefined {
  const name =
    job?.master_city_name ||
    job?.city ||
    undefined;
  const trimmed = (name || '').trim();
  return trimmed || undefined;
}

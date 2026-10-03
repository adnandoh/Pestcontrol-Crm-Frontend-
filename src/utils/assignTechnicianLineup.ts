import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const IST = 'Asia/Kolkata';

export interface AreaCity {
  name?: string | null;
  state_name?: string | null;
}

export interface AreaTechnician {
  service_cities?: AreaCity[] | null;
  service_area?: string | null;
  city?: string | null;
}

export interface BookingPlace {
  master_city_name?: string | null;
  city?: string | null;
  client_city?: string | null;
  master_location_name?: string | null;
  technician?: number | null;
  schedule_datetime?: string | null;
  time_slot?: string | null;
  service_timeline?: Array<{ technician_name?: string | null }> | null;
}

export interface AreaChip {
  label: string;
  matchesBooking: boolean;
}

function placeKey(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function splitAreaTokens(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,|/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function bookingCityLabel(job: BookingPlace | null | undefined): string {
  return String(job?.master_city_name || job?.city || job?.client_city || '').trim();
}

/** True when the technician serves the selected assign-filter city. */
export function technicianCoversCity(
  tech: AreaTechnician,
  cityFilter: string | null | undefined,
): boolean {
  const wanted = placeKey(String(cityFilter || ''));
  if (!wanted) return true;

  for (const chip of technicianAreaChips(tech)) {
    if (placeKey(chip.label) === wanted || placeKey(chip.label).includes(wanted) || wanted.includes(placeKey(chip.label))) {
      return true;
    }
  }
  return false;
}

export function bookingLocationLabel(job: BookingPlace | null | undefined): string {
  const location = String(job?.master_location_name || '').trim();
  const city = bookingCityLabel(job);
  if (!location) return '';
  if (placeKey(location) === placeKey(city)) return '';
  return location;
}

function bookingPlaceKeys(job: BookingPlace | null | undefined): Set<string> {
  const keys = new Set<string>();
  for (const raw of [bookingCityLabel(job), job?.master_city_name, job?.city, job?.client_city, job?.master_location_name]) {
    const key = placeKey(String(raw || ''));
    if (key) keys.add(key);
  }
  return keys;
}

/**
 * Every selected service area, one label each.
 * Structured cities win; free-text city / service_area is only a fallback.
 */
export function technicianAreaChips(
  tech: AreaTechnician,
  job?: BookingPlace | null,
): AreaChip[] {
  const seen = new Set<string>();
  const labels: string[] = [];
  const add = (raw: string) => {
    const label = raw.trim();
    const key = placeKey(label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    labels.push(label);
  };

  const cities = tech.service_cities || [];
  for (const city of cities) {
    if (city?.name) add(city.name);
  }
  if (!cities.length) {
    for (const token of [...splitAreaTokens(tech.city), ...splitAreaTokens(tech.service_area)]) {
      add(token);
    }
  }

  const places = bookingPlaceKeys(job);
  return labels.map((label) => ({
    label,
    matchesBooking: places.has(placeKey(label)),
  }));
}

export function formatLineupWhen(
  schedule?: string | null,
  timeSlot?: string | null,
): string {
  const slot = String(timeSlot || '').trim();
  if (!schedule) return slot || 'Time not set';
  const when = dayjs(schedule).tz(IST);
  if (!when.isValid()) return slot || 'Time not set';
  const clock = slot || when.format('hh:mm A');
  return `${when.format('DD MMM YYYY')} · ${clock}`;
}

export function formatLineupClock(
  schedule?: string | null,
  timeSlot?: string | null,
): string {
  const slot = String(timeSlot || '').trim();
  if (slot) return slot;
  if (!schedule) return 'Time not set';
  const when = dayjs(schedule).tz(IST);
  return when.isValid() ? when.format('hh:mm A') : 'Time not set';
}

/** Priority is the product name for partner technicians. */
export function lineupRoleLabel(technicianType?: string | null): string {
  if (technicianType === 'secondary') return 'Secondary';
  if (technicianType === 'salaried') return 'Salaried';
  return 'Priority';
}

export function technicianIsAssignedToBooking<
  T extends {
    id: number;
    name?: string | null;
    assigned_service_lines?: unknown[] | null;
  },
>(tech: T, job: BookingPlace | null | undefined): boolean {
  if (Array.isArray(tech.assigned_service_lines)) {
    return tech.assigned_service_lines.length > 0;
  }
  if (job?.technician != null && tech.id === job.technician) return true;
  const name = String(tech.name || '').trim().toLowerCase();
  if (!name || !job?.service_timeline?.length) return false;
  return job.service_timeline.some(
    (visit) => String(visit.technician_name || '').trim().toLowerCase() === name,
  );
}

export function splitAssignedTechnicians<
  T extends {
    id: number;
    name?: string | null;
    assigned_service_lines?: unknown[] | null;
  },
>(technicians: T[], job: BookingPlace | null | undefined): { assigned: T[]; unassigned: T[] } {
  const assigned: T[] = [];
  const unassigned: T[] = [];
  for (const tech of technicians) {
    if (technicianIsAssignedToBooking(tech, job)) assigned.push(tech);
    else unassigned.push(tech);
  }
  return { assigned, unassigned };
}

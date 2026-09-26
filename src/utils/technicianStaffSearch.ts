/** Fields the Assign Technician popup can match. */
export interface StaffSearchable {
  name?: string | null;
  mobile?: string | null;
  phone?: string | null;
  alternative_mobile?: string | null;
  base_services?: string[] | null;
  skills?: string[] | null;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function serviceLabels(tech: StaffSearchable): string[] {
  if (tech.base_services?.length) return tech.base_services;
  if (tech.skills?.length) return tech.skills;
  return [];
}

/**
 * Assign Technician staff search.
 * Name and base-service text match the raw query (case-insensitive, partial).
 * Mobile matches only when the query contains digits, against mobile, phone,
 * or alternative mobile with formatting stripped.
 *
 * A letter-only query must not use `includes("")` on the phone — that is true
 * for every number, so name search used to leave the full list visible.
 */
export function technicianMatchesStaffSearch(
  tech: StaffSearchable,
  searchQuery: string,
): boolean {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;

  const name = String(tech.name || '').toLowerCase();
  const services = serviceLabels(tech).join(' ').toLowerCase();
  const queryDigits = digitsOnly(q);
  const mobiles = [tech.mobile, tech.phone, tech.alternative_mobile]
    .map((value) => digitsOnly(String(value || '')))
    .filter(Boolean);

  const nameMatch = name.includes(q);
  const serviceMatch = services.includes(q);
  const mobileMatch =
    queryDigits.length > 0 && mobiles.some((mobile) => mobile.includes(queryDigits));

  return nameMatch || mobileMatch || serviceMatch;
}

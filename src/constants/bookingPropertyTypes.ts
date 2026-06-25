/** PRD property types — required before service selection on Create Booking */
export const BOOKING_PROPERTY_TYPES = [
  'Society',
  'Hotel',
  'Office',
  'Bungalow',
  'Villa',
  'School',
  'Warehouse',
  'Factory',
  'Shop',
  'Restaurant',
] as const;

export type BookingPropertyType = (typeof BOOKING_PROPERTY_TYPES)[number];

/** Residential home bookings — no commercial property-type picker. */
export const RESIDENTIAL_PROPERTY_TYPE = 'Home / Flat';

export function isResidentialCommercialType(commercialType: string): boolean {
  return commercialType === 'home';
}

export function requiresCommercialPropertyType(commercialType: string): boolean {
  return !isResidentialCommercialType(commercialType);
}

/** Map PRD property type → backend commercial_type (pricing / reports). */
export function commercialTypeFromPropertyType(
  propertyType: string,
): 'hotel' | 'society' | 'villa' | 'office' | 'other' {
  switch (propertyType) {
    case 'Society':
      return 'society';
    case 'Hotel':
      return 'hotel';
    case 'Office':
      return 'office';
    case 'Villa':
    case 'Bungalow':
      return 'villa';
    default:
      return 'other';
  }
}

export type BookingKind = 'home' | 'commercial';

export function bookingKindFromCommercialType(commercialType: string): BookingKind {
  return commercialType === 'home' ? 'home' : 'commercial';
}

/** Months between AMC visits (PRD). */
export const AMC_INTERVAL_LABELS: Record<number, string> = {
  3: 'Every 4 Months',
  4: 'Every 3 Months',
  6: 'Every 2 Months',
  12: 'Every Month',
};

export const AMC_PACKAGE_VALUES = [
  'AMC 3 Services',
  'AMC 4 Services',
  'AMC 6 Services',
  'AMC 12 Services',
] as const;

/** Services that support AMC packages (plus one-time where noted). */
export const SERVICE_AMC_PACKAGES: Record<string, number[]> = {
  'Cockroach / Ants': [3, 4, 6],
  Rodent: [3, 4, 6, 12],
  Mosquito: [3, 4, 6, 12],
};

export function supportsAmcMode(service: string): boolean {
  return service in SERVICE_AMC_PACKAGES;
}

export function isTermiteService(service: string): boolean {
  return service.toLowerCase().includes('termite');
}

export function isBedBugService(service: string): boolean {
  const s = service.toLowerCase();
  return s.includes('bed bug') || s.includes('bedbug');
}

/** Stored plan value for one-time booking per service. */
export function oneTimePlanValue(service: string): string {
  if (isTermiteService(service)) return 'One Time Treatment';
  return 'One Time Service';
}

export function amcPlanValue(count: number): string {
  return `AMC ${count} Services`;
}

export function parseAmcCountFromPlan(plan: string): number | null {
  const m = (plan || '').toLowerCase().match(/(\d+)\s*service/);
  return m ? Number(m[1]) : null;
}

export function isAmcPlan(plan: string): boolean {
  return parseAmcCountFromPlan(plan) !== null;
}

/** All plan values to store in service_items.plan */
export function getAllPlanValuesForService(service: string): string[] {
  if (isBedBugService(service)) return [oneTimePlanValue(service)];
  if (isTermiteService(service)) return [oneTimePlanValue(service)];
  const counts = SERVICE_AMC_PACKAGES[service];
  if (!counts) return [oneTimePlanValue(service)];
  return [oneTimePlanValue(service), ...counts.map(amcPlanValue)];
}

/** Human label for dropdowns. */
export function formatPlanLabel(service: string, plan: string): string {
  if (isTermiteService(service) && plan.toLowerCase().includes('one time')) {
    return 'One Time Treatment — includes 4 free check-ups over 2 years';
  }
  const count = parseAmcCountFromPlan(plan);
  if (count) {
    const interval = AMC_INTERVAL_LABELS[count] || '';
    const svc = service.includes('Cockroach') ? 'General Pest / Cockroach' : service;
    return `AMC ${count} Services — ${interval} (${svc})`;
  }
  if (plan.toLowerCase().includes('one time')) return 'One Time Service';
  return plan;
}

export function getAmcPackageOptions(service: string): Array<{ value: string; label: string }> {
  const counts = SERVICE_AMC_PACKAGES[service] || [];
  return counts.map((n) => ({
    value: amcPlanValue(n),
    label: formatPlanLabel(service, amcPlanValue(n)),
  }));
}

/** @deprecated use getAllPlanValuesForService */
export function getServiceTypeOptions(service: string): string[] {
  return getAllPlanValuesForService(service);
}

export const AMC_PACKAGES_BY_SERVICE = SERVICE_AMC_PACKAGES;

export function supportsAmcForService(service: string): boolean {
  return supportsAmcMode(service);
}

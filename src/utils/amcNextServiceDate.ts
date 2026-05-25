import dayjs from 'dayjs';

/** CRM pricing plan label for cockroach AMC (3 visits). */
export const AMC_PRICING_TYPE = 'AMC 3 Services';

export function isAmcPlan(pricingType: string, serviceCategory?: string): boolean {
  if (serviceCategory === 'AMC') return true;
  if (!pricingType) return false;
  const t = pricingType.toLowerCase();
  return t === AMC_PRICING_TYPE.toLowerCase() || t.includes('amc');
}

/**
 * Compute next service date for Create/Edit job card forms.
 * Matches backend JobCardService.calculate_next_service_date rules.
 */
export function computeNextServiceDate(params: {
  scheduleDate: string;
  selectedPackages: string[];
  pricingType: string;
  serviceCategory?: string;
}): string | null {
  const { scheduleDate, selectedPackages, pricingType, serviceCategory } = params;
  if (!scheduleDate?.trim()) return null;

  const schedule = dayjs(scheduleDate);
  if (!schedule.isValid()) return null;

  const labels = selectedPackages.join(' ').toLowerCase();
  const isCockroach = labels.includes('cockroach');
  const isBedBug = labels.includes('bed bug') || labels.includes('bedbug');
  const isAmc = isAmcPlan(pricingType, serviceCategory);

  if (isCockroach && isAmc) {
    return schedule.add(4, 'month').format('YYYY-MM-DD');
  }
  if (isBedBug) {
    return schedule.add(15, 'day').format('YYYY-MM-DD');
  }
  return null;
}

export function shouldShowNextServiceField(
  selectedPackages: string[],
  pricingType: string,
  serviceCategory?: string,
): boolean {
  const labels = selectedPackages.join(' ').toLowerCase();
  const isCockroach = labels.includes('cockroach');
  const isBedBug = labels.includes('bed bug') || labels.includes('bedbug');
  return (isCockroach && isAmcPlan(pricingType, serviceCategory)) || isBedBug;
}

export function nextServiceDateHint(
  selectedPackages: string[],
  pricingType: string,
  serviceCategory?: string,
): string {
  const labels = selectedPackages.join(' ').toLowerCase();
  if (labels.includes('cockroach') && isAmcPlan(pricingType, serviceCategory)) {
    return 'Every 4 months for AMC';
  }
  return 'After 15 days for Bed Bug';
}

import dayjs from 'dayjs';
import type { ServiceItemConfig } from './jobCardPricing';

/** CRM pricing plan label for cockroach AMC (3 visits). */
export const AMC_PRICING_TYPE = 'AMC 3 Services';

export function isAmcPlan(pricingType: string, serviceCategory?: string): boolean {
  if (serviceCategory === 'AMC') return true;
  if (!pricingType) return false;
  const t = pricingType.toLowerCase();
  return t === AMC_PRICING_TYPE.toLowerCase() || t.includes('amc');
}

function itemIsCockroachAmc(item: Pick<ServiceItemConfig, 'service' | 'plan'>): boolean {
  const service = item.service.toLowerCase();
  const plan = item.plan.toLowerCase();
  return (service.includes('cockroach') || service.includes('ants')) && plan.includes('amc');
}

function itemIsBedBug(item: Pick<ServiceItemConfig, 'service'>): boolean {
  const service = item.service.toLowerCase();
  return service.includes('bed bug') || service.includes('bedbug');
}

/**
 * Compute next service date for Create/Edit job card forms.
 * Matches backend JobCardService.calculate_next_service_date rules.
 */
export function computeNextServiceDate(params: {
  scheduleDate: string;
  selectedPackages?: string[];
  pricingType?: string;
  serviceCategory?: string;
  serviceItems?: Array<Pick<ServiceItemConfig, 'service' | 'plan'>>;
}): string | null {
  const { scheduleDate, selectedPackages = [], pricingType = '', serviceCategory, serviceItems } = params;
  if (!scheduleDate?.trim()) return null;

  const schedule = dayjs(scheduleDate);
  if (!schedule.isValid()) return null;

  if (serviceItems?.length) {
    if (serviceItems.some(itemIsCockroachAmc)) {
      return schedule.add(4, 'month').format('YYYY-MM-DD');
    }
    if (serviceItems.some(itemIsBedBug)) {
      return schedule.add(15, 'day').format('YYYY-MM-DD');
    }
    return null;
  }

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
  serviceItems?: Array<Pick<ServiceItemConfig, 'service' | 'plan'>>,
): boolean {
  if (serviceItems?.length) {
    return serviceItems.some(itemIsCockroachAmc) || serviceItems.some(itemIsBedBug);
  }
  const labels = selectedPackages.join(' ').toLowerCase();
  const isCockroach = labels.includes('cockroach');
  const isBedBug = labels.includes('bed bug') || labels.includes('bedbug');
  return (isCockroach && isAmcPlan(pricingType, serviceCategory)) || isBedBug;
}

export function nextServiceDateHint(
  selectedPackages: string[],
  pricingType: string,
  serviceCategory?: string,
  serviceItems?: Array<Pick<ServiceItemConfig, 'service' | 'plan'>>,
): string {
  if (serviceItems?.some(itemIsCockroachAmc)) {
    return 'Every 4 months for AMC';
  }
  const labels = selectedPackages.join(' ').toLowerCase();
  if (labels.includes('cockroach') && isAmcPlan(pricingType, serviceCategory)) {
    return 'Every 4 months for AMC';
  }
  return 'After 15 days for Bed Bug';
}

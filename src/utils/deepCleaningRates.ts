import type { DeepCleaningRate } from '../types';

export interface DeepCleaningRateChoice {
  segment: string;
  service: string;
  propertySize: string;
  propertyType: string;
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function packageMatchesSize(packageName: string, propertySize: string) {
  const size = compact(propertySize);
  if (!size) return false;
  return compact(packageName).includes(size);
}

export function ratesForBooking(
  rates: DeepCleaningRate[],
  choice: DeepCleaningRateChoice,
): DeepCleaningRate[] {
  const sameService = rates.filter(
    (rate) => rate.is_active && rate.segment === choice.segment && rate.service === choice.service,
  );
  const sized = sameService.filter((rate) => packageMatchesSize(rate.package_name, choice.propertySize));
  return sized.length ? sized : sameService;
}

export function bestDeepCleaningRate(
  rates: DeepCleaningRate[],
  choice: DeepCleaningRateChoice,
): DeepCleaningRate | null {
  const sized = rates.filter(
    (rate) =>
      rate.is_active
      && rate.segment === choice.segment
      && rate.service === choice.service
      && packageMatchesSize(rate.package_name, choice.propertySize),
  );
  if (!sized.length) return null;
  const condition = compact(choice.propertyType);
  return sized.find((rate) => condition && compact(rate.package_name).includes(condition)) || sized[0];
}

export function deepCleaningRateAmount(rate: DeepCleaningRate) {
  const amount = String(rate.job_amount ?? '').trim();
  return amount;
}

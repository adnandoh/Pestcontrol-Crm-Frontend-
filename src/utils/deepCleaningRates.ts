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

function homeTier(packageName: string) {
  const name = compact(packageName);
  if (name.includes('standard')) return 0;
  if (name.includes('premium')) return 1;
  return 2;
}

function preferCurrentHomePackages(rates: DeepCleaningRate[], service: string) {
  if (service !== 'Full Home Deep Cleaning') return rates;
  const tiered = rates.filter((rate) => homeTier(rate.package_name) < 2);
  if (!tiered.length) return rates;
  return [...tiered].sort((left, right) => homeTier(left.package_name) - homeTier(right.package_name));
}

export function ratesForBooking(
  rates: DeepCleaningRate[],
  choice: DeepCleaningRateChoice,
): DeepCleaningRate[] {
  const sameService = rates.filter(
    (rate) => rate.is_active && rate.segment === choice.segment && rate.service === choice.service,
  );
  const sized = sameService.filter((rate) => packageMatchesSize(rate.package_name, choice.propertySize));
  return preferCurrentHomePackages(sized.length ? sized : sameService, choice.service);
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
  const current = preferCurrentHomePackages(sized, choice.service);
  const condition = compact(choice.propertyType);
  return current.find((rate) => condition && compact(rate.package_name).includes(condition)) || current[0];
}

export function deepCleaningRateAmount(rate: DeepCleaningRate) {
  const amount = String(rate.job_amount ?? '').trim();
  return amount;
}

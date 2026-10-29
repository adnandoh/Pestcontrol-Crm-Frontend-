import { describe, expect, it } from 'vitest';
import type { DeepCleaningRate } from '../types';
import { bestDeepCleaningRate, ratesForBooking } from './deepCleaningRates';

function rate(partial: Partial<DeepCleaningRate> & Pick<DeepCleaningRate, 'code' | 'package_name'>): DeepCleaningRate {
  return {
    id: partial.code.length,
    segment: 'Residential',
    service: 'Full Home Deep Cleaning',
    billing_unit: 'job',
    example_qty: 1,
    rate_per_unit: 0,
    min_charge: 0,
    job_amount: 3499,
    technicians: 2,
    on_site_hours: '6',
    scope_note: '',
    amc_visits: 0,
    amc_discount: 0,
    amc_per_visit: 0,
    amc_annual: 0,
    amc_interval: '',
    is_active: true,
    sort_order: 1,
    ...partial,
  };
}

const rates = [
  rate({ code: 'R1', package_name: 'Furnished 1BHK up to 600 sq ft', job_amount: 3499 }),
  rate({ code: 'R2', package_name: 'Empty 1BHK up to 600 sq ft', job_amount: 2999 }),
  rate({ code: 'R3', package_name: 'Furnished 2BHK up to 900 sq ft', job_amount: 4999 }),
  rate({ code: 'S1', service: 'Sofa Cleaning', package_name: '3 seater', job_amount: 999 }),
];

describe('deep cleaning rate selection', () => {
  it('picks the furnished 1BHK rate for that size and condition', () => {
    const match = bestDeepCleaningRate(rates, {
      segment: 'Residential',
      service: 'Full Home Deep Cleaning',
      propertySize: '1BHK',
      propertyType: 'Furnished',
    });
    expect(match?.code).toBe('R1');
    expect(match?.job_amount).toBe(3499);
  });

  it('does not use a 2BHK rate for 1BHK', () => {
    const shown = ratesForBooking(rates, {
      segment: 'Residential',
      service: 'Full Home Deep Cleaning',
      propertySize: '1BHK',
      propertyType: 'Furnished',
    }).map((row) => row.code);
    expect(shown).toEqual(['R1', 'R2']);
  });

  it('uses the Diwali Standard rate and leaves the old furnished 2BHK out', () => {
    const diwali = [
      rate({ code: '4999', package_name: 'Furnished 2BHK up to 900 sq ft', job_amount: 5000, sort_order: 3 }),
      rate({ code: 'H15', package_name: 'Furnished 2BHK Premium up to 900 sq ft', job_amount: 14000, sort_order: 15 }),
      rate({ code: 'H13', package_name: 'Furnished 2BHK Standard up to 900 sq ft', job_amount: 6000, sort_order: 13 }),
      rate({ code: 'H14', package_name: 'Empty 2BHK Standard up to 900 sq ft', job_amount: 5000, sort_order: 14 }),
    ];
    const choice = {
      segment: 'Residential',
      service: 'Full Home Deep Cleaning',
      propertySize: '2BHK',
      propertyType: 'Furnished',
    };
    expect(bestDeepCleaningRate(diwali, choice)?.code).toBe('H13');
    expect(ratesForBooking(diwali, choice).map((row) => row.code)).toEqual(['H13', 'H14', 'H15']);
  });

  it('shows the service rates when the package is not sized by BHK', () => {
    const shown = ratesForBooking(rates, {
      segment: 'Residential',
      service: 'Sofa Cleaning',
      propertySize: '2BHK',
      propertyType: 'Furnished',
    }).map((row) => row.code);
    expect(shown).toEqual(['S1']);
    expect(bestDeepCleaningRate(rates, {
      segment: 'Residential',
      service: 'Sofa Cleaning',
      propertySize: '2BHK',
      propertyType: 'Furnished',
    })).toBeNull();
  });
});

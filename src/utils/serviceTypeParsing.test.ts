import { describe, it, expect } from 'vitest';
import {
  parsePackagesFromServiceType,
  type PricingConfig,
} from './jobCardPricing';

/**
 * The booking forms build their service checkboxes from Pricing Master, so
 * service_type can hold names the hardcoded pre-2026 list never knew about.
 * Reopening such a booking must not clear its services.
 */
const config2026 = {
  region: 'mumbai',
  city: 'Mumbai',
  pricing: {
    'Cockroach Premium': { 'One Time Service': { '2 BHK': 4000 } },
    'Integrated IPM': { '4 Visits/Month': { 'Up to 5,000 Sq.Ft.': 12000 } },
  },
  service_types: {},
  residential_locations: [],
  villa_locations: [],
  rodent_locations: [],
  source: 'database',
} as unknown as PricingConfig;

describe('parsePackagesFromServiceType', () => {
  it('returns nothing for empty input', () => {
    expect(parsePackagesFromServiceType('')).toEqual([]);
    expect(parsePackagesFromServiceType('   ')).toEqual([]);
  });

  it('still matches the legacy package labels', () => {
    expect(parsePackagesFromServiceType('Termite, Rodent')).toEqual([
      'Termite',
      'Rodent',
    ]);
  });

  it('still infers packages from legacy pest names', () => {
    expect(parsePackagesFromServiceType('Cockroach, Ants')).toEqual([
      'Cockroach / Ants',
    ]);
  });

  it('recognises Pricing Master services when given the live config', () => {
    expect(
      parsePackagesFromServiceType('Cockroach Premium, Integrated IPM', config2026),
    ).toEqual(['Cockroach Premium', 'Integrated IPM']);
  });

  it('keeps unknown service labels when no config is loaded yet', () => {
    // The edit screen parses service_type before the pricing config arrives.
    // Dropping these would wipe the booking's services on the next save.
    expect(parsePackagesFromServiceType('Cockroach Premium')).toEqual([
      'Cockroach Premium',
    ]);
  });

  it('prefers exact package matches over the raw fallback', () => {
    expect(
      parsePackagesFromServiceType('Bed Bugs, Something Unmapped', config2026),
    ).toEqual(['Bed Bugs']);
  });
});

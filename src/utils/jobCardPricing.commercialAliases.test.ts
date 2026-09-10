import { describe, expect, it } from 'vitest';
import {
  filterAreasForCommercialType,
  getAreaOptions,
  getUnitPrice,
  resolvePricingService,
  supportsAutoPricing,
  validateServiceConfigs,
  type PricingConfig,
} from './jobCardPricing';

/**
 * Trimmed 2026 Pricing Master payload: residential + hotel cockroach rates,
 * corporate IPM for offices. Mirrors what commercial edit/create must resolve.
 */
const CONFIG: PricingConfig = {
  region: 'mumbai',
  city: 'Mumbai',
  source: 'database',
  residential_locations: ['1 BHK', '2 BHK'],
  villa_locations: [],
  rodent_locations: [],
  service_types: {},
  pricing: {
    'Cockroach Standard': {
      'One Time Service': {
        '1 BHK': 1475,
        '2 BHK': 1888,
        'Hotel - 1-10 rooms': 2950,
        'Hotel - 11-20 rooms': 4956,
      },
      'AMC 3 Services': {
        '1 BHK': 2950,
        '2 BHK': 3540,
      },
    },
    'Bed Bugs': {
      'One Time Service': {
        '2 BHK': 3304,
        'Hotel - Minimum 3 affected rooms': 2360,
      },
    },
    'Integrated IPM': {
      'One Time Service': {
        'Corporate Office / Bank - Small': 2124,
        'Retail Outlet - Small': 2596,
      },
    },
  },
  rate_gst: {
    'Cockroach Standard': {
      'One Time Service': {
        '1 BHK': {
          amount: '1250',
          gst_percent: '18',
          price_includes_gst: false,
          base_amount: '1250',
          gst_amount: '225',
          total_with_gst: '1475',
          property_category: 'residential',
        },
        '2 BHK': {
          amount: '1600',
          gst_percent: '18',
          price_includes_gst: false,
          base_amount: '1600',
          gst_amount: '288',
          total_with_gst: '1888',
          property_category: 'residential',
        },
        'Hotel - 1-10 rooms': {
          amount: '2500',
          gst_percent: '18',
          price_includes_gst: false,
          base_amount: '2500',
          gst_amount: '450',
          total_with_gst: '2950',
          property_category: 'hotel',
        },
        'Hotel - 11-20 rooms': {
          amount: '4200',
          gst_percent: '18',
          price_includes_gst: false,
          base_amount: '4200',
          gst_amount: '756',
          total_with_gst: '4956',
          property_category: 'hotel',
        },
      },
    },
    'Bed Bugs': {
      'One Time Service': {
        '2 BHK': {
          amount: '2800',
          gst_percent: '18',
          price_includes_gst: false,
          base_amount: '2800',
          gst_amount: '504',
          total_with_gst: '3304',
          property_category: 'residential',
        },
        'Hotel - Minimum 3 affected rooms': {
          amount: '2000',
          gst_percent: '18',
          price_includes_gst: false,
          base_amount: '2000',
          gst_amount: '360',
          total_with_gst: '2360',
          property_category: 'hotel',
        },
      },
    },
    'Integrated IPM': {
      'One Time Service': {
        'Corporate Office / Bank - Small': {
          amount: '1800',
          gst_percent: '18',
          price_includes_gst: false,
          base_amount: '1800',
          gst_amount: '324',
          total_with_gst: '2124',
          property_category: 'corporate',
        },
        'Retail Outlet - Small': {
          amount: '2200',
          gst_percent: '18',
          price_includes_gst: false,
          base_amount: '2200',
          gst_amount: '396',
          total_with_gst: '2596',
          property_category: 'corporate',
        },
      },
    },
  },
};

describe('commercial per-service pricing aliases', () => {
  it('maps legacy Cockroach / Ants onto Cockroach Standard', () => {
    expect(resolvePricingService('Cockroach / Ants', CONFIG)).toBe('Cockroach Standard');
  });

  it('looks up hotel rates for legacy Cockroach / Ants without inventing prices', () => {
    expect(
      getUnitPrice('Cockroach / Ants', 'One Time Service', 'Hotel - 1-10 rooms', CONFIG),
    ).toBe(2950);
  });

  it('offers hotel chart areas for commercial hotel, not BHK', () => {
    const areas = getAreaOptions(['Cockroach / Ants', 'Bed Bugs'], CONFIG, 'hotel');
    expect(areas).toContain('Hotel - 1-10 rooms');
    expect(areas).toContain('Hotel - Minimum 3 affected rooms');
    expect(areas).not.toContain('1 BHK');
    expect(areas).not.toContain('2 BHK');
    expect(areas).not.toContain('Commercial');
  });

  it('offers corporate chart areas for office Integrated IPM', () => {
    const areas = getAreaOptions(['Integrated IPM'], CONFIG, 'office');
    expect(areas).toEqual(
      expect.arrayContaining([
        'Corporate Office / Bank - Small',
        'Retail Outlet - Small',
      ]),
    );
  });

  it('filters by property_category from rate_gst', () => {
    const raw = ['1 BHK', 'Hotel - 1-10 rooms', 'Corporate Office / Bank - Small'];
    expect(
      filterAreasForCommercialType(raw, 'hotel', 'Cockroach Standard', CONFIG),
    ).toEqual(['Hotel - 1-10 rooms']);
  });

  it('enables auto pricing UI for commercial when config is from Pricing Master', () => {
    expect(supportsAutoPricing('hotel', CONFIG)).toBe(true);
    expect(supportsAutoPricing('office', CONFIG)).toBe(true);
    expect(supportsAutoPricing('other', CONFIG)).toBe(true);
  });

  it('validates multi-service commercial configs without rate-not-found', () => {
    const errors = validateServiceConfigs(
      ['Cockroach / Ants', 'Bed Bugs'],
      {
        'Cockroach / Ants': { plan: 'One Time Service', area: 'Hotel - 1-10 rooms' },
        'Bed Bugs': { plan: 'One Time Service', area: 'Hotel - Minimum 3 affected rooms' },
      },
      CONFIG,
    );
    expect(errors).toEqual([]);
  });

  it('still reports missing area the same way Home does', () => {
    const errors = validateServiceConfigs(
      ['Cockroach Standard'],
      { 'Cockroach Standard': { plan: 'One Time Service', area: '' } },
      CONFIG,
    );
    expect(errors).toEqual(['Cockroach Standard: select an area.']);
  });
});

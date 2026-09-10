import { describe, expect, it } from 'vitest';
import {
  amcPlanOptionsForService,
  getDefaultPlanForService,
  oneTimePlanForService,
  serviceSupportsAmc,
  type PricingConfig,
} from './jobCardPricing';
import { formatPlanLabel } from '../constants/bookingPropertyTypes';

/**
 * Trimmed copy of a real `/api/pricing-config/` payload for Mumbai, with the
 * plan keys exactly as the 2026 rate chart stores them.
 */
const CONFIG: PricingConfig = {
  region: 'mumbai',
  city: 'Mumbai',
  source: 'database',
  residential_locations: ['1 RK', '1 BHK', '2 BHK'],
  villa_locations: [],
  rodent_locations: [],
  service_types: {},
  pricing: {
    'Cockroach Standard': {
      'One Time Service': { '1 BHK': 1475, '1 RK': 1062 },
      'AMC 3 Services': { '1 BHK': 2950, '1 RK': 2360 },
    },
    'Cockroach Premium': {
      'One Time Service': { '1 BHK': 1888, '1 RK': 1416 },
      'AMC 3 Services': { '1 BHK': 3894, '1 RK': 3068 },
    },
    'Bed Bugs': {
      'One Time Service': { 'Single Room': 2006 },
    },
    'Termite Spot Treatment': {
      'One Time Service': { Windows: 3540 },
    },
    'Integrated IPM': {
      'One Time Service': { Small: 10620 },
      '4 Visits/Month': { Small: 8496 },
      'Monthly AMC - 1 Visit/Month': { Small: 4248 },
      'Weekly AMC - 4 Visits/Month': { Small: 12744 },
    },
    // A service the rate card does not cover, priced by hand.
    'Legacy Only Service': {},
  },
};

describe('amcPlanOptionsForService', () => {
  it('offers AMC for Cockroach Standard', () => {
    // The regression: SERVICE MODE only listed One Time Service because the
    // AMC gate was a hardcoded map of pre-2026 names.
    expect(amcPlanOptionsForService('Cockroach Standard', CONFIG).map((o) => o.value)).toEqual([
      'AMC 3 Services',
    ]);
  });

  it('offers AMC for Cockroach Premium', () => {
    expect(amcPlanOptionsForService('Cockroach Premium', CONFIG).map((o) => o.value)).toEqual([
      'AMC 3 Services',
    ]);
  });

  it('reports AMC support for both tiers', () => {
    expect(serviceSupportsAmc('Cockroach Standard', CONFIG)).toBe(true);
    expect(serviceSupportsAmc('Cockroach Premium', CONFIG)).toBe(true);
  });

  it('offers no AMC for a service the rate card prices one-time only', () => {
    expect(serviceSupportsAmc('Bed Bugs', CONFIG)).toBe(false);
    expect(serviceSupportsAmc('Termite Spot Treatment', CONFIG)).toBe(false);
  });

  it('picks up named contract AMC plans and leaves plain visit plans alone', () => {
    // "4 Visits/Month" is a frequency, not an AMC, and must stay under one-time.
    // Ordered by visits per year, so monthly (12) comes before weekly (52),
    // matching how AMC 3 sorts ahead of AMC 12.
    expect(amcPlanOptionsForService('Integrated IPM', CONFIG).map((o) => o.value)).toEqual([
      'Monthly AMC - 1 Visit/Month',
      'Weekly AMC - 4 Visits/Month',
    ]);
  });

  it('labels a contract plan with its own name, not an invented visit count', () => {
    const labels = amcPlanOptionsForService('Integrated IPM', CONFIG).map((o) => o.label);
    expect(labels).toContain('Monthly AMC - 1 Visit/Month');
    expect(labels.join(' ')).not.toContain('AMC 12 Services');
  });

  it('maps legacy Cockroach / Ants onto the chart service AMC plans', () => {
    expect(amcPlanOptionsForService('Cockroach / Ants', CONFIG).map((o) => o.value)).toEqual([
      'AMC 3 Services',
    ]);
  });

  it('falls back to the hardcoded packages for a service outside the rate card', () => {
    // Mosquito is absent from this trimmed config and does not alias onto a
    // priced package here, so the pre-2026 AMC list remains the fallback.
    const values = amcPlanOptionsForService('Mosquito', CONFIG).map((o) => o.value);
    expect(values).toEqual([
      'AMC 3 Services',
      'AMC 4 Services',
      'AMC 6 Services',
      'AMC 12 Services',
      'AMC 24 Services',
      'AMC 48 Services',
    ]);
  });

  it('offers nothing for an unknown service absent from both sources', () => {
    expect(amcPlanOptionsForService('Nonexistent Service', CONFIG)).toEqual([]);
  });
});

describe('formatPlanLabel', () => {
  it('no longer calls a Cockroach AMC "General Pest Control"', () => {
    // General Pest Control became a separate service in the 2026 chart, so the
    // old suffix named a different service than the one being priced.
    const label = formatPlanLabel('Cockroach Premium', 'AMC 3 Services');
    expect(label).toBe('AMC 3 Services — Every 4 Months');
    expect(label).not.toContain('General Pest Control');
  });

  it('keeps the interval hint for the canonical AMC form', () => {
    expect(formatPlanLabel('Rodent', 'AMC 12 Services')).toBe('AMC 12 Services — Every Month');
  });

  it('passes a named contract cadence through untouched', () => {
    expect(formatPlanLabel('Integrated IPM', 'Weekly AMC - 4 Visits/Month')).toBe(
      'Weekly AMC - 4 Visits/Month',
    );
  });
});

describe('oneTimePlanForService', () => {
  it('uses One Time Service where the rate card has one', () => {
    expect(oneTimePlanForService('Cockroach Premium', CONFIG)).toBe('One Time Service');
  });

  it('keeps termite on its own one-time wording', () => {
    expect(oneTimePlanForService('Termite Spot Treatment', CONFIG)).toBe('One Time Service');
  });

  it('falls back to a real plan when the service has no one-time rate', () => {
    const recurringOnly: PricingConfig = {
      ...CONFIG,
      pricing: { 'Contract Only': { '4 Visits/Month': { Small: 100 } } },
    };
    expect(oneTimePlanForService('Contract Only', recurringOnly)).toBe('4 Visits/Month');
  });

  it('selecting a service defaults to one-time, never AMC', () => {
    expect(getDefaultPlanForService('Cockroach Premium', CONFIG)).toBe('One Time Service');
    expect(getDefaultPlanForService('Cockroach Standard', CONFIG)).toBe('One Time Service');
  });
});

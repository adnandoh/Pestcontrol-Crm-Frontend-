import { describe, expect, it } from 'vitest';
import { buildPlanGroups, planGroupOf } from './pricingPlanGroups';

/** Every plan_type value actually stored by the 2026 rate card import. */
const REAL_PLAN_TYPES = [
  'One Time Service',
  'AMC 3 Services',
  '4 Visits/Month',
  'Bi-monthly - 6 Visits',
  'Quarterly - 3 Visits',
  'Monthly - 12 Visits',
  '8 Visits/Month',
  '12 Visits/Month',
  'Add-On',
  'Fortnightly AMC - 2 Visits/Month',
  'Weekly AMC - 4 Visits/Month',
  'Monthly AMC - 1 Visit/Month',
];

describe('planGroupOf', () => {
  it('puts the one-time plan in its own group', () => {
    expect(planGroupOf('One Time Service')).toBe('one_time');
  });

  it('groups the plain AMC plan under AMC', () => {
    expect(planGroupOf('AMC 3 Services')).toBe('amc');
  });

  it('treats an AMC with a visit frequency as AMC, not recurring', () => {
    // These name both a frequency and AMC; the AMC reading is the useful one,
    // otherwise they would scatter across two tabs.
    expect(planGroupOf('Weekly AMC - 4 Visits/Month')).toBe('amc');
    expect(planGroupOf('Fortnightly AMC - 2 Visits/Month')).toBe('amc');
    expect(planGroupOf('Monthly AMC - 1 Visit/Month')).toBe('amc');
  });

  it('groups visit-frequency plans as recurring', () => {
    expect(planGroupOf('4 Visits/Month')).toBe('recurring');
    expect(planGroupOf('8 Visits/Month')).toBe('recurring');
    expect(planGroupOf('12 Visits/Month')).toBe('recurring');
    expect(planGroupOf('Bi-monthly - 6 Visits')).toBe('recurring');
    expect(planGroupOf('Quarterly - 3 Visits')).toBe('recurring');
    expect(planGroupOf('Monthly - 12 Visits')).toBe('recurring');
  });

  it('keeps add-ons separate', () => {
    expect(planGroupOf('Add-On')).toBe('addon');
  });

  it('falls back to Other rather than dropping an unknown plan', () => {
    expect(planGroupOf('Something Invented Later')).toBe('other');
  });

  it('is insensitive to case and surrounding space', () => {
    expect(planGroupOf('  one time service  ')).toBe('one_time');
    expect(planGroupOf('amc 3 services')).toBe('amc');
  });
});

describe('buildPlanGroups', () => {
  it('covers every real plan type without losing one', () => {
    const groups = buildPlanGroups(REAL_PLAN_TYPES);
    const covered = groups.flatMap((g) => g.planTypes);
    expect(covered.sort()).toEqual([...REAL_PLAN_TYPES].sort());
  });

  it('never routes a real plan into Other', () => {
    const groups = buildPlanGroups(REAL_PLAN_TYPES);
    expect(groups.map((g) => g.id)).not.toContain('other');
  });

  it('orders the tabs one-time, AMC, recurring, add-on', () => {
    const groups = buildPlanGroups(REAL_PLAN_TYPES);
    expect(groups.map((g) => g.id)).toEqual(['one_time', 'amc', 'recurring', 'addon']);
  });

  it('only returns groups the city has rates for', () => {
    // A city on the legacy seed has just these two plans.
    const groups = buildPlanGroups(['One Time Service', 'AMC 3 Services']);
    expect(groups.map((g) => g.id)).toEqual(['one_time', 'amc']);
  });

  it('returns nothing for a city with no rates', () => {
    expect(buildPlanGroups([])).toEqual([]);
  });

  it('ignores blank values instead of making an empty tab', () => {
    expect(buildPlanGroups(['', 'One Time Service'])).toEqual([
      { id: 'one_time', label: 'One-Time', planTypes: ['One Time Service'] },
    ]);
  });
});

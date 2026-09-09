import { describe, it, expect } from 'vitest';
import { groupServiceOptions } from './serviceGrouping';

/** The 13 bookable services the 2026 rate chart produces. */
const CHART_2026 = [
  'Bed Bugs',
  'Cockroach Premium',
  'Cockroach Standard',
  'Complete IPM',
  'Essential IPM',
  'General Pest Control',
  'Integrated IPM',
  'Kill-Rodent System',
  'Mosquito Cold Fogging',
  'Mosquito Thermal Fogging',
  'Regular Rodent',
  'Rodent Control',
  'Termite Spot Treatment',
];

describe('groupServiceOptions', () => {
  it('puts the base tier above the higher tier', () => {
    const groups = groupServiceOptions(['Cockroach Premium', 'Cockroach Standard']);
    expect(groups).toEqual([
      { family: 'Cockroach & Ants', services: ['Cockroach Standard', 'Cockroach Premium'] },
    ]);
  });

  it('orders IPM tiers by scope rather than alphabetically', () => {
    const groups = groupServiceOptions(['Integrated IPM', 'Complete IPM', 'Essential IPM']);
    expect(groups[0].services).toEqual(['Essential IPM', 'Complete IPM', 'Integrated IPM']);
  });

  it('keeps every service when grouping the full 2026 chart', () => {
    const groups = groupServiceOptions(CHART_2026);
    const flat = groups.flatMap((g) => g.services);
    expect(flat.slice().sort()).toEqual(CHART_2026.slice().sort());
  });

  it('groups the 2026 chart by pest, broad contracts last', () => {
    const groups = groupServiceOptions(CHART_2026);
    expect(groups.map((g) => g.family)).toEqual([
      'Cockroach & Ants',
      'Bed Bugs',
      'Termite',
      'Rodent',
      'Mosquito & Flies',
      'Full Coverage / IPM',
    ]);
  });

  it('puts the plain base service above its variants', () => {
    const groups = groupServiceOptions(['Rodent Control', 'Regular Rodent', 'Kill-Rodent System']);
    // "Regular" is a tier keyword; the untiered names lead, shortest first.
    expect(groups[0].services).toEqual([
      'Rodent Control',
      'Kill-Rodent System',
      'Regular Rodent',
    ]);
  });

  it('still handles the legacy service names', () => {
    const groups = groupServiceOptions(['Cockroach / Ants', 'Mosquito', 'Rodent', 'Termite', 'Bed Bugs']);
    expect(groups.map((g) => g.family)).toEqual([
      'Cockroach & Ants',
      'Bed Bugs',
      'Termite',
      'Rodent',
      'Mosquito & Flies',
    ]);
  });

  it('keeps an unrecognised service visible under Other Services', () => {
    const groups = groupServiceOptions(['Bed Bugs', 'Snake Removal']);
    expect(groups[groups.length - 1]).toEqual({
      family: 'Other Services',
      services: ['Snake Removal'],
    });
  });

  it('returns nothing for an empty list', () => {
    expect(groupServiceOptions([])).toEqual([]);
  });
});

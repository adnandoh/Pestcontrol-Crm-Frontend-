import { describe, expect, it } from 'vitest';
import {
  defaultMonthlyPeriod,
  defaultPeriodForCadence,
  defaultWeeklyPeriod,
  formatISODate,
  settlementStatusLabel,
} from './settlementPeriods';

describe('settlementPeriods', () => {
  it('formats ISO dates', () => {
    expect(formatISODate(new Date(2026, 6, 29))).toBe('2026-07-29');
  });

  it('builds Monday–Sunday weekly period', () => {
    // Wednesday 29 Jul 2026
    const period = defaultWeeklyPeriod(new Date(2026, 6, 29));
    expect(period.start).toBe('2026-07-27');
    expect(period.end).toBe('2026-08-02');
  });

  it('builds calendar month period', () => {
    const period = defaultMonthlyPeriod(new Date(2026, 6, 15));
    expect(period.start).toBe('2026-07-01');
    expect(period.end).toBe('2026-07-31');
  });

  it('picks cadence defaults', () => {
    expect(defaultPeriodForCadence('weekly', new Date(2026, 6, 29)).start).toBe('2026-07-27');
    expect(defaultPeriodForCadence('monthly', new Date(2026, 6, 29)).start).toBe('2026-07-01');
  });

  it('labels statuses', () => {
    expect(settlementStatusLabel('pending_approval')).toBe('Pending approval');
    expect(settlementStatusLabel('paid')).toBe('Paid');
  });
});

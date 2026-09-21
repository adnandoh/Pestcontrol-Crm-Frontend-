import { describe, expect, it } from 'vitest';
import { previewServiceSchedule } from './bookingSchedule';

describe('previewServiceSchedule', () => {
  it('treats Bed Bugs as a 2-service package even when plan is One Time Service', () => {
    const preview = previewServiceSchedule(
      'Bed Bugs',
      'One Time Service',
      '2026-08-01',
    );
    expect(preview.totalVisits).toBe(2);
    expect(preview.visitType).toBe('BED BUG SERVICE');
    expect(preview.intervalHint).toBe('2nd visit after 15 days');
    expect(preview.upcomingVisits).toHaveLength(2);
    expect(preview.upcomingVisits[1].date).toBe('16 Aug 2026');
    expect(preview.nextScheduledVisit).toBe('16 Aug 2026');
  });

  it('counts two Bed Bugs visits before a booking date is set', () => {
    const preview = previewServiceSchedule('Bed Bugs', 'One Time Service', '');
    expect(preview.totalVisits).toBe(2);
    expect(preview.intervalHint).toBe('2nd visit after 15 days');
  });

  it('keeps true one-time pests at a single visit', () => {
    const preview = previewServiceSchedule(
      'Cockroach / Ants',
      'One Time Service',
      '2026-08-01',
    );
    expect(preview.totalVisits).toBe(1);
    expect(preview.upcomingVisits).toHaveLength(1);
  });

  it('schedules AMC 12 on a 15-day gap (2×/month pattern)', () => {
    const preview = previewServiceSchedule(
      'Cockroach Standard',
      'AMC 12 Services',
      '2026-01-10',
    );
    expect(preview.totalVisits).toBe(12);
    expect(preview.intervalHint).toBe('Every 15 Days (2×/Month)');
    expect(preview.upcomingVisits[1].date).toBe('25 Jan 2026');
  });

  it('schedules AMC 24 every 15 days', () => {
    const preview = previewServiceSchedule(
      'Cockroach Standard',
      'AMC 24 Services',
      '2026-06-01',
    );
    expect(preview.totalVisits).toBe(24);
    expect(preview.upcomingVisits[1].date).toBe('16 Jun 2026');
  });

  it('schedules AMC 9 every 40 days', () => {
    const preview = previewServiceSchedule(
      'Cockroach Standard',
      'AMC 9 Services',
      '2026-01-01',
    );
    expect(preview.totalVisits).toBe(9);
    expect(preview.upcomingVisits[1].date).toBe('10 Feb 2026');
  });
});

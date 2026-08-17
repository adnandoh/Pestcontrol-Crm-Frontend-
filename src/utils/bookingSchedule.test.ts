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
});

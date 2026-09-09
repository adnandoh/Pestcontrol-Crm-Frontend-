import { describe, expect, it } from 'vitest';
import {
  TECHNICIAN_STATUS_OPTIONS,
  isTechnicianAssignable,
  isTechnicianAvailable,
  normalizeTechnicianStatus,
  technicianStatusLabel,
} from './technicianStatus';

describe('technician status', () => {
  it('offers exactly the three statuses the backend accepts', () => {
    expect(TECHNICIAN_STATUS_OPTIONS.map((o) => o.value)).toEqual([
      'active',
      'on_leave',
      'suspended',
    ]);
  });

  it('every option has a hint explaining what it does', () => {
    for (const option of TECHNICIAN_STATUS_OPTIONS) {
      expect(option.hint.length).toBeGreaterThan(0);
    }
  });

  it('labels each status for display', () => {
    expect(technicianStatusLabel('active')).toBe('Active');
    expect(technicianStatusLabel('on_leave')).toBe('On Leave');
    expect(technicianStatusLabel('suspended')).toBe('Suspended');
  });

  it('falls back to Active for retired and unknown values', () => {
    // Rows written before the statuses were collapsed, or a value the UI has
    // not heard of, must not render as a raw string.
    for (const stale of ['online', 'offline', 'busy', 'on_service', '', undefined, null]) {
      expect(normalizeTechnicianStatus(stale)).toBe('active');
      expect(technicianStatusLabel(stale)).toBe('Active');
    }
  });

  describe('availability', () => {
    it('only Active is available for work', () => {
      expect(isTechnicianAvailable('active')).toBe(true);
      expect(isTechnicianAvailable('on_leave')).toBe(false);
      expect(isTechnicianAvailable('suspended')).toBe(false);
    });

    it('on-leave staff stay assignable, suspended staff do not', () => {
      // Automatic dispatch skips on-leave technicians, but the desk can still
      // schedule them for after they return.
      expect(isTechnicianAssignable('active')).toBe(true);
      expect(isTechnicianAssignable('on_leave')).toBe(true);
      expect(isTechnicianAssignable('suspended')).toBe(false);
    });
  });
});

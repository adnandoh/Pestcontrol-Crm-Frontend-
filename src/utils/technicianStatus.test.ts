import { describe, expect, it } from 'vitest';
import {
  TECHNICIAN_STATUS_OPTIONS,
  isTechnicianAssignable,
  isTechnicianListable,
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

    it('neither on-leave nor suspended staff are assignable', () => {
      // Dispatch does not reach either, so the assign popup and crew panel
      // must not offer them.
      expect(isTechnicianAssignable('active')).toBe(true);
      expect(isTechnicianAssignable('on_leave')).toBe(false);
      expect(isTechnicianAssignable('suspended')).toBe(false);
    });

    it('on-leave staff remain listable for read-only pickers', () => {
      // The complaint form still has to reach someone who is merely away
      // today. Suspended stays hidden there too. The ledger uses assignable.
      expect(isTechnicianListable('active')).toBe(true);
      expect(isTechnicianListable('on_leave')).toBe(true);
      expect(isTechnicianListable('suspended')).toBe(false);
    });

    it('assignable is strictly narrower than listable', () => {
      for (const status of ['active', 'on_leave', 'suspended']) {
        if (isTechnicianAssignable(status)) {
          expect(isTechnicianListable(status)).toBe(true);
        }
      }
    });
  });
});

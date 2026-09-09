import { describe, expect, it } from 'vitest';
import { toClockDisplay, toStorageTime } from './clockTime';

describe('toClockDisplay', () => {
  it('shows an afternoon time in 12-hour form', () => {
    expect(toClockDisplay('14:30')).toBe('02:30 PM');
  });

  it('shows a morning time in 12-hour form', () => {
    expect(toClockDisplay('09:05')).toBe('09:05 AM');
  });

  it('calls midnight 12 AM rather than 00', () => {
    expect(toClockDisplay('00:00')).toBe('12:00 AM');
  });

  it('calls noon 12 PM rather than 00', () => {
    expect(toClockDisplay('12:00')).toBe('12:00 PM');
  });

  it('handles the last minute of the day', () => {
    expect(toClockDisplay('23:59')).toBe('11:59 PM');
  });

  it('accepts the seconds the API sometimes includes', () => {
    expect(toClockDisplay('14:30:00')).toBe('02:30 PM');
  });

  it('gives back nothing for an unset value, so the placeholder shows', () => {
    expect(toClockDisplay('')).toBe('');
    expect(toClockDisplay(null)).toBe('');
    expect(toClockDisplay(undefined)).toBe('');
  });

  it('refuses an impossible time rather than displaying it', () => {
    expect(toClockDisplay('25:00')).toBe('');
    expect(toClockDisplay('10:75')).toBe('');
    expect(toClockDisplay('not a time')).toBe('');
  });
});

describe('toStorageTime', () => {
  it('converts an afternoon selection to 24-hour', () => {
    expect(toStorageTime('02:30 PM')).toBe('14:30');
  });

  it('leaves a morning selection on the same hour', () => {
    expect(toStorageTime('09:05 AM')).toBe('09:05');
  });

  it('maps 12 AM to midnight, not to hour 12', () => {
    expect(toStorageTime('12:00 AM')).toBe('00:00');
  });

  it('maps 12 PM to noon, not to hour 24', () => {
    expect(toStorageTime('12:00 PM')).toBe('12:00');
  });

  it('accepts lower case and a missing space', () => {
    expect(toStorageTime('02:30pm')).toBe('14:30');
  });

  it('passes an already-24-hour value straight through', () => {
    // A form loading an existing booking, where the value never met the picker.
    expect(toStorageTime('14:30')).toBe('14:30');
    expect(toStorageTime('7:05')).toBe('07:05');
  });

  it('gives back nothing when no time is set', () => {
    expect(toStorageTime('')).toBe('');
    expect(toStorageTime(null)).toBe('');
  });

  it('gives back nothing for junk, so no bad value reaches the API', () => {
    expect(toStorageTime('later today')).toBe('');
    expect(toStorageTime('99:99 PM')).toBe('');
  });
});

describe('round trip', () => {
  const stored = ['00:00', '00:30', '06:15', '09:05', '12:00', '12:45', '14:30', '23:59'];

  it('survives storage to display and back for every hour of the day', () => {
    for (const value of stored) {
      expect(toStorageTime(toClockDisplay(value))).toBe(value);
    }
  });

  it('covers all 24 hours without collapsing AM onto PM', () => {
    const seen = new Set<string>();
    for (let h = 0; h < 24; h += 1) {
      const value = `${String(h).padStart(2, '0')}:00`;
      const display = toClockDisplay(value);
      expect(toStorageTime(display)).toBe(value);
      seen.add(display);
    }
    // 24 distinct labels: proof no two hours share a display string.
    expect(seen.size).toBe(24);
  });
});

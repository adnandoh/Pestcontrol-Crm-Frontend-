/**
 * Bridges `ClockTimePicker`, which speaks 12-hour display strings like
 * "02:30 PM", and the 24-hour "HH:MM" that Django's TimeField stores.
 *
 * Without this the picker cannot be used for any field that is saved as a
 * real time — its output would reach the API as "02:30 PM" and be rejected.
 * The conversion used to be copy-pasted inline in ReminderModal, which is why
 * the other time fields fell back to the browser's native input instead.
 */

/** "02:30 PM" — what ClockTimePicker emits and parses. */
const DISPLAY_12H = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

/** "14:30" or "14:30:00" — what the API sends and expects. */
const STORED_24H = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

/**
 * 24-hour stored value to the picker's display format.
 * Anything unparseable becomes '' so the picker shows its placeholder rather
 * than a stale or nonsense time.
 */
export function toClockDisplay(value: string | null | undefined): string {
  const match = STORED_24H.exec((value ?? '').trim());
  if (!match) return '';

  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (hour24 > 23 || minute > 59) return '';

  const period = hour24 >= 12 ? 'PM' : 'AM';
  // 0 is 12 AM and 12 is 12 PM; the modulo alone would give a meaningless 0.
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${match[2]} ${period}`;
}

/**
 * The picker's display format back to the 24-hour value the API stores.
 *
 * A 24-hour string passes through normalised, so this is safe to apply to a
 * value that never went through the picker — a form loading an existing
 * booking, for instance.
 */
export function toStorageTime(display: string | null | undefined): string {
  const raw = (display ?? '').trim();

  const twelve = DISPLAY_12H.exec(raw);
  if (twelve) {
    const minute = Number(twelve[2]);
    if (minute > 59) return '';
    let hour = Number(twelve[1]) % 12;
    if (twelve[3].toUpperCase() === 'PM') hour += 12;
    return `${String(hour).padStart(2, '0')}:${twelve[2]}`;
  }

  const stored = STORED_24H.exec(raw);
  if (stored && Number(stored[1]) <= 23 && Number(stored[2]) <= 59) {
    return `${stored[1].padStart(2, '0')}:${stored[2]}`;
  }
  return '';
}

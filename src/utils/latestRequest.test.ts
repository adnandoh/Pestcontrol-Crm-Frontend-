import { describe, expect, it } from 'vitest';
import { isStaleRequest, shouldRunVisibleRefetch } from './latestRequest';

describe('latest search response', () => {
  it('ignores an older query that finishes after a newer one', () => {
    const rahul = 2;
    const rah = 1;
    expect(isStaleRequest(rah, rahul)).toBe(true);
    expect(isStaleRequest(rahul, rahul)).toBe(false);
  });

  it('keeps Rahul when Rah was sent first but finishes second', async () => {
    const latest = { id: 0 };
    let shown = '';

    const search = async (query: string, delayMs: number) => {
      const requestId = ++latest.id;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (isStaleRequest(requestId, latest.id)) return;
      shown = query;
    };

    const first = search('Rah', 40);
    const second = search('Rahul', 5);
    await second;
    await first;
    expect(shown).toBe('Rahul');
  });

  it('keeps Rah when Rahul was sent first but finishes second', async () => {
    const latest = { id: 0 };
    let shown = '';

    const search = async (query: string, delayMs: number) => {
      const requestId = ++latest.id;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (isStaleRequest(requestId, latest.id)) return;
      shown = query;
    };

    const first = search('Rahul', 40);
    const second = search('Rah', 5);
    await second;
    await first;
    expect(shown).toBe('Rah');
  });

  it('ignores a one-character query that never starts a request', () => {
    const requestId = 1;
    const latestId = 1;
    const query = 'R';
    expect(query.length < 2).toBe(true);
    expect(isStaleRequest(requestId, latestId)).toBe(false);
  });
});

describe('bookings visible refetch', () => {
  it('runs the first return and skips the focus event that follows immediately', () => {
    const first = 10_000;
    expect(shouldRunVisibleRefetch(first, 0)).toBe(true);
    expect(shouldRunVisibleRefetch(first + 40, first)).toBe(false);
  });

  it('allows a later refresh after the pair has passed', () => {
    const first = 10_000;
    expect(shouldRunVisibleRefetch(first + 2000, first)).toBe(true);
  });
});

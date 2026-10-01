/** True when an older search response must not replace a newer query. */
export function isStaleRequest(requestId: number, latestId: number): boolean {
  return requestId !== latestId;
}

/**
 * Chrome fires tab-visible and window-focus together.
 * Collapse that pair without blocking a later real refresh.
 */
export function shouldRunVisibleRefetch(now: number, lastRunAt: number, windowMs = 1500): boolean {
  return now - lastRunAt >= windowMs;
}

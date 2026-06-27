/** Parse user money/qty input — strips leading zeros and non-numeric chars. */
export function parseMoneyInput(raw: string): number {
  const cleaned = raw.replace(/[^\d.]/g, '').replace(/^0+(?=\d)/, '');
  if (!cleaned || cleaned === '.') return 0;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoneyInputValue(value: number | string | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '';
  return String(n);
}

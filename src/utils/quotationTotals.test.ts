import { describe, expect, it } from 'vitest';

import { resolveQuotationTotals } from './quotationTotals';
import type { QuotationItem } from '../types';

const line = (rate: number, qty = 1): QuotationItem => ({
  service_name: 'General Pest Control',
  frequency: 'One Time Service',
  quantity: qty,
  rate,
  total: rate * qty,
});

describe('resolveQuotationTotals', () => {
  it('uses the line-item total as the price', () => {
    const t = resolveQuotationTotals({ items: [line(4000), line(3000)] });
    expect(t.total_amount).toBe(7000);
    expect(t.grand_total).toBe(7000);
  });

  it('follows the rate downwards', () => {
    const t = resolveQuotationTotals({ items: [line(9000)] });
    expect(t.total_amount).toBe(9000);
  });

  it('never invents a contract amount the operator left blank', () => {
    const t = resolveQuotationTotals({
      items: [line(12000)],
      is_amc: true,
      visit_count: 12,
      contract_amount: 0,
    });
    expect(t.contract_amount).toBe(0);
  });

  it('lets an AMC price be reduced even with a stale contract amount stored', () => {
    // The reported bug: contract_amount had been auto-filled at the old price,
    // and then pinned the total so no reduction could take effect.
    const t = resolveQuotationTotals({
      items: [line(9000)],
      is_amc: true,
      visit_count: 12,
      contract_amount: 12000,
    });
    expect(t.total_amount).toBe(9000);
    expect(t.grand_total).toBe(9000);
  });

  it('still prices a quotation whose lines carry no amount', () => {
    const t = resolveQuotationTotals({
      items: [line(0)],
      is_amc: true,
      visit_count: 12,
      contract_amount: 20000,
    });
    expect(t.total_amount).toBe(20000);
  });

  it('ignores a visit count typed into the contract amount box', () => {
    const t = resolveQuotationTotals({
      items: [line(3500)],
      is_amc: true,
      visit_count: 3,
      contract_amount: 3,
    });
    expect(t.total_amount).toBe(3500);
    expect(t.contract_amount).toBe(0);
  });

  it('subtracts discount before GST and keeps GST inclusive by default', () => {
    const t = resolveQuotationTotals({ items: [line(11800)], discount: 1800 });
    expect(t.total_amount).toBe(11800);
    expect(t.taxable_amount).toBe(10000);
    expect(t.grand_total).toBe(10000);
    expect(t.base_amount).toBe(8474.58);
  });

  it('does not inflate the price when "Price includes GST" is toggled repeatedly', () => {
    // Reported as "select, unselect, select again and the price doubles". Each pass
    // fed the previous grand total back in as the new base, compounding by 1.18.
    const items = [line(39432.77)];
    let contract = 46530.67; // stale value left by the old auto-fill
    const seen: number[] = [];

    for (let i = 0; i < 6; i += 1) {
      const t = resolveQuotationTotals({
        items,
        is_amc: true,
        visit_count: 12,
        contract_amount: contract,
        gst_percent: 18,
        price_includes_gst: i % 2 === 0,
      });
      contract = t.contract_amount; // fed back exactly as the form does
      seen.push(t.grand_total);
    }

    expect(seen.filter((_, i) => i % 2 === 0)).toEqual([39432.77, 39432.77, 39432.77]);
    expect(seen.filter((_, i) => i % 2 === 1)).toEqual([46530.67, 46530.67, 46530.67]);
    expect(contract).toBe(46530.67);
  });

  it('does not grow an unpriced quotation by the GST rate on every save', () => {
    let stored = { total_amount: 1000, grand_total: 1180 };

    for (let i = 0; i < 5; i += 1) {
      const t = resolveQuotationTotals({
        items: [line(0)],
        gst_percent: 18,
        price_includes_gst: false,
        ...stored,
      });
      stored = { total_amount: t.total_amount, grand_total: t.grand_total };
    }

    expect(stored.total_amount).toBe(1000);
    expect(stored.grand_total).toBe(1180);
  });

  it('adds GST on top when the price excludes it', () => {
    const t = resolveQuotationTotals({
      items: [line(10000)],
      gst_percent: 18,
      price_includes_gst: false,
    });
    expect(t.tax_amount).toBe(1800);
    expect(t.grand_total).toBe(11800);
  });
});

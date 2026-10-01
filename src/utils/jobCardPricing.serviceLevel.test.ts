import { describe, expect, it } from 'vitest';
import {
  applyGstModeToServiceItems,
  finalizeServiceLinePricing,
  mergeCatalogIntoServiceItems,
  splitPriceByGstMode,
  summarizeServicePricing,
  type ServiceItemConfig,
} from './jobCardPricing';

describe('service-level pricing', () => {
  it('clamps discount to base and computes final', () => {
    expect(finalizeServiceLinePricing(3000, 500)).toEqual({
      baseAmount: 3000,
      discount: 500,
      amount: 2500,
    });
    expect(finalizeServiceLinePricing(1000, 1500)).toEqual({
      baseAmount: 1000,
      discount: 1000,
      amount: 0,
    });
  });

  it('keeps discounts independent across services', () => {
    const items: ServiceItemConfig[] = [
      { service: 'Termite', plan: 'One Time Service', area: '2 BHK', baseAmount: 3000, discount: 500, amount: 2500 },
      { service: 'Cockroach / Ants', plan: 'One Time Service', area: '2 BHK', baseAmount: 1500, discount: 0, amount: 1500 },
    ];
    const totals = summarizeServicePricing(items);
    expect(totals.subtotal).toBe(4500);
    expect(totals.totalDiscount).toBe(500);
    expect(totals.finalAmount).toBe(4000);
  });

  it('preserves discount when catalog refreshes same plan/area', () => {
    const previous: ServiceItemConfig[] = [
      { service: 'Termite', plan: 'One Time Service', area: '2 BHK', baseAmount: 3000, discount: 500, amount: 2500 },
    ];
    const catalog: ServiceItemConfig[] = [
      { service: 'Termite', plan: 'One Time Service', area: '2 BHK', baseAmount: 3000, discount: 0, amount: 3000 },
    ];
    const merged = mergeCatalogIntoServiceItems(catalog, previous);
    expect(merged[0].discount).toBe(500);
    expect(merged[0].amount).toBe(2500);
  });

  it('resets base from catalog when plan/area changes but keeps discount clamped', () => {
    const previous: ServiceItemConfig[] = [
      { service: 'Termite', plan: 'One Time Service', area: '2 BHK', baseAmount: 3000, discount: 500, amount: 2500 },
    ];
    const catalog: ServiceItemConfig[] = [
      { service: 'Termite', plan: 'One Time Service', area: '3 BHK', baseAmount: 4000, discount: 0, amount: 4000 },
    ];
    const merged = mergeCatalogIntoServiceItems(catalog, previous);
    expect(merged[0].area).toBe('3 BHK');
    expect(merged[0].baseAmount).toBe(4000);
    expect(merged[0].discount).toBe(500);
    expect(merged[0].amount).toBe(3500);
  });

  it('treats an inclusive price as the customer total', () => {
    const split = splitPriceByGstMode(1050, 'GST_INCLUSIVE', 18);
    expect(split.taxable).toBe(889.83);
    expect(split.gst).toBe(160.17);
    expect(split.final).toBe(1050);
  });

  it('adds GST on top of an exclusive price', () => {
    const split = splitPriceByGstMode(1050, 'GST_EXCLUSIVE', 18);
    expect(split.taxable).toBe(1050);
    expect(split.gst).toBe(189);
    expect(split.final).toBe(1239);
  });

  it('keeps GST on each service instead of one combined guess', () => {
    const priced = applyGstModeToServiceItems(
      [
        { service: 'A', plan: 'One Time Service', area: '1 BHK', baseAmount: 1050, discount: 0, amount: 1050 },
        { service: 'B', plan: 'One Time Service', area: '1 BHK', baseAmount: 1050, discount: 0, amount: 1050 },
      ],
      'GST_EXCLUSIVE',
    );
    expect(priced.map((item) => item.amount)).toEqual([1239, 1239]);
    expect(priced[0].taxableAmount).toBe(1050);
    expect(priced[0].gstAmount).toBe(189);
  });
});

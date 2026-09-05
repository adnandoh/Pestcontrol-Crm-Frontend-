import { describe, expect, it } from 'vitest';
import {
  finalizeServiceLinePricing,
  mergeCatalogIntoServiceItems,
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
});

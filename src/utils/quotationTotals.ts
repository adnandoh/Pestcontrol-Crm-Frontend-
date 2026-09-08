import type { QuotationItem } from '../types';

export function sumQuotationItems(items: QuotationItem[] = []): number {
  return items.reduce((sum, item) => sum + Number(item.total || 0), 0);
}

/** Mirror backend core/pricing/gst.py for quotation totals. */
export function gstBreakdown(
  amount: number,
  gstPercent: number = 18,
  priceIncludesGst: boolean = true,
): { base_amount: number; gst_amount: number; total_with_gst: number } {
  const selling = Math.round(Number(amount || 0) * 100) / 100;
  const rate = Math.max(0, Number(gstPercent || 0));
  if (selling <= 0 || rate <= 0) {
    return { base_amount: selling, gst_amount: 0, total_with_gst: selling };
  }
  if (priceIncludesGst) {
    const base = Math.round((selling / (1 + rate / 100)) * 100) / 100;
    const gst = Math.round((selling - base) * 100) / 100;
    return { base_amount: base, gst_amount: gst, total_with_gst: selling };
  }
  const base = selling;
  const gst = Math.round((selling * rate / 100) * 100) / 100;
  return {
    base_amount: base,
    gst_amount: gst,
    total_with_gst: Math.round((base + gst) * 100) / 100,
  };
}

/**
 * Resolve quotation money fields for display and save.
 * Line items are the source of truth when they have amounts; contract_amount is the
 * fallback package price used only when no line carries an amount.
 */
export function resolveQuotationTotals(quotation: {
  items?: QuotationItem[];
  discount?: number;
  is_amc?: boolean;
  contract_amount?: number;
  total_amount?: number;
  grand_total?: number;
  visit_count?: number;
  gst_percent?: number;
  price_includes_gst?: boolean;
  tax_amount?: number;
}): {
  itemsSubtotal: number;
  total_amount: number;
  taxable_amount: number;
  base_amount: number;
  tax_amount: number;
  grand_total: number;
  contract_amount: number;
  gst_percent: number;
  price_includes_gst: boolean;
} {
  const itemsSubtotal = sumQuotationItems(quotation.items);
  const discount = Number(quotation.discount || 0);
  const storedContract = Number(quotation.contract_amount || 0);
  const visitCount = Number(quotation.visit_count || 0);
  const gstPercent = Number(quotation.gst_percent ?? 18);
  const priceIncludesGst = quotation.price_includes_gst !== false;

  // Ignore contract amounts that look like a mistaken visit count (e.g. 3 vs ₹3500 items)
  const contractLooksLikeVisitCount =
    quotation.is_amc &&
    storedContract > 0 &&
    storedContract <= 48 &&
    storedContract === visitCount &&
    itemsSubtotal > storedContract;

  const effectiveContract = contractLooksLikeVisitCount ? 0 : storedContract;

  // Priced line items always win; contract_amount is only the fallback for a
  // quotation whose lines carry no price.
  let total_amount = itemsSubtotal;
  if (total_amount <= 0 && effectiveContract > 0) {
    total_amount = effectiveContract;
  } else if (total_amount <= 0) {
    // grand_total is only a last resort for legacy rows that never stored a
    // total_amount. Taking max() of the two made an ex-GST grand total become the
    // next base, inflating the price by the GST rate on every save.
    total_amount = Number(quotation.total_amount || 0) || Number(quotation.grand_total || 0);
  }

  const taxable_amount = Math.max(0, total_amount - discount);
  const gst = gstBreakdown(taxable_amount, gstPercent, priceIncludesGst);
  const grand_total = gst.total_with_gst;
  // Echo back exactly what the operator entered. Raising this to the grand total
  // filled in a field they had left blank and then blocked every price reduction.
  const contract_amount = quotation.is_amc ? effectiveContract : 0;

  return {
    itemsSubtotal,
    total_amount,
    taxable_amount,
    base_amount: gst.base_amount,
    tax_amount: gst.gst_amount,
    grand_total,
    contract_amount,
    gst_percent: gstPercent,
    price_includes_gst: priceIncludesGst,
  };
}

export function resolveQuotationTotalsFromForm(
  items: QuotationItem[],
  discount: number,
  is_amc: boolean,
  contract_amount: number,
  visit_count: number,
  gst_percent: number = 18,
  price_includes_gst: boolean = true,
) {
  return resolveQuotationTotals({
    items,
    discount,
    is_amc,
    contract_amount,
    visit_count,
    gst_percent,
    price_includes_gst,
  });
}

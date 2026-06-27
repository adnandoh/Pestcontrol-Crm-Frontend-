import type { QuotationItem } from '../types';

export function sumQuotationItems(items: QuotationItem[] = []): number {
  return items.reduce((sum, item) => sum + Number(item.total || 0), 0);
}

/**
 * Resolve quotation money fields for display and save.
 * Line items are the source of truth when they have amounts; contract_amount applies
 * only when it exceeds the items subtotal (full AMC package price).
 */
export function resolveQuotationTotals(quotation: {
  items?: QuotationItem[];
  discount?: number;
  is_amc?: boolean;
  contract_amount?: number;
  total_amount?: number;
  grand_total?: number;
  visit_count?: number;
}): {
  itemsSubtotal: number;
  total_amount: number;
  grand_total: number;
  contract_amount: number;
} {
  const itemsSubtotal = sumQuotationItems(quotation.items);
  const discount = Number(quotation.discount || 0);
  const storedContract = Number(quotation.contract_amount || 0);
  const visitCount = Number(quotation.visit_count || 0);

  // Ignore contract amounts that look like a mistaken visit count (e.g. 3 vs ₹3500 items)
  const contractLooksLikeVisitCount =
    quotation.is_amc &&
    storedContract > 0 &&
    storedContract <= 48 &&
    storedContract === visitCount &&
    itemsSubtotal > storedContract;

  const effectiveContract = contractLooksLikeVisitCount ? 0 : storedContract;

  let total_amount = itemsSubtotal;
  if (quotation.is_amc && effectiveContract > total_amount) {
    total_amount = effectiveContract;
  } else if (total_amount <= 0 && effectiveContract > 0) {
    total_amount = effectiveContract;
  } else if (total_amount <= 0) {
    total_amount = Math.max(
      Number(quotation.total_amount || 0),
      Number(quotation.grand_total || 0),
    );
  }

  const grand_total = Math.max(0, total_amount - discount);
  const contract_amount = quotation.is_amc
    ? Math.max(effectiveContract, grand_total)
    : 0;

  return { itemsSubtotal, total_amount, grand_total, contract_amount };
}

export function resolveQuotationTotalsFromForm(
  items: QuotationItem[],
  discount: number,
  is_amc: boolean,
  contract_amount: number,
  visit_count: number,
) {
  return resolveQuotationTotals({
    items,
    discount,
    is_amc,
    contract_amount,
    visit_count,
  });
}

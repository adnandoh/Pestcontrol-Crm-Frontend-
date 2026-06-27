/**
 * Quotation totals — run: npx tsx scripts/test-quotation-totals.mjs
 */
import {
  resolveQuotationTotals,
  sumQuotationItems,
} from '../src/utils/quotationTotals.ts';

const items = [
  {
    service_name: 'General Pest Control',
    frequency: 'AMC 3 Services',
    quantity: 1,
    rate: 3500,
    total: 3500,
  },
];

// Bug case: staff entered visit count (3) as contract amount
const fixed = resolveQuotationTotals({
  items,
  discount: 0,
  is_amc: true,
  contract_amount: 3,
  visit_count: 3,
  grand_total: 3,
  total_amount: 3,
});

if (fixed.grand_total !== 3500) {
  console.error('FAIL: expected grand_total 3500, got', fixed);
  process.exit(1);
}

if (sumQuotationItems(items) !== 3500) {
  console.error('FAIL: items subtotal');
  process.exit(1);
}

console.log('Quotation totals OK — AMC visit_count=3 no longer overrides ₹3500');

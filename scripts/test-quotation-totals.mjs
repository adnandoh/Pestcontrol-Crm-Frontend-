// Quotation GST — run: npx tsx scripts/test-quotation-totals.mjs
import {
  gstBreakdown,
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

// Inclusive GST: grand total unchanged, GST extracted
const inclusive = resolveQuotationTotals({
  items: [{ service_name: 'Test', frequency: 'One Time', quantity: 1, rate: 1180, total: 1180 }],
  discount: 0,
  gst_percent: 18,
  price_includes_gst: true,
});
if (inclusive.grand_total !== 1180 || inclusive.tax_amount !== 180) {
  console.error('FAIL: inclusive GST', inclusive);
  process.exit(1);
}

// Exclusive GST: GST added on top
const exclusive = resolveQuotationTotals({
  items: [{ service_name: 'Test', frequency: 'One Time', quantity: 1, rate: 1000, total: 1000 }],
  discount: 0,
  gst_percent: 18,
  price_includes_gst: false,
});
if (exclusive.grand_total !== 1180 || exclusive.tax_amount !== 180) {
  console.error('FAIL: exclusive GST', exclusive);
  process.exit(1);
}

const bd = gstBreakdown(1180, 18, true);
if (bd.base_amount !== 1000 || bd.gst_amount !== 180) {
  console.error('FAIL: gstBreakdown', bd);
  process.exit(1);
}

console.log('Quotation totals OK — AMC + GST breakdown');

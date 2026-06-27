/**
 * Validates quotation multi-service + per-plan logic.
 * Run: npx tsx scripts/test-quotation-multi-service.mjs
 */
import {
  buildItemsFromServicePlans,
  configsFromQuotation,
  deriveQuotationFlags,
  getQuotationPlanOptions,
  mergeScopesForServicePlans,
  quotationSupportsAmc,
} from '../src/constants/quotationServices.ts';

const failures = [];

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

// Bed Bug one-time only
assert(!quotationSupportsAmc('Bed Bug Treatment'), 'Bed bug should not support AMC');
const bedBugPlans = getQuotationPlanOptions('Bed Bug Treatment');
assert(bedBugPlans.length === 1, 'Bed bug should have 1 plan option');

// Mosquito has AMC 24/48
const mosquitoPlans = getQuotationPlanOptions('Mosquito Control');
assert(
  mosquitoPlans.some((p) => p.value.includes('24')),
  'Mosquito should have AMC 24',
);
assert(
  mosquitoPlans.some((p) => p.value.includes('48')),
  'Mosquito should have AMC 48',
);

// Mixed: Bed Bug one-time + Mosquito AMC 12
const mixedConfigs = [
  { service: 'Bed Bug Treatment', plan: 'One Time Service' },
  { service: 'Mosquito Control', plan: 'AMC 12 Services' },
];
const flags = deriveQuotationFlags(mixedConfigs);
assert(flags.is_amc === true, 'Mixed with AMC should set is_amc');
assert(flags.hasMixedPlans === true, 'Bed bug + mosquito AMC should be mixed');

const items = buildItemsFromServicePlans(mixedConfigs);
assert(items.length === 2, 'Should create 2 line items');
assert(items[0].service_name === 'Bed Bug Treatment', 'First item bed bug');
assert(items[1].service_name === 'Mosquito Control', 'Second item mosquito');
assert(items[0].frequency.toLowerCase().includes('one time'), 'Bed bug frequency one time');
assert(items[1].frequency.toLowerCase().includes('12'), 'Mosquito AMC 12 in frequency');

const scopes = mergeScopesForServicePlans('Society', mixedConfigs);
assert(scopes.some((s) => s.title === 'Area Covered'), 'Should have area covered');
assert(
  scopes.some((s) => s.title === 'Scope of Work — Bed Bug Treatment'),
  'Bed bug scope section',
);
assert(
  scopes.some((s) => s.title === 'Scope of Work — Mosquito Control'),
  'Mosquito scope section',
);
assert(
  scopes.some((s) => s.content.includes('Service plan:')),
  'Scope should include plan label',
);

// Roundtrip from saved quotation shape
const restored = configsFromQuotation(
  'Bed Bug Treatment, Mosquito Control',
  items,
);
assert(restored.length === 2, 'Restore 2 configs from template_service_type');
assert(restored[0].service === 'Bed Bug Treatment', 'Restore bed bug service');
assert(restored[1].plan.includes('AMC') || restored[1].plan.includes('One Time'), 'Restore plan');

// Society + GPC + Rodent AMC
const dualAmc = [
  { service: 'General Pest Control', plan: 'One Time Service' },
  { service: 'Rodent Control', plan: 'AMC 6 Services' },
];
const dualScopes = mergeScopesForServicePlans('Society', dualAmc);
assert(dualScopes.filter((s) => s.title.startsWith('Scope of Work')).length === 2, '2 scope sections');

console.log('Tests run: multi-service quotation');
console.log('Failures:', failures.length);
if (failures.length) {
  failures.forEach((f) => console.error('FAIL:', f));
  process.exit(1);
}
console.log('All multi-service quotation tests PASSED');

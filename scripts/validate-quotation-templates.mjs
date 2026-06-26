/**
 * Validates quotation template resolver — run: node scripts/validate-quotation-templates.mjs
 */
import {
  QUOTATION_PROPERTY_TYPES,
  QUOTATION_SERVICE_TYPES,
  getQuotationTemplate,
  templateToScopes,
  hasStructuredScopes,
  listAllTemplateKeys,
} from '../src/constants/quotationTemplates.ts';

const keys = listAllTemplateKeys();
const failures = [];

for (const key of keys) {
  const [propertyType, serviceType] = key.split('::');
  const template = getQuotationTemplate(propertyType, serviceType);
  if (!template) {
    failures.push(`Missing template: ${key}`);
    continue;
  }
  const scopes = templateToScopes(template);
  if (!hasStructuredScopes(scopes)) {
    failures.push(`Unstructured scopes: ${key}`);
  }
  for (const field of ['scopeOfWork', 'areaCovered', 'pestCovered', 'benefits', 'warranty']) {
    if (!template[field]?.trim()) failures.push(`Empty ${field}: ${key}`);
  }
  if (!template.paymentTerms?.length) failures.push(`No payment terms: ${key}`);
}

// User-specified examples
const examples = [
  {
    property: 'Society',
    service: 'General Pest Control',
    areaMust: ['Flats', 'Lift Lobby', 'Garbage Area'],
    pestMust: ['Cockroach', 'Lizard'],
    benefitMust: ['Gel & Spray Treatment'],
  },
  {
    property: 'Restaurant / Cafe',
    service: 'General Pest Control',
    areaMust: ['Kitchen', 'Dining Area', 'Food Preparation Area'],
    benefitMust: ['Food Safe Treatment'],
  },
  {
    property: 'Hotel / Resort',
    service: 'General Pest Control',
    areaMust: ['Rooms', 'Lobby', 'Laundry'],
  },
  {
    property: 'Office',
    service: 'General Pest Control',
    areaMust: ['Cabins', 'Workstations', 'Pantry'],
  },
  {
    property: 'Villa / Bungalow',
    service: 'General Pest Control',
    areaMust: ['Living Room', 'Terrace', 'Compound Area'],
  },
  {
    property: 'Warehouse',
    service: 'Rodent Control',
    areaMust: ['Storage Area', 'Loading Area'],
    pestMust: ['Rats'],
  },
  {
    property: 'Hospital',
    service: 'General Pest Control',
    areaMust: ['OPD', 'ICU', 'Operation Theatre'],
  },
];

for (const ex of examples) {
  const t = getQuotationTemplate(ex.property, ex.service);
  if (!t) {
    failures.push(`Example missing: ${ex.property} + ${ex.service}`);
    continue;
  }
  for (const s of ex.areaMust ?? []) {
    if (!t.areaCovered.includes(s)) failures.push(`${ex.property}/${ex.service}: area missing "${s}"`);
  }
  for (const s of ex.pestMust ?? []) {
    if (!t.pestCovered.includes(s)) failures.push(`${ex.property}/${ex.service}: pest missing "${s}"`);
  }
  for (const s of ex.benefitMust ?? []) {
    if (!t.benefits.includes(s)) failures.push(`${ex.property}/${ex.service}: benefit missing "${s}"`);
  }
}

console.log(`Property types: ${QUOTATION_PROPERTY_TYPES.length}`);
console.log(`Service types: ${QUOTATION_SERVICE_TYPES.length}`);
console.log(`Template combinations: ${keys.length}`);
console.log(`Failures: ${failures.length}`);
if (failures.length) {
  failures.forEach((f) => console.error('FAIL:', f));
  process.exit(1);
}
console.log('All quotation templates OK');

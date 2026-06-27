import type { QuotationPaymentTerm, QuotationScope, QuotationType } from '../types';

export const QUOTATION_PROPERTY_TYPES = [
  'Residential Flat',
  'Villa / Bungalow',
  'Society',
  'Hotel / Resort',
  'Restaurant / Cafe',
  'Office',
  'Warehouse',
  'Factory',
  'Hospital',
  'School / College',
  'Shop / Showroom',
] as const;

export type QuotationPropertyType = (typeof QUOTATION_PROPERTY_TYPES)[number];

export const QUOTATION_SERVICE_TYPES = [
  'General Pest Control',
  'Bed Bug Treatment',
  'Rodent Control',
  'Mosquito Control',
  'Termite Treatment',
] as const;

export type QuotationServiceType = (typeof QUOTATION_SERVICE_TYPES)[number];

/** All services available for multi-select on Create Quotation */
export const QUOTATION_SELECTABLE_SERVICES = [...QUOTATION_SERVICE_TYPES] as const;

export type QuotationSelectableService = (typeof QUOTATION_SELECTABLE_SERVICES)[number];

export interface QuotationMasterTemplate {
  scopeOfWork: string;
  areaCovered: string;
  pestCovered: string;
  benefits: string;
  warranty: string;
  paymentTerms: QuotationPaymentTerm[];
}

const DEFAULT_PAYMENT_TERMS: QuotationPaymentTerm[] = [
  { term: 'Advance', description: '50% advance before service commencement.' },
  { term: 'Balance', description: 'Balance on completion of treatment.' },
  { term: 'Mode', description: 'Cash / UPI / Bank transfer accepted.' },
];

const AREA_BY_PROPERTY: Record<QuotationPropertyType, string> = {
  'Residential Flat':
    'Living Room | Bedrooms | Kitchen | Bathrooms | Balcony | Utility Area | Store Room',
  'Villa / Bungalow':
    'Living Room | Bedrooms | Kitchen | Bathrooms | Balcony | Terrace | Utility Area | Store Room | Parking | Garden | Compound Area',
  Society:
    'Flats | Shops | Passages | Staircases | Lift Lobby | Parking | Garden | Drainage | Meter Room | Garbage Area | Security Cabin | Common Areas',
  'Hotel / Resort':
    'Rooms | Reception | Lobby | Kitchen | Restaurant | Laundry | Corridors | Store Room | Washrooms',
  'Restaurant / Cafe':
    'Kitchen | Dining Area | Store Room | Counter | Wash Area | Washroom | Food Preparation Area',
  Office:
    'Cabins | Workstations | Reception | Pantry | Meeting Room | Store Room | Washroom',
  Warehouse:
    'Storage Area | Loading Area | Office | Packing Area | Common Area',
  Factory:
    'Production Floor | Storage Area | Loading Bay | Office | Canteen | Common Area | Washroom',
  Hospital:
    'OPD | ICU | Wards | Operation Theatre | Pharmacy | Reception | Pantry | Washrooms | Store Room',
  'School / College':
    'Classrooms | Staff Room | Library | Canteen | Playground | Corridors | Washrooms | Store Room | Reception',
  'Shop / Showroom':
    'Counter | Display Area | Store Room | Washroom | Back Office | Stock Area',
};

const SERVICE_BASE: Record<
  QuotationServiceType,
  Omit<QuotationMasterTemplate, 'areaCovered' | 'paymentTerms'>
> = {
  'General Pest Control': {
    scopeOfWork:
      'Comprehensive gel and spray treatment for common pests in all accessible areas. Includes site inspection, targeted treatment, and post-service recommendations.',
    pestCovered: 'Cockroach | Red Ant | Black Ant | Silverfish | Spider | Lizard',
    benefits:
      'Gel & Spray Treatment | Trained Technicians | Digital Service Report | Odourless Treatment | 100% Service Warranty',
    warranty:
      '100% Service Warranty — free revisit within 30 days if covered pests reappear in treated areas.',
  },
  'Bed Bug Treatment': {
    scopeOfWork:
      'Targeted bed bug treatment using approved chemicals and methods for mattresses, furniture, cracks and harbourage areas. Includes inspection and follow-up guidance.',
    pestCovered: 'Bed Bug | Eggs & Nymphs',
    benefits:
      'Targeted Treatment | Trained Technicians | Digital Service Report | Odourless Options | Follow-up Visit',
    warranty:
      'Free follow-up visit within 15 days if bed bug activity persists in treated areas.',
  },
  'Rodent Control': {
    scopeOfWork:
      'Rodent management programme including baiting stations, trapping, activity monitoring, entry-point identification, and proofing recommendations.',
    pestCovered: 'Rats | Mice | Bandicoot',
    benefits:
      'Baiting & Trapping | Trained Technicians | Digital Service Report | Monitoring & Follow-up | Proofing Advice',
    warranty:
      '30-day follow-up visit included if rodent activity persists in treated zones.',
  },
  'Mosquito Control': {
    scopeOfWork:
      'Mosquito control through fogging/misting, larvicidal treatment at breeding sites, and residual spray in resting areas as applicable.',
    pestCovered: 'Adult Mosquito | Larvae at Breeding Sites',
    benefits:
      'Fogging & Larvicidal Treatment | Trained Technicians | Digital Service Report | Seasonal Follow-up | Odourless Options',
    warranty:
      'Follow-up treatment within 15 days during peak season if required, as per site conditions.',
  },
  'Termite Treatment': {
    scopeOfWork:
      'Anti-termite treatment using drill-fill-seal method (or as per site survey) with wood inspection and colony elimination in accessible areas.',
    pestCovered: 'Subterranean Termite | Drywood Termite',
    benefits:
      'Licensed Chemicals | Drill-Fill-Seal Method | Trained Technicians | Digital Service Report | Long-term Protection',
    warranty:
      '5-year warranty against termite reinfestation in treated structure (terms as per service agreement).',
  },
};

/** Property + service specific overrides (benefits, scope, warranty, etc.) */
const TEMPLATE_OVERRIDES: Partial<
  Record<`${QuotationPropertyType}::${QuotationServiceType}`, Partial<QuotationMasterTemplate>>
> = {
  'Restaurant / Cafe::General Pest Control': {
    benefits:
      'Food Safe Treatment | Gel & Spray Treatment | Odourless | Trained Technicians | Digital Report',
    scopeOfWork:
      'Food-safe gel and spray treatment for kitchen, dining, storage and wash areas. Includes inspection and compliance-friendly application.',
  },
  'Hotel / Resort::General Pest Control': {
    benefits:
      'Guest-Safe Treatment | Gel & Spray Treatment | Odourless | Trained Technicians | Digital Report',
    scopeOfWork:
      'Discreet, odourless pest management for guest rooms, lobby, kitchen and back-of-house areas with minimal disruption.',
  },
  'Hospital::General Pest Control': {
    benefits:
      'Healthcare-Safe Treatment | Gel & Spray Treatment | Trained Technicians | Digital Report | Odourless Options',
    scopeOfWork:
      'Pest management in clinical and non-clinical zones using approved products suitable for healthcare environments.',
  },
  'Society::Rodent Control': {
    scopeOfWork:
      'Society-wide rodent programme covering basements, parking, garbage areas, meter rooms and common passages with bait stations and monitoring.',
  },
  'Warehouse::Rodent Control': {
    scopeOfWork:
      'Warehouse rodent control focusing on storage racks, loading bays, packing areas and perimeter proofing.',
    benefits:
      'Industrial Baiting | Trapping | Perimeter Monitoring | Trained Technicians | Digital Report',
  },
  'Society::Mosquito Control': {
    scopeOfWork:
      'Fogging and larvicidal treatment for society gardens, drainage, parking and common areas during mosquito season.',
  },
  'Hotel / Resort::Mosquito Control': {
    scopeOfWork:
      'Mosquito management for landscaped areas, water bodies, corridors and outdoor guest zones.',
  },
  'Villa / Bungalow::Termite Treatment': {
    scopeOfWork:
      'Pre/post-construction or drill-fill-seal anti-termite treatment for villa structure, wooden fixtures and compound walls.',
  },
  'Society::Termite Treatment': {
    scopeOfWork:
      'Anti-termite treatment for society common areas, basements, compound walls and identified infestation zones.',
  },
  'Factory::Rodent Control': {
    scopeOfWork:
      'Factory rodent programme for production floor, raw material storage, loading bay and canteen with monitoring stations.',
  },
  'Shop / Showroom::General Pest Control': {
    scopeOfWork:
      'Pest treatment for retail counter, display, stock room and customer areas with minimal business disruption.',
  },
};

export function getTemplateKey(
  propertyType: string,
  serviceType: string,
): `${QuotationPropertyType}::${QuotationServiceType}` | null {
  if (
    !QUOTATION_PROPERTY_TYPES.includes(propertyType as QuotationPropertyType) ||
    !QUOTATION_SERVICE_TYPES.includes(serviceType as QuotationServiceType)
  ) {
    return null;
  }
  return `${propertyType as QuotationPropertyType}::${serviceType as QuotationServiceType}`;
}

export function getQuotationTemplate(
  propertyType: string,
  serviceType: string,
): QuotationMasterTemplate | null {
  const key = getTemplateKey(propertyType, serviceType);
  if (!key) return null;

  const areaCovered = AREA_BY_PROPERTY[propertyType as QuotationPropertyType];
  const base = SERVICE_BASE[serviceType as QuotationServiceType];
  const override = TEMPLATE_OVERRIDES[key] ?? {};

  return {
    areaCovered,
    scopeOfWork: override.scopeOfWork ?? base.scopeOfWork,
    pestCovered: override.pestCovered ?? base.pestCovered,
    benefits: override.benefits ?? base.benefits,
    warranty: override.warranty ?? base.warranty,
    paymentTerms: override.paymentTerms ?? [...DEFAULT_PAYMENT_TERMS],
  };
}

export function templateToScopes(template: QuotationMasterTemplate): QuotationScope[] {
  return [
    { title: 'Scope of Work', content: template.scopeOfWork },
    { title: 'Area Covered', content: template.areaCovered },
    { title: 'Pest Covered', content: template.pestCovered },
    { title: 'Benefits', content: template.benefits },
    { title: 'Warranty', content: template.warranty },
  ];
}

export const STRUCTURED_SCOPE_TITLES = [
  'Scope of Work',
  'Area Covered',
  'Pest Covered',
  'Benefits',
  'Warranty',
] as const;

export function hasStructuredScopes(scopes: QuotationScope[]): boolean {
  const titles = new Set(scopes.map((s) => s.title));
  return STRUCTURED_SCOPE_TITLES.every((t) => titles.has(t));
}

/** Map property type to legacy quotation_type for API compatibility */
export function propertyTypeToQuotationType(propertyType: string): QuotationType {
  const map: Record<QuotationPropertyType, QuotationType> = {
    'Residential Flat': 'Residential',
    'Villa / Bungalow': 'Residential',
    Society: 'Society',
    'Hotel / Resort': 'Commercial',
    'Restaurant / Cafe': 'Restaurant',
    Office: 'Office',
    Warehouse: 'Commercial',
    Factory: 'Commercial',
    Hospital: 'Clinic/Hospital',
    'School / College': 'Commercial',
    'Shop / Showroom': 'Commercial',
  };
  return map[propertyType as QuotationPropertyType] ?? 'Commercial';
}

/** All property × service combinations have a resolvable template */
export function listAllTemplateKeys(): string[] {
  return QUOTATION_PROPERTY_TYPES.flatMap((p) =>
    QUOTATION_SERVICE_TYPES.map((s) => `${p}::${s}`),
  );
}

import { PRICING_DATA, PROPERTY_LOCATIONS, SERVICE_TYPES, COMMERCIAL_AREA_OPTION } from '../constants/pricing';
import {
  formatPlanLabel,
  getAllPlanValuesForService,
  getAmcPackageOptions,
  isAmcPlan,
  isBedBugService,
  isTermiteService,
  oneTimePlanValue,
  parseAmcCountFromPlan,
} from '../constants/bookingPropertyTypes';

export interface RateGstDetail {
  amount: string | number;
  gst_percent: string | number;
  price_includes_gst: boolean;
  base_amount: string | number;
  gst_amount: string | number;
  total_with_gst: string | number;
  /** Pricing Master property_category (residential, hotel, corporate, …). */
  property_category?: string;
}

export interface PricingConfig {
  region: 'mumbai' | 'lonavala' | string;
  city: string;
  pricing: Record<string, Record<string, Record<string, number>>>;
  service_types: Record<string, string[]>;
  residential_locations: string[];
  villa_locations: string[];
  rodent_locations: string[];
  /** Nested GST metadata from Pricing Master (service → plan → area). */
  rate_gst?: Record<string, Record<string, Record<string, RateGstDetail>>>;
  source?: string;
}

export const MUMBAI_PRICING_CONFIG: PricingConfig = {
  region: 'mumbai',
  city: 'Mumbai',
  pricing: PRICING_DATA,
  service_types: SERVICE_TYPES,
  residential_locations: PROPERTY_LOCATIONS,
  villa_locations: [],
  rodent_locations: ['Society Area', 'Windows'],
};

export const SERVICE_PACKAGE_OPTIONS = Object.keys(PRICING_DATA);

/** Service packages available for the active city pricing config. */
export function getServicePackageOptions(
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): string[] {
  return Object.keys(config.pricing || {});
}

export { COMMERCIAL_AREA_OPTION } from '../constants/pricing';

export const SERVICE_PACKAGE_TO_PESTS: Record<string, string[]> = {
  'Cockroach / Ants': ['Cockroach', 'Ants'],
  'Cockroach Standard': ['Cockroach', 'Ants'],
  'Cockroach Premium': ['Cockroach', 'Ants'],
  'Bed Bugs': ['Bed Bug'],
  'Termite': ['Termite'],
  'Termite Spot Treatment': ['Termite'],
  'Rodent': ['Rodent'],
  'Regular Rodent': ['Rodent'],
  'Kill-Rodent System': ['Rodent'],
  'Mosquito': ['Mosquito'],
  'Mosquito Cold Fogging': ['Mosquito'],
  'Mosquito Thermal Fogging': ['Mosquito'],
  'Hotel / Commercial': [],
};

/**
 * Legacy booking labels → preferred 2026 Pricing Master packages (priority order).
 * Lookups try each candidate that exists in the live config — never invent rates.
 */
export const LEGACY_SERVICE_PACKAGE_ALIASES: Record<string, string[]> = {
  'Cockroach / Ants': ['Cockroach Standard', 'Cockroach Premium'],
  Cockroach: ['Cockroach Standard', 'Cockroach Premium'],
  Ants: ['Cockroach Standard', 'Cockroach Premium'],
  Rodent: ['Regular Rodent', 'Kill-Rodent System'],
  Mosquito: ['Mosquito Cold Fogging', 'Mosquito Thermal Fogging'],
  Termite: ['Termite Spot Treatment', 'Termite'],
  'General Pest': ['General Pest Control'],
};

/** Resolve a stored service label to a package key present in the live rate matrix. */
export function resolvePricingService(
  service: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): string {
  const name = (service || '').trim();
  if (!name) return name;
  const pricing = config.pricing || {};
  if (pricing[name]) return name;

  const aliases = LEGACY_SERVICE_PACKAGE_ALIASES[name] || [];
  for (const candidate of aliases) {
    if (pricing[candidate]) return candidate;
  }

  const lower = name.toLowerCase();
  const fuzzy: string[] = [];
  if (lower.includes('cockroach') || lower === 'ants' || lower === 'ant') {
    fuzzy.push('Cockroach Standard', 'Cockroach Premium');
  } else if (lower.includes('rodent') || lower === 'rat' || lower === 'rats') {
    fuzzy.push('Regular Rodent', 'Kill-Rodent System');
  } else if (lower.includes('mosquito')) {
    fuzzy.push('Mosquito Cold Fogging', 'Mosquito Thermal Fogging');
  } else if (lower.includes('termite')) {
    fuzzy.push('Termite Spot Treatment', 'Termite');
  }
  for (const candidate of fuzzy) {
    if (pricing[candidate]) return candidate;
  }
  return name;
}

function isHotelLikeArea(area: string): boolean {
  return /hotel|restaurant|cloud kitchen/i.test(area);
}

function isCorporateLikeArea(area: string): boolean {
  return /corporate|office|bank|retail|warehouse|school|factory|outlet|dark store|multi.?site/i.test(
    area,
  );
}

function isHospitalLikeArea(area: string): boolean {
  return /hospital|clinic|ward/i.test(area);
}

function isSocietyLikeArea(area: string): boolean {
  return /^(small|medium|large)$/i.test(area.trim());
}

/** Pricing Master categories that belong to each booking commercial_type. */
export function propertyCategoriesForCommercialType(commercialType: string): string[] {
  switch (commercialType) {
    case 'home':
      return ['residential'];
    case 'villa':
      return ['villa', 'residential', 'fogging'];
    case 'hotel':
      return ['hotel', 'hospital'];
    case 'office':
      return ['corporate', 'corporate_monthly'];
    case 'society':
      return ['society'];
    case 'other':
      return ['hotel', 'hospital', 'corporate', 'corporate_monthly', 'commercial'];
    default:
      return ['residential'];
  }
}

/** Areas under a (possibly aliased) service in the live pricing matrix. */
export function areasFromPricingMatrix(
  service: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): string[] {
  const resolved = resolvePricingService(service, config);
  const serviceData = config.pricing?.[resolved] || config.pricing?.[service];
  if (!serviceData) return [];
  const areas = new Set<string>();
  for (const planData of Object.values(serviceData)) {
    if (planData && typeof planData === 'object') {
      Object.keys(planData as Record<string, number>).forEach((a) => areas.add(a));
    }
  }
  return Array.from(areas);
}

/**
 * Prefer property_category from rate_gst (Pricing Master). Fall back to area-key
 * heuristics when GST metadata is missing (legacy hardcoded config).
 */
export function filterAreasForCommercialType(
  areas: string[],
  commercialType: string,
  service?: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): string[] {
  const allowed = new Set(propertyCategoriesForCommercialType(commercialType));
  const resolved = service ? resolvePricingService(service, config) : '';
  const gstTree = resolved
    ? config.rate_gst?.[resolved] || config.rate_gst?.[service || '']
    : undefined;

  if (gstTree) {
    const areaAllow = areas.length > 0 ? new Set(areas) : null;
    const byCategory: string[] = [];
    const seen = new Set<string>();
    for (const planData of Object.values(gstTree)) {
      if (!planData || typeof planData !== 'object') continue;
      for (const [area, detail] of Object.entries(planData)) {
        if (areaAllow && !areaAllow.has(area)) continue;
        const category = (detail as RateGstDetail)?.property_category || '';
        if (category && allowed.has(category) && !seen.has(area)) {
          seen.add(area);
          byCategory.push(area);
        }
      }
    }
    // When the caller passed a candidate list, only return category matches
    // inside that list. When called with matrix areas for one service, this
    // is the full commercial/home band set.
    if (byCategory.length > 0) return byCategory;
  }

  if (commercialType === 'home') {
    return areas.filter(
      (a) =>
        a !== COMMERCIAL_AREA_OPTION &&
        !isHotelLikeArea(a) &&
        !isCorporateLikeArea(a) &&
        !isHospitalLikeArea(a) &&
        !isSocietyLikeArea(a),
    );
  }
  if (commercialType === 'hotel') {
    return areas.filter((a) => isHotelLikeArea(a) || isHospitalLikeArea(a));
  }
  if (commercialType === 'office') {
    return areas.filter((a) => isCorporateLikeArea(a));
  }
  if (commercialType === 'society') {
    return areas.filter((a) => isSocietyLikeArea(a));
  }
  if (commercialType === 'other') {
    return areas.filter(
      (a) =>
        isHotelLikeArea(a) ||
        isCorporateLikeArea(a) ||
        isHospitalLikeArea(a) ||
        a === COMMERCIAL_AREA_OPTION,
    );
  }
  return areas.filter(
    (a) =>
      a !== COMMERCIAL_AREA_OPTION &&
      !isHotelLikeArea(a) &&
      !isCorporateLikeArea(a) &&
      !isHospitalLikeArea(a),
  );
}

/** Office/hotel/society/other commercial bookings — legacy Commercial catch-all. */
export const COMMERCIAL_PROPERTY_TYPES = new Set(['office', 'other', 'hotel', 'society']);

export function usesCommercialAreaOption(commercialType: string): boolean {
  return COMMERCIAL_PROPERTY_TYPES.has(commercialType);
}

function appendCommercialAreaOption(
  options: string[],
  commercialType: string,
  selectedServices: string[],
  config?: PricingConfig,
): string[] {
  // Live Pricing Master configs expose real commercial bands — do not invent
  // a "Commercial" catch-all that has no rate in the 2026 chart.
  if (config?.source === 'database') return options;
  if (!usesCommercialAreaOption(commercialType)) return options;
  const residential = selectedServices.filter(
    (s) => s !== 'Rodent' && s !== 'Hotel / Commercial',
  );
  if (residential.length === 0) return options;
  if (options.includes(COMMERCIAL_AREA_OPTION)) return options;
  return [...options, COMMERCIAL_AREA_OPTION];
}

export interface ServicePriceLine {
  service: string;
  price: number;
  plan?: string;
  area?: string;
  note?: string;
  baseAmount?: number;
  discount?: number;
}

/** Per-service plan/area/pricing (create & edit booking forms). */
export interface ServiceItemConfig {
  service: string;
  plan: string;
  area: string;
  /** Catalog / staff base price before discount. */
  baseAmount: number;
  /** Discount belonging only to this service. */
  discount: number;
  /** Net final price (baseAmount - discount). Ledger uses this. */
  amount: number;
}

export interface ServicePricingTotals {
  subtotal: number;
  totalDiscount: number;
  finalAmount: number;
}

export function roundMoney(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** Clamp discount and compute net amount for one service line. */
export function finalizeServiceLinePricing(
  baseAmount: number,
  discount: number,
): Pick<ServiceItemConfig, 'baseAmount' | 'discount' | 'amount'> {
  const base = Math.max(0, roundMoney(baseAmount || 0));
  const rawDiscount = Math.max(0, roundMoney(discount || 0));
  const clamped = Math.min(rawDiscount, base);
  return {
    baseAmount: base,
    discount: clamped,
    amount: roundMoney(base - clamped),
  };
}

export function summarizeServicePricing(items: ServiceItemConfig[]): ServicePricingTotals {
  const subtotal = roundMoney(items.reduce((sum, i) => sum + (i.baseAmount ?? i.amount ?? 0), 0));
  const totalDiscount = roundMoney(items.reduce((sum, i) => sum + (i.discount ?? 0), 0));
  const finalAmount = roundMoney(items.reduce((sum, i) => sum + (i.amount ?? 0), 0));
  return { subtotal, totalDiscount, finalAmount };
}

/**
 * Merge catalog rates into existing lines without wiping per-service discounts.
 * Plan/area change → refresh base from catalog, keep discount (clamped).
 * Same plan/area → keep staff base + discount overrides.
 */
export function mergeCatalogIntoServiceItems(
  catalogItems: ServiceItemConfig[],
  previous: ServiceItemConfig[],
): ServiceItemConfig[] {
  return catalogItems.map((cat) => {
    const prev = previous.find((p) => p.service === cat.service);
    const catalogBase = roundMoney(cat.baseAmount ?? cat.amount ?? 0);
    if (!prev) {
      return {
        service: cat.service,
        plan: cat.plan,
        area: cat.area,
        ...finalizeServiceLinePricing(catalogBase, 0),
      };
    }
    const planAreaChanged = prev.plan !== cat.plan || prev.area !== cat.area;
    if (planAreaChanged) {
      return {
        service: cat.service,
        plan: cat.plan,
        area: cat.area,
        ...finalizeServiceLinePricing(catalogBase, prev.discount || 0),
      };
    }
    const base = prev.baseAmount != null ? prev.baseAmount : catalogBase;
    return {
      service: cat.service,
      plan: cat.plan,
      area: cat.area,
      ...finalizeServiceLinePricing(base, prev.discount || 0),
    };
  });
}

export type ServiceConfigMap = Record<string, { plan: string; area: string }>;

/** Termite uses "One Time Treatment" in booking UI; pricing master uses "One Time Service". */
export function pricingPlanCandidates(service: string, plan: string): string[] {
  const svc = (service || '').toLowerCase();
  const candidates = [plan];
  if (plan === 'One Time Treatment') candidates.push('One Time Service');
  if (plan === 'One Time Service' && svc.includes('termite')) {
    candidates.push('One Time Treatment');
  }
  return [...new Set(candidates.filter(Boolean))];
}

export function resolvePlanForPricing(
  service: string,
  plan: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): string {
  const resolved = resolvePricingService(service, config);
  const serviceData = config.pricing[resolved] || config.pricing[service];
  if (!serviceData) return plan;
  if (serviceData[plan]) return plan;
  for (const candidate of pricingPlanCandidates(service, plan)) {
    if (serviceData[candidate]) return candidate;
  }
  return plan;
}

export function getUnitPrice(
  service: string,
  pricingType: string,
  pricingArea: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): number | null {
  const resolved = resolvePricingService(service, config);
  const serviceData = config.pricing[resolved] || config.pricing[service];
  if (!serviceData) return null;

  for (const planKey of pricingPlanCandidates(service, pricingType)) {
    const typeData = serviceData[planKey];
    if (typeData === undefined) continue;
    if (typeof typeData === 'number') return typeData;
    if (typeof typeData === 'object' && pricingArea in typeData) {
      const value = (typeData as Record<string, number>)[pricingArea];
      if (typeof value === 'number') return value;
    }
  }
  return null;
}

export function getSharedPricingTypes(
  selectedServices: string[],
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): string[] {
  if (selectedServices.length === 0) return [];
  let shared: string[] | null = null;
  for (const service of selectedServices) {
    const resolved = resolvePricingService(service, config);
    const types = Object.keys(config.pricing[resolved] || config.pricing[service] || {});
    if (shared === null) {
      shared = types;
    } else {
      shared = shared.filter((t) => types.includes(t));
    }
  }
  return shared ?? [];
}

export function getAreaOptions(
  selectedServices: string[],
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
  commercialType = 'home',
): string[] {
  if (!selectedServices.length) return [];

  // Prefer live Pricing Master areas, filtered by booking type / property category.
  const fromMatrix: string[] = [];
  for (const service of selectedServices) {
    const raw = areasFromPricingMatrix(service, config);
    if (!raw.length) continue;
    fromMatrix.push(...filterAreasForCommercialType(raw, commercialType, service, config));
  }
  if (fromMatrix.length > 0) {
    return Array.from(new Set(fromMatrix));
  }

  // Legacy hardcoded fallback (pre-2026 Mumbai/Lonavala constants only).
  if (config.region === 'lonavala') {
    const options: string[] = [];
    const hasRodent = selectedServices.some(
      (s) => s === 'Rodent' || s.toLowerCase().includes('rodent'),
    );
    const hasCommercial = selectedServices.includes('Hotel / Commercial');
    const residential = selectedServices.filter(
      (s) => s !== 'Rodent' && s !== 'Hotel / Commercial',
    );

    if (commercialType === 'villa') {
      if (selectedServices.some((s) => /cockroach|ants/i.test(s))) {
        options.push(...config.villa_locations);
      }
      if (selectedServices.some((s) => /mosquito/i.test(s))) {
        options.push(
          'Up to 1,000 Sq.Ft.',
          '1,001-2,000 Sq.Ft.',
          '2,001-5,000 Sq.Ft.',
          '5,001-10,000 Sq.Ft.',
        );
      }
      if (hasRodent) options.push(...config.rodent_locations);
      if (residential.some((s) => /bed bug|termite/i.test(s))) {
        options.push('1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK');
      }
    } else if (commercialType === 'home') {
      if (residential.length > 0) {
        if (residential.some((s) => /bed bug|termite/i.test(s))) {
          options.push('1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK');
        }
        if (residential.some((s) => /cockroach|ants|mosquito/i.test(s))) {
          options.push(...config.residential_locations);
        }
      }
      if (hasRodent) options.push(...config.rodent_locations);
      if (hasCommercial) options.push('Commercial Space');
    }

    return appendCommercialAreaOption(
      Array.from(new Set(options)),
      commercialType,
      selectedServices,
      config,
    );
  }

  if (commercialType !== 'home') {
    // No chart areas for this commercial service — do not invent BHK sizes.
    return [];
  }

  const hasRodent = selectedServices.some(
    (s) => s === 'Rodent' || s.toLowerCase().includes('rodent'),
  );
  const hasCommercial = selectedServices.includes('Hotel / Commercial');
  const residential = selectedServices.filter(
    (s) => s !== 'Rodent' && s !== 'Hotel / Commercial',
  );

  const options = new Set<string>();
  if (residential.length > 0) {
    config.residential_locations.forEach((loc) => options.add(loc));
  }
  if (hasRodent) {
    config.rodent_locations.forEach((loc) => options.add(loc));
  }
  if (hasCommercial) {
    options.add('Commercial Space');
  }

  return appendCommercialAreaOption(
    Array.from(options),
    commercialType,
    selectedServices,
    config,
  );
}

/** Prefer one-time when multiple plan types are available (e.g. Cockroach). */
export function getDefaultPricingType(
  selectedServices: string[],
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): string {
  const types = getSharedPricingTypes(selectedServices, config);
  if (types.length === 0) return '';
  if (types.includes('One Time Service')) return 'One Time Service';
  return types[0];
}

/** Plan types available for a single service package (PRD options + pricing API). */
export function getPricingTypesForService(
  service: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): string[] {
  const resolved = resolvePricingService(service, config);
  const fromBooking = getAllPlanValuesForService(service);
  const fromConfig = Object.keys(config.pricing[resolved] || config.pricing[service] || {});
  const merged = [...new Set([...fromBooking, ...fromConfig])];
  const order = (p: string) => {
    if (p.toLowerCase().includes('one time')) return 0;
    const m = p.match(/(\d+)/);
    return m ? Number(m[1]) : 99;
  };
  return merged.sort((a, b) => order(a) - order(b));
}

/**
 * AMC plans the live rate card holds for this service, for the Service Mode
 * dropdown on the booking form.
 *
 * This used to come from `SERVICE_AMC_PACKAGES`, a hardcoded map keyed on the
 * pre-2026 service names ('Cockroach / Ants', 'Rodent', 'Mosquito'). The 2026
 * rate chart renamed those into tiers — 'Cockroach Standard', 'Cockroach
 * Premium' — so nothing the picker can now offer matched a key, and every
 * service silently lost its AMC option even though the rates exist.
 *
 * Reading the rate card instead means a service gets AMC exactly when it has
 * AMC rates, with no name list to keep in step. The hardcoded packages remain
 * the fallback for a service the rate card does not cover at all, so anything
 * priced by hand keeps working.
 */
export function amcPlanOptionsForService(
  service: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): Array<{ value: string; label: string }> {
  // Both are fixed-shape packages with no AMC variant; the form renders them
  // as a static box rather than a dropdown.
  if (isBedBugService(service) || isTermiteService(service)) return [];

  const resolved = resolvePricingService(service, config);
  const fromConfig = Object.keys(
    config.pricing?.[resolved] ?? config.pricing?.[service] ?? {},
  );
  if (fromConfig.length === 0) return getAmcPackageOptions(service);

  return fromConfig
    .filter(isAmcPlan)
    .sort((a, b) => (parseAmcCountFromPlan(a) ?? 99) - (parseAmcCountFromPlan(b) ?? 99))
    .map((plan) => ({ value: plan, label: formatPlanLabel(service, plan) }));
}

/** Whether the Service Mode dropdown should offer AMC for this service. */
export function serviceSupportsAmc(
  service: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): boolean {
  return amcPlanOptionsForService(service, config).length > 0;
}

/**
 * The one-time plan this service is actually priced under.
 *
 * Most services use 'One Time Service' and termite uses 'One Time Treatment',
 * but a service from the rate card may have no one-time rate at all (the
 * recurring-only contract plans). Falling back to the first available plan
 * keeps the form from selecting a plan that has no price behind it.
 */
export function oneTimePlanForService(
  service: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): string {
  const preferred = oneTimePlanValue(service);
  const resolved = resolvePricingService(service, config);
  const fromConfig = Object.keys(
    config.pricing?.[resolved] ?? config.pricing?.[service] ?? {},
  );
  if (fromConfig.length === 0 || fromConfig.includes(preferred)) return preferred;

  return fromConfig.find((plan) => !isAmcPlan(plan)) ?? fromConfig[0] ?? preferred;
}

/** Area options for one service (not intersected across services). */
export function getAreaOptionsForService(
  service: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
  commercialType = 'home',
): string[] {
  return getAreaOptions([service], config, commercialType);
}

/**
 * Selecting a service always starts on its one-time plan — AMC is an explicit
 * choice, never inferred. The config is consulted so a recurring-only service
 * does not start on a plan it has no rate for.
 */
export function getDefaultPlanForService(
  service: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): string {
  return oneTimePlanForService(service, config);
}

export function createDefaultServiceConfig(
  service: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): { plan: string; area: string } {
  return { plan: getDefaultPlanForService(service, config), area: '' };
}

export function buildServiceConfigMap(
  selectedServices: string[],
  prev: ServiceConfigMap,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
  commercialType = 'home',
): ServiceConfigMap {
  const next: ServiceConfigMap = {};
  for (const service of selectedServices) {
    const existing = prev[service];
    const planTypes = getPricingTypesForService(service, config);
    let plan = existing?.plan || getDefaultPlanForService(service, config);
    if (!planTypes.includes(plan)) {
      const resolved = resolvePlanForPricing(service, plan, config);
      plan = planTypes.includes(resolved)
        ? resolved
        : planTypes.find((p) => p.toLowerCase().includes('one time')) || planTypes[0] || plan;
    }
    const areas = getAreaOptionsForService(service, config, commercialType);
    let area = existing?.area || '';
    if (area && areas.length > 0 && !areas.includes(area)) {
      area = '';
    }
    next[service] = { plan, area };
  }
  return next;
}

export function computePerServicePricing(
  serviceConfigs: ServiceConfigMap,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): { total: number; lines: ServicePriceLine[]; items: ServiceItemConfig[] } {
  const lines: ServicePriceLine[] = [];
  const items: ServiceItemConfig[] = [];

  for (const [service, { plan, area }] of Object.entries(serviceConfigs)) {
    if (!plan || !area) {
      lines.push({
        service,
        plan,
        area,
        price: 0,
        baseAmount: 0,
        discount: 0,
        note: !plan ? 'Select service type' : 'Select area',
      });
      continue;
    }
    const unit = getUnitPrice(service, plan, area, config);
    if (unit === null) {
      lines.push({
        service,
        plan,
        area,
        price: 0,
        baseAmount: 0,
        discount: 0,
        note: 'Rate not available for this area/type',
      });
      items.push({
        service,
        plan,
        area,
        ...finalizeServiceLinePricing(0, 0),
      });
      continue;
    }
    if (unit === 0) {
      lines.push({
        service,
        plan,
        area,
        price: 0,
        baseAmount: 0,
        discount: 0,
        note:
          service === 'Hotel / Commercial'
            ? 'Inspection required'
            : 'Price after visit',
      });
      items.push({
        service,
        plan,
        area,
        ...finalizeServiceLinePricing(0, 0),
      });
      continue;
    }
    const priced = finalizeServiceLinePricing(unit, 0);
    lines.push({
      service,
      plan,
      area,
      price: priced.amount,
      baseAmount: priced.baseAmount,
      discount: priced.discount,
    });
    items.push({ service, plan, area, ...priced });
  }

  const total = lines.reduce((sum, line) => sum + line.price, 0);
  return { total: roundMoney(total), lines, items };
}

export function getRateGstDetail(
  service: string,
  plan: string,
  area: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): RateGstDetail | null {
  const gstTree = config.rate_gst;
  if (!gstTree) return null;
  const resolved = resolvePricingService(service, config);
  const candidates = pricingPlanCandidates(service, plan);
  for (const pkg of [resolved, service]) {
    for (const p of candidates) {
      const detail = gstTree[pkg]?.[p]?.[area];
      if (detail) return detail;
    }
  }
  return null;
}

/** Aggregate GST base / tax / total for configured service lines. */
export function computeBookingGstSummary(
  serviceConfigs: ServiceConfigMap,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): { base: number; gst: number; total: number; hasGstMeta: boolean } {
  let base = 0;
  let gst = 0;
  let total = 0;
  let hasGstMeta = false;

  for (const [service, { plan, area }] of Object.entries(serviceConfigs)) {
    if (!plan || !area) continue;
    const detail = getRateGstDetail(service, plan, area, config);
    if (detail) {
      hasGstMeta = true;
      base += Number(detail.base_amount) || 0;
      gst += Number(detail.gst_amount) || 0;
      total += Number(detail.total_with_gst) || 0;
      continue;
    }
    const unit = getUnitPrice(service, plan, area, config);
    if (unit != null && unit > 0) {
      total += unit;
      base += unit;
    }
  }

  return {
    base: Math.round(base * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    total: Math.round(total * 100) / 100,
    hasGstMeta,
  };
}

export function deriveServiceCategoryFromItems(
  items: Array<Pick<ServiceItemConfig, 'service' | 'plan'>>,
): 'AMC' | 'One-Time Service' {
  const hasAmc = items.some(
    (item) =>
      item.plan === 'AMC 3 Services' ||
      item.plan.toLowerCase().includes('amc'),
  );
  return hasAmc ? 'AMC' : 'One-Time Service';
}

export function validateServiceConfigs(
  selectedServices: string[],
  serviceConfigs: ServiceConfigMap,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
  options?: {
    /** When true, missing catalog rates do not block save (manual Base Price). */
    allowMissingRates?: boolean;
    /** When true, area can be empty (post-visit commercial price entry). */
    allowMissingArea?: boolean;
  },
): string[] {
  const errors: string[] = [];
  const allowMissingRates = options?.allowMissingRates === true;
  const allowMissingArea = options?.allowMissingArea === true;
  for (const service of selectedServices) {
    const cfg = serviceConfigs[service];
    if (!cfg?.plan) {
      errors.push(`${service}: select a service type.`);
      continue;
    }
    if (!cfg.area) {
      if (!allowMissingArea) {
        errors.push(`${service}: select an area.`);
      }
      continue;
    }
    const unit = getUnitPrice(service, cfg.plan, cfg.area, config);
    if (unit === null) {
      if (allowMissingRates) continue;
      const planL = cfg.plan.toLowerCase();
      // AMC packages / termite may not exist in Pricing Master yet — allow manual total
      if (planL.includes('amc') || planL.includes('one time treatment')) {
        continue;
      }
      errors.push(`${service}: pricing rate not found in Pricing Master.`);
    }
  }
  return errors;
}

export function serviceItemsToConfigMap(
  items: ServiceItemConfig[],
): ServiceConfigMap {
  const map: ServiceConfigMap = {};
  for (const item of items) {
    map[item.service] = { plan: item.plan, area: item.area };
  }
  return map;
}

/** Align per-service line amounts with a manually overridden booking total.
 * Clears per-service discounts (total override replaces service-level pricing). */
export function syncServiceItemAmountsToTotal(
  items: ServiceItemConfig[],
  total: number,
): ServiceItemConfig[] {
  if (!items.length) return items;

  const target = roundMoney(total);
  if (items.length === 1) {
    return [{
      ...items[0],
      ...finalizeServiceLinePricing(target, 0),
    }];
  }

  const autoTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  if (autoTotal <= 0) {
    return items.map((item, index) => ({
      ...item,
      ...finalizeServiceLinePricing(index === 0 ? target : 0, 0),
    }));
  }

  const adjusted = items.map((item) => {
    const share = roundMoney(((item.amount || 0) / autoTotal) * target);
    return {
      ...item,
      ...finalizeServiceLinePricing(share, 0),
    };
  });
  const sum = adjusted.reduce((s, item) => s + item.amount, 0);
  const diff = roundMoney(target - sum);
  if (diff !== 0) {
    const last = adjusted[adjusted.length - 1];
    adjusted[adjusted.length - 1] = {
      ...last,
      ...finalizeServiceLinePricing(roundMoney(last.amount + diff), 0),
    };
  }
  return adjusted;
}

export function priceLinesFromServiceItems(
  items: ServiceItemConfig[],
  templateLines: ServicePriceLine[] = [],
): ServicePriceLine[] {
  return items.map((item) => {
    const template = templateLines.find((line) => line.service === item.service);
    return {
      service: item.service,
      plan: item.plan,
      area: item.area,
      price: item.amount,
      baseAmount: item.baseAmount,
      discount: item.discount,
      note: template?.note,
    };
  });
}

/** Normalize API/legacy service_items into ServiceItemConfig with base/discount/amount. */
export function normalizeServiceItemConfig(
  item: Partial<ServiceItemConfig> & { service: string; plan: string; area: string; amount?: number; base_amount?: number },
): ServiceItemConfig {
  const amount = roundMoney(Number(item.amount ?? 0) || 0);
  const explicitBase = item.baseAmount ?? item.base_amount;
  const discount = Number(item.discount ?? 0) || 0;
  const base =
    explicitBase != null && !Number.isNaN(Number(explicitBase))
      ? Number(explicitBase)
      : amount + discount;
  return {
    service: item.service,
    plan: item.plan,
    area: item.area,
    ...finalizeServiceLinePricing(base, discount),
  };
}

/** Backfill per-service config from legacy single plan/area bookings. */
export function legacyServiceConfigFromJob(
  packages: string[],
  bhkSize: string,
  serviceCategory?: string,
  pricingType?: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): ServiceConfigMap {
  let plan = pricingType || 'One Time Service';
  if (!pricingType && serviceCategory === 'AMC') {
    plan = 'AMC 3 Services';
  }
  const map: ServiceConfigMap = {};
  for (const pkg of packages) {
    const types = getPricingTypesForService(pkg, config);
    const resolvedPlan = types.includes(plan) ? plan : getDefaultPlanForService(pkg, config);
    map[pkg] = { plan: resolvedPlan, area: bhkSize || '' };
  }
  return map;
}

export function computeMultiServicePricing(
  selectedServices: string[],
  pricingType: string,
  pricingArea: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): { total: number; lines: ServicePriceLine[] } {
  const lines: ServicePriceLine[] = [];

  for (const service of selectedServices) {
    const unit = getUnitPrice(service, pricingType, pricingArea, config);
    if (unit === null) {
      lines.push({
        service,
        price: 0,
        note: 'Rate not available for this area/type',
      });
      continue;
    }
    if (unit === 0) {
      lines.push({
        service,
        price: 0,
        note:
          service === 'Hotel / Commercial'
            ? 'Inspection required'
            : 'Price after visit',
      });
      continue;
    }
    lines.push({ service, price: unit });
  }

  const total = lines.reduce((sum, line) => sum + line.price, 0);
  return { total, lines };
}

export function pestsFromPackages(packages: string[]): string[] {
  const pests = new Set<string>();
  for (const pkg of packages) {
    (SERVICE_PACKAGE_TO_PESTS[pkg] || []).forEach((p) => pests.add(p));
  }
  return Array.from(pests);
}

/**
 * Parse stored service_type into pricing package labels (create + edit forms).
 *
 * Pass the live config so services from Pricing Master are recognised. Matching
 * only against the hardcoded list dropped the selection when reopening a
 * booking made with a 2026 service such as "Cockroach Premium".
 */
export function parsePackagesFromServiceType(
  serviceType: string,
  config?: PricingConfig,
): string[] {
  if (!serviceType?.trim()) return [];

  const known = new Set([
    ...SERVICE_PACKAGE_OPTIONS,
    ...Object.keys(config?.pricing || {}),
  ]);
  const parts = serviceType.split(',').map((s) => s.trim()).filter(Boolean);
  const direct = parts.filter((p) => known.has(p));
  if (direct.length > 0) return direct;

  // Legacy rows store pest names ("Cockroach, Ants") rather than package labels.
  // Prefer the historic package label when several chart tiers share the same pests.
  const preferredInfer = [
    'Cockroach / Ants',
    'Bed Bugs',
    'Termite',
    'Rodent',
    'Mosquito',
  ];
  const inferred = new Set<string>();
  for (const part of parts) {
    const matches = Object.entries(SERVICE_PACKAGE_TO_PESTS)
      .filter(([, pests]) => pests.includes(part))
      .map(([pkg]) => pkg);
    const preferred = preferredInfer.find((p) => matches.includes(p));
    if (preferred) inferred.add(preferred);
    else matches.forEach((pkg) => inferred.add(pkg));
  }
  if (inferred.size > 0) return Array.from(inferred);

  // Neither a known package nor a pest name: a Pricing Master service that this
  // caller has no config for yet. Keep the labels — returning nothing would
  // clear the booking's services the moment the form is saved.
  return parts;
}

/** Legacy single-package type list (for reference). */
export function typesForPackage(
  service: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): string[] {
  const resolved = resolvePricingService(service, config);
  return (
    config.service_types[resolved]
    || config.service_types[service]
    || Object.keys(config.pricing[resolved] || config.pricing[service] || {})
  );
}

/**
 * Commercial bookings use the same per-service pricing boxes as Home once
 * Pricing Master rates exist. Legacy hardcoded cards still auto-price homes
 * (and Lonavala villas) only.
 */
export function supportsAutoPricing(
  commercialType: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): boolean {
  if (commercialType === 'home') return true;
  if (config.region === 'lonavala' && commercialType === 'villa') return true;
  // Database / 2026 chart: hotel, office, society, other get catalog prices.
  if (config.source === 'database') {
    return ['hotel', 'office', 'society', 'other', 'villa'].includes(commercialType);
  }
  return false;
}

/**
 * Whether Edit Booking should show the same Base / Discount / Total Price
 * controls as residential. Commercial historically used “price after visit”
 * (estimated) — once the booking is Done, staff must be able to enter the
 * final price the same way as Home, even without catalog auto-pricing.
 */
export function allowsEditableServicePricing(
  commercialType: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
  options?: { status?: string | null },
): boolean {
  if (supportsAutoPricing(commercialType, config)) return true;
  const status = String(options?.status || '').trim().toLowerCase();
  if (status === 'done') return true;
  return false;
}

export const BHK_AREA_VALUES = [
  '1 RK',
  '1 BHK',
  '2 BHK',
  '3 BHK',
  '4 BHK',
  '5 BHK',
  '6 BHK',
  '7 BHK',
  '8 BHK',
  '9 BHK',
  '10 BHK',
];

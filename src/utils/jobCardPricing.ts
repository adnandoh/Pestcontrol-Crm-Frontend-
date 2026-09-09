import { PRICING_DATA, PROPERTY_LOCATIONS, SERVICE_TYPES, COMMERCIAL_AREA_OPTION } from '../constants/pricing';
import { getAllPlanValuesForService, oneTimePlanValue } from '../constants/bookingPropertyTypes';

export interface RateGstDetail {
  amount: string | number;
  gst_percent: string | number;
  price_includes_gst: boolean;
  base_amount: string | number;
  gst_amount: string | number;
  total_with_gst: string | number;
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
  'Bed Bugs': ['Bed Bug'],
  'Termite': ['Termite'],
  'Rodent': ['Rodent'],
  'Mosquito': ['Mosquito'],
  'Hotel / Commercial': [],
};

/** Office/hotel/society/other commercial bookings get a Commercial area option. */
export const COMMERCIAL_PROPERTY_TYPES = new Set(['office', 'other', 'hotel', 'society']);

export function usesCommercialAreaOption(commercialType: string): boolean {
  return COMMERCIAL_PROPERTY_TYPES.has(commercialType);
}

function appendCommercialAreaOption(
  options: string[],
  commercialType: string,
  selectedServices: string[],
): string[] {
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
  const serviceData = config.pricing[service];
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
  const serviceData = config.pricing[service];
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
    const types = Object.keys(config.pricing[service] || {});
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

  if (config.region === 'lonavala') {
    const options: string[] = [];
    const hasRodent = selectedServices.includes('Rodent');
    const hasCommercial = selectedServices.includes('Hotel / Commercial');
    const residential = selectedServices.filter(
      (s) => s !== 'Rodent' && s !== 'Hotel / Commercial',
    );

    if (commercialType === 'villa') {
      if (selectedServices.includes('Cockroach / Ants')) {
        options.push(...config.villa_locations);
      }
      if (selectedServices.includes('Mosquito')) {
        options.push(
          'Up to 1,000 Sq.Ft.',
          '1,001-2,000 Sq.Ft.',
          '2,001-5,000 Sq.Ft.',
          '5,001-10,000 Sq.Ft.',
        );
      }
      if (hasRodent) {
        options.push(...config.rodent_locations);
      }
      if (residential.some((s) => ['Bed Bugs', 'Termite'].includes(s))) {
        options.push('1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK');
      }
    } else {
      if (residential.length > 0) {
        if (residential.some((s) => ['Bed Bugs', 'Termite'].includes(s))) {
          options.push('1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK');
        }
        if (residential.some((s) => ['Cockroach / Ants', 'Mosquito'].includes(s))) {
          options.push(...config.residential_locations);
        }
      }
      if (hasRodent) {
        options.push(...config.rodent_locations);
      }
      if (hasCommercial) {
        options.push('Commercial Space');
      }
    }

    return appendCommercialAreaOption(
      Array.from(new Set(options)),
      commercialType,
      selectedServices,
    );
  }

  const hasRodent = selectedServices.includes('Rodent');
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
  const fromBooking = getAllPlanValuesForService(service);
  const fromConfig = Object.keys(config.pricing[service] || {});
  const merged = [...new Set([...fromBooking, ...fromConfig])];
  const order = (p: string) => {
    if (p.toLowerCase().includes('one time')) return 0;
    const m = p.match(/(\d+)/);
    return m ? Number(m[1]) : 99;
  };
  return merged.sort((a, b) => order(a) - order(b));
}

/** Area options for one service (not intersected across services). */
export function getAreaOptionsForService(
  service: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
  commercialType = 'home',
): string[] {
  return getAreaOptions([service], config, commercialType);
}

export function getDefaultPlanForService(
  service: string,
  _config?: PricingConfig,
): string {
  void _config;
  return oneTimePlanValue(service);
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
  const candidates = pricingPlanCandidates(service, plan);
  for (const p of candidates) {
    const detail = gstTree[service]?.[p]?.[area];
    if (detail) return detail;
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
): string[] {
  const errors: string[] = [];
  for (const service of selectedServices) {
    const cfg = serviceConfigs[service];
    if (!cfg?.plan) {
      errors.push(`${service}: select a service type.`);
      continue;
    }
    if (!cfg.area) {
      errors.push(`${service}: select an area.`);
      continue;
    }
    const unit = getUnitPrice(service, cfg.plan, cfg.area, config);
    if (unit === null) {
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
  const inferred = new Set<string>();
  for (const part of parts) {
    for (const [pkg, pests] of Object.entries(SERVICE_PACKAGE_TO_PESTS)) {
      if (pests.includes(part)) inferred.add(pkg);
    }
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
  return config.service_types[service] || Object.keys(config.pricing[service] || {});
}

export function supportsAutoPricing(
  commercialType: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): boolean {
  if (commercialType === 'home') return true;
  if (config.region === 'lonavala' && commercialType === 'villa') return true;
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

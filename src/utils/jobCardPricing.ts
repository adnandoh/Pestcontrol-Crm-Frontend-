import { PRICING_DATA, PROPERTY_LOCATIONS, SERVICE_TYPES } from '../constants/pricing';

export interface PricingConfig {
  region: 'mumbai' | 'lonavala';
  city: string;
  pricing: Record<string, Record<string, Record<string, number>>>;
  service_types: Record<string, string[]>;
  residential_locations: string[];
  villa_locations: string[];
  rodent_locations: string[];
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

export const SERVICE_PACKAGE_TO_PESTS: Record<string, string[]> = {
  'Cockroach / Ants': ['Cockroach', 'Ants'],
  'Bed Bugs': ['Bed Bug'],
  'Termite': ['Termite'],
  'Rodent': ['Rodent'],
  'Mosquito': ['Mosquito'],
  'Hotel / Commercial': [],
};

export interface ServicePriceLine {
  service: string;
  price: number;
  plan?: string;
  area?: string;
  note?: string;
}

/** Per-service plan/area selection (create & edit booking forms). */
export interface ServiceItemConfig {
  service: string;
  plan: string;
  area: string;
  amount: number;
}

export type ServiceConfigMap = Record<string, { plan: string; area: string }>;

export function getUnitPrice(
  service: string,
  pricingType: string,
  pricingArea: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): number | null {
  const serviceData = config.pricing[service];
  if (!serviceData?.[pricingType]) return null;
  const typeData = serviceData[pricingType];
  if (typeof typeData === 'number') return typeData;
  if (typeof typeData === 'object' && pricingArea in typeData) {
    const value = (typeData as Record<string, number>)[pricingArea];
    return typeof value === 'number' ? value : null;
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

    return Array.from(new Set(options));
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

  return Array.from(options);
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

/** Plan types available for a single service package. */
export function getPricingTypesForService(
  service: string,
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): string[] {
  return Object.keys(config.pricing[service] || {});
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
  config: PricingConfig = MUMBAI_PRICING_CONFIG,
): string {
  const types = getPricingTypesForService(service, config);
  if (types.includes('One Time Service')) return 'One Time Service';
  return types[0] || '';
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
): ServiceConfigMap {
  const next: ServiceConfigMap = {};
  for (const service of selectedServices) {
    const existing = prev[service];
    const planTypes = getPricingTypesForService(service, config);
    let plan = existing?.plan || getDefaultPlanForService(service, config);
    if (!planTypes.includes(plan)) {
      plan = getDefaultPlanForService(service, config);
    }
    const areas = getAreaOptionsForService(service, config);
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
        note: 'Rate not available for this area/type',
      });
      items.push({ service, plan, area, amount: 0 });
      continue;
    }
    if (unit === 0) {
      lines.push({
        service,
        plan,
        area,
        price: 0,
        note:
          service === 'Hotel / Commercial'
            ? 'Inspection required'
            : 'Price after visit',
      });
      items.push({ service, plan, area, amount: 0 });
      continue;
    }
    lines.push({ service, plan, area, price: unit });
    items.push({ service, plan, area, amount: unit });
  }

  const total = lines.reduce((sum, line) => sum + line.price, 0);
  return { total, lines, items };
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

/** Parse stored service_type into pricing package labels (create + edit forms). */
export function parsePackagesFromServiceType(serviceType: string): string[] {
  if (!serviceType?.trim()) return [];

  const parts = serviceType.split(',').map((s) => s.trim()).filter(Boolean);
  const direct = parts.filter((p) => SERVICE_PACKAGE_OPTIONS.includes(p));
  if (direct.length > 0) return direct;

  const inferred = new Set<string>();
  for (const part of parts) {
    for (const [pkg, pests] of Object.entries(SERVICE_PACKAGE_TO_PESTS)) {
      if (pests.includes(part)) inferred.add(pkg);
    }
  }
  return Array.from(inferred);
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

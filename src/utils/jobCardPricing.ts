import { PRICING_DATA, PROPERTY_LOCATIONS, SERVICE_TYPES } from '../constants/pricing';

export const SERVICE_PACKAGE_OPTIONS = Object.keys(PRICING_DATA);

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
  note?: string;
}

export function getUnitPrice(
  service: string,
  pricingType: string,
  pricingArea: string,
): number | null {
  const serviceData = PRICING_DATA[service];
  if (!serviceData?.[pricingType]) return null;
  const typeData = serviceData[pricingType];
  if (typeof typeData === 'number') return typeData;
  if (typeof typeData === 'object' && pricingArea in typeData) {
    const value = (typeData as Record<string, number>)[pricingArea];
    return typeof value === 'number' ? value : null;
  }
  return null;
}

export function getSharedPricingTypes(selectedServices: string[]): string[] {
  if (selectedServices.length === 0) return [];
  let shared: string[] | null = null;
  for (const service of selectedServices) {
    const types = Object.keys(PRICING_DATA[service] || {});
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
  pricingType: string,
): string[] {
  if (!selectedServices.length || !pricingType) return [];

  const hasRodent = selectedServices.includes('Rodent');
  const hasCommercial = selectedServices.includes('Hotel / Commercial');
  const residential = selectedServices.filter(
    (s) => s !== 'Rodent' && s !== 'Hotel / Commercial',
  );

  const options = new Set<string>();

  if (residential.length > 0) {
    PROPERTY_LOCATIONS.forEach((loc) => options.add(loc));
  }
  if (hasRodent) {
    options.add('Society Area');
    options.add('Windows');
  }
  if (hasCommercial) {
    options.add('Commercial Space');
  }

  return Array.from(options);
}

export function computeMultiServicePricing(
  selectedServices: string[],
  pricingType: string,
  pricingArea: string,
): { total: number; lines: ServicePriceLine[] } {
  const lines: ServicePriceLine[] = [];

  for (const service of selectedServices) {
    const unit = getUnitPrice(service, pricingType, pricingArea);
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

/** Legacy single-package type list (for reference). */
export function typesForPackage(service: string): string[] {
  return SERVICE_TYPES[service] || Object.keys(PRICING_DATA[service] || {});
}

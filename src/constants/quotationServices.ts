import {
  formatPlanLabel,
  getAmcPackageOptions,
  isAmcPlan,
  isBedBugService,
  isTermiteService,
  oneTimePlanValue,
  parseAmcCountFromPlan,
  supportsAmcMode,
} from './bookingPropertyTypes';
import type { QuotationItem, QuotationScope } from '../types';
import {
  getQuotationTemplate,
  QUOTATION_SELECTABLE_SERVICES,
  type QuotationSelectableService,
} from './quotationTemplates';

export interface QuotationServicePlanConfig {
  service: QuotationSelectableService;
  plan: string;
}

/** Map quotation UI service name → booking engine key (for AMC packages). */
const BOOKING_SERVICE_KEY: Record<QuotationSelectableService, string> = {
  'General Pest Control': 'Cockroach / Ants',
  'Bed Bug Treatment': 'Bed Bugs',
  'Rodent Control': 'Rodent',
  'Mosquito Control': 'Mosquito',
  'Termite Treatment': 'Termite',
};

export function bookingKeyForQuotationService(service: string): string {
  return BOOKING_SERVICE_KEY[service as QuotationSelectableService] ?? service;
}

export function defaultPlanForService(service: string): string {
  return oneTimePlanValue(bookingKeyForQuotationService(service));
}

export function quotationSupportsAmc(service: string): boolean {
  if (isBedBugService(service)) return false;
  return supportsAmcMode(bookingKeyForQuotationService(service));
}

export function getQuotationPlanOptions(service: string): Array<{ value: string; label: string }> {
  const bookingKey = bookingKeyForQuotationService(service);
  if (isTermiteService(service) || isBedBugService(service)) {
    const plan = defaultPlanForService(service);
    return [{ value: plan, label: formatQuotationPlanLabel(service, plan) }];
  }
  const oneTime = oneTimePlanValue(bookingKey);
  const amc = getAmcPackageOptions(bookingKey);
  return [
    { value: oneTime, label: formatQuotationPlanLabel(service, oneTime) },
    ...amc.map((o) => ({ value: o.value, label: formatQuotationPlanLabel(service, o.value) })),
  ];
}

export function formatQuotationPlanLabel(service: string, plan: string): string {
  const bookingKey = bookingKeyForQuotationService(service);
  return formatPlanLabel(bookingKey, plan);
}

/** Stored on QuotationItem.frequency — human-readable plan label. */
export function planToItemFrequency(service: string, plan: string): string {
  return formatQuotationPlanLabel(service, plan);
}

export function buildItemsFromServicePlans(
  configs: QuotationServicePlanConfig[],
  existingItems: QuotationItem[] = [],
): QuotationItem[] {
  return configs.map((cfg) => {
    const prev = existingItems.find(
      (i) =>
        i.service_name === cfg.service ||
        i.service_name.startsWith(`${cfg.service} (`),
    );
    const frequency = planToItemFrequency(cfg.service, cfg.plan);
    const service_name = cfg.service;
    const rate = prev?.rate ?? 0;
    const quantity = prev?.quantity ?? 1;
    return {
      service_name,
      frequency,
      quantity,
      rate,
      total: Number(rate) * Number(quantity),
      description: cfg.plan,
    };
  });
}

export function mergeScopesForServicePlans(
  propertyType: string,
  configs: QuotationServicePlanConfig[],
): QuotationScope[] {
  if (!propertyType || configs.length === 0) return [];

  const scopes: QuotationScope[] = [];
  const firstTemplate = getQuotationTemplate(propertyType, configs[0].service);
  if (firstTemplate?.areaCovered) {
    scopes.push({ title: 'Area Covered', content: firstTemplate.areaCovered });
  }

  for (const cfg of configs) {
    const template = getQuotationTemplate(propertyType, cfg.service);
    if (!template) continue;
    const planLabel = planToItemFrequency(cfg.service, cfg.plan);
    scopes.push({
      title: `Scope of Work — ${cfg.service}`,
      content: `${template.scopeOfWork}\n\nService plan: ${planLabel}`,
    });
    scopes.push({
      title: `Pest Covered — ${cfg.service}`,
      content: template.pestCovered,
    });
    scopes.push({
      title: `Benefits — ${cfg.service}`,
      content: template.benefits,
    });
    scopes.push({
      title: `Warranty — ${cfg.service}`,
      content: template.warranty,
    });
  }

  return scopes;
}

export function getPaymentTermsForServicePlans(
  propertyType: string,
  configs: QuotationServicePlanConfig[],
) {
  const first = configs[0];
  if (!first) return null;
  const template = getQuotationTemplate(propertyType, first.service);
  return template?.paymentTerms ?? null;
}

export function deriveQuotationFlags(configs: QuotationServicePlanConfig[]): {
  is_amc: boolean;
  visit_count: number;
  quotation_type: 'AMC Package' | 'One Time Service' | 'Commercial';
  hasMixedPlans: boolean;
} {
  const amcPlans = configs.filter((c) => isAmcPlan(c.plan));
  const visitCounts = amcPlans
    .map((c) => parseAmcCountFromPlan(c.plan))
    .filter((n): n is number => n !== null);
  const hasOneTime = configs.some((c) => !isAmcPlan(c.plan));
  const hasAmc = amcPlans.length > 0;

  return {
    is_amc: hasAmc,
    visit_count: visitCounts.length ? Math.max(...visitCounts) : 1,
    quotation_type: hasAmc && !hasOneTime ? 'AMC Package' : hasAmc ? 'AMC Package' : 'One Time Service',
    hasMixedPlans: hasOneTime && hasAmc,
  };
}

export function configsFromQuotation(
  templateServiceType: string | undefined,
  items: QuotationItem[],
): QuotationServicePlanConfig[] {
  const fromTemplate = (templateServiceType || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is QuotationSelectableService =>
      (QUOTATION_SELECTABLE_SERVICES as readonly string[]).includes(s),
    );

  if (fromTemplate.length > 0) {
    return fromTemplate.map((service) => {
      const item = items.find((i) => i.service_name === service);
      return {
        service,
        plan: item?.description || inferPlanFromFrequency(service, item?.frequency || ''),
      };
    });
  }

  return items
    .filter((i) => i.service_name?.trim())
    .map((item) => ({
      service: item.service_name as QuotationSelectableService,
      plan: item.description || inferPlanFromFrequency(item.service_name, item.frequency),
    }));
}

function inferPlanFromFrequency(service: string, frequency: string): string {
  const f = (frequency || '').toLowerCase();
  if (f.includes('amc')) {
    const m = f.match(/(\d+)\s*service/);
    if (m) return `AMC ${m[1]} Services`;
  }
  if (f.includes('one time treatment')) return 'One Time Treatment';
  return defaultPlanForService(service);
}

export { QUOTATION_SELECTABLE_SERVICES };

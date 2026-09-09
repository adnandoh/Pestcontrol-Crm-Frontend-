/**
 * Groups the stored `plan_type` values into the tabs shown on Pricing Master.
 *
 * `plan_type` is free text, and the 2026 rate card put twelve distinct values in
 * it ("One Time Service", "AMC 3 Services", "4 Visits/Month", "Bi-monthly - 6
 * Visits", "Weekly AMC - 4 Visits/Month", "Add-On", …). One tab per value would
 * be an unusable strip, so related plans collapse into a single tab that filters
 * on the whole family server-side.
 *
 * Grouping is derived from the values rather than hard-coded: a plan added by a
 * future import lands in a tab automatically, and an unrecognised one falls into
 * "Other" instead of becoming unreachable.
 */

export type PricingPlanGroupId = 'one_time' | 'amc' | 'recurring' | 'addon' | 'other';

export interface PricingPlanGroup {
  id: PricingPlanGroupId;
  label: string;
  /** The exact stored values this tab covers, sent as `plan_type__in`. */
  planTypes: string[];
}

const GROUP_LABELS: Record<PricingPlanGroupId, string> = {
  one_time: 'One-Time',
  amc: 'AMC',
  recurring: 'Monthly / Recurring',
  addon: 'Add-On',
  other: 'Other',
};

const GROUP_ORDER: PricingPlanGroupId[] = [
  'one_time',
  'amc',
  'recurring',
  'addon',
  'other',
];

export function planGroupOf(planType: string): PricingPlanGroupId {
  const plan = planType.trim().toLowerCase();

  if (plan.includes('add-on') || plan.includes('add on')) return 'addon';
  // Before the visit-frequency test on purpose: "Weekly AMC - 4 Visits/Month"
  // and "Fortnightly AMC - 2 Visits/Month" match both, and they are AMCs first.
  if (plan.includes('amc')) return 'amc';
  if (plan.startsWith('one time') || plan.startsWith('one-time')) return 'one_time';
  if (/visit|month|quarter|week|fortnight|annual/.test(plan)) return 'recurring';
  return 'other';
}

/** Only groups that the given city actually has rates for. */
export function buildPlanGroups(planTypes: string[]): PricingPlanGroup[] {
  const byGroup = new Map<PricingPlanGroupId, string[]>();

  for (const plan of planTypes) {
    if (!plan) continue;
    const id = planGroupOf(plan);
    const list = byGroup.get(id);
    if (list) list.push(plan);
    else byGroup.set(id, [plan]);
  }

  return GROUP_ORDER.filter((id) => byGroup.has(id)).map((id) => ({
    id,
    label: GROUP_LABELS[id],
    planTypes: [...(byGroup.get(id) ?? [])].sort(),
  }));
}

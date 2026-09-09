/**
 * Group the booking service checkboxes by pest family.
 *
 * Pricing Master returns services alphabetically, which scatters related
 * options: "Cockroach Premium" and "Cockroach Standard" land either side of
 * "Complete IPM". Staff pick a pest first and a tier second, so the list is
 * grouped by pest and ordered base tier → higher tier within each group.
 *
 * Families are matched on the service name rather than a fixed list, so a
 * service added in Pricing Master lands in the right group on its own. Any
 * name that matches nothing falls into "Other Services" instead of vanishing.
 */

export interface ServiceGroup {
  family: string;
  services: string[];
}

const FAMILIES: { family: string; match: RegExp }[] = [
  { family: 'Cockroach & Ants', match: /cockroach|ants/i },
  { family: 'Bed Bugs', match: /bed\s*bug/i },
  { family: 'Termite', match: /termite/i },
  { family: 'Rodent', match: /rodent|rat\b|mice|mouse/i },
  { family: 'Mosquito & Flies', match: /mosquito|fogging|fly|flies/i },
  // Broad-scope contracts, kept last: they cover every pest rather than one.
  { family: 'Full Coverage / IPM', match: /\bipm\b|general pest|integrated/i },
];

const OTHER = 'Other Services';

/**
 * Lower rank sorts first. Tiers are ordered by scope, not alphabetically —
 * "Standard" must precede "Premium" even though P < S.
 */
const TIER_ORDER: { match: RegExp; rank: number }[] = [
  { match: /\b(basic|regular|standard|essential)\b/i, rank: 1 },
  { match: /\b(premium|complete|advanced)\b/i, rank: 2 },
  { match: /\bintegrated\b/i, rank: 3 },
];

function tierRank(service: string): number {
  for (const { match, rank } of TIER_ORDER) {
    if (match.test(service)) return rank;
  }
  // Untiered names are the plain base service, so they head the group.
  return 0;
}

function familyFor(service: string): string {
  return FAMILIES.find((f) => f.match.test(service))?.family ?? OTHER;
}

function compareWithinFamily(a: string, b: string): number {
  const byTier = tierRank(a) - tierRank(b);
  if (byTier !== 0) return byTier;
  // Same tier: the shorter name is the more general one, so show it first.
  if (a.length !== b.length) return a.length - b.length;
  return a.localeCompare(b);
}

export function groupServiceOptions(services: string[]): ServiceGroup[] {
  const byFamily = new Map<string, string[]>();
  for (const service of services) {
    const family = familyFor(service);
    const bucket = byFamily.get(family);
    if (bucket) bucket.push(service);
    else byFamily.set(family, [service]);
  }

  const ordered: ServiceGroup[] = [];
  for (const { family } of FAMILIES) {
    const found = byFamily.get(family);
    if (found) {
      ordered.push({ family, services: [...found].sort(compareWithinFamily) });
    }
  }
  const other = byFamily.get(OTHER);
  if (other) {
    ordered.push({ family: OTHER, services: [...other].sort(compareWithinFamily) });
  }
  return ordered;
}

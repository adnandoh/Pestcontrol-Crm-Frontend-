/**
 * Pestcontrol99 WhatsApp quotation copy from
 * Pestcontrol99_WhatsApp_Quotation_Templates.docx.
 *
 * Freeform session / wa.me text (not Meta templates). Keep single asterisks
 * for WhatsApp bold. Does not touch booking-confirmation Meta sends.
 */

import type { Quotation, QuotationItem, QuotationScope } from '../types';
import { COMPANY, getQuotationDisplayName } from '../constants/quotation';
import { formatInrGrouped } from './customerPrice';
import { openWhatsApp } from './whatsapp';
import { resolveQuotationTotals } from './quotationTotals';

export const QUOTATION_WHATSAPP_SUPPORT = COMPANY.phoneDisplay;

type ServiceFamily =
  | 'cockroach'
  | 'bed_bug'
  | 'termite'
  | 'rodent'
  | 'mosquito';

type RateSlot =
  | 'standard_once'
  | 'standard_amc'
  | 'premium_once'
  | 'premium_amc'
  | 'bed_bug'
  | 'termite'
  | 'home_rodent'
  | 'mosquito_once'
  | 'mosquito_plan';

type ClassifiedItem = {
  family: ServiceFamily;
  slot: RateSlot;
  amount: number;
  visits?: number;
  pending?: boolean;
};

function clean(value?: string | number | null): string {
  return String(value ?? '').trim();
}

function money(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function formatRate(amount: number): string {
  return formatInrGrouped(amount);
}

function gstWording(quotation: Pick<Quotation, 'price_includes_gst' | 'tax_amount'>): string {
  if (quotation.price_includes_gst === false) return '+ GST';
  const tax = money(quotation.tax_amount);
  if (tax > 0 || quotation.price_includes_gst === true) return 'including GST';
  return 'including GST';
}

function greetingName(quotation: Quotation): string {
  const name = clean(getQuotationDisplayName(quotation));
  if (!name || name.toLowerCase() === 'customer') return '';
  return name;
}

function greeting(quotation: Quotation): string {
  const name = greetingName(quotation);
  return name ? `Hello ${name},` : 'Hello,';
}

function signature(): string {
  return `*Pestcontrol99.com | ${QUOTATION_WHATSAPP_SUPPORT}*`;
}

function locality(quotation: Quotation): string {
  return (
    clean(quotation.master_location_name) ||
    clean(quotation.city) ||
    clean(quotation.master_city_name) ||
    ''
  );
}

function extractBhk(text: string): string {
  const match = text.match(/\b(\d\s*\+?\s*\d?\s*BHK|\d\s*RK|1\+1\s*Chawl|Single\s*Room)\b/i);
  if (!match) return '';
  return match[1].replace(/\s+/g, ' ').trim();
}

function propertyLabel(quotation: Quotation): string {
  const haystack = [
    quotation.notes,
    quotation.address,
    ...(quotation.scopes || []).map((s) => `${s.title} ${s.content}`),
  ]
    .map((part) => clean(part))
    .filter(Boolean)
    .join(' ');
  const bhk = extractBhk(haystack);
  const propertyType = clean(quotation.property_type) || clean(quotation.quotation_type);

  if (bhk && propertyType) {
    if (/flat|residential/i.test(propertyType)) return `${bhk} Flat`;
    return `${bhk} ${propertyType}`;
  }
  if (bhk) return `${bhk} Flat`;
  if (propertyType) return propertyType;
  return 'your property';
}

function scopeContent(scopes: QuotationScope[] | undefined, titlePart: string): string {
  const needle = titlePart.toLowerCase();
  const hit = (scopes || []).find((s) => clean(s.title).toLowerCase().includes(needle));
  return clean(hit?.content);
}

function mosquitoAreas(quotation: Quotation): string {
  const area = scopeContent(quotation.scopes, 'area covered');
  if (area) {
    const short = area.split('|').map((p) => p.trim()).filter(Boolean).slice(0, 6).join(', ');
    return short || area;
  }
  if (/society/i.test(clean(quotation.property_type) + clean(quotation.quotation_type))) {
    return 'agreed common areas';
  }
  return 'the agreed indoor and outdoor areas';
}

function premiumWarranty(quotation: Quotation): string {
  const warranty = scopeContent(quotation.scopes, 'warranty');
  if (warranty) {
    const short = warranty.split(/[.\n]/)[0]?.trim();
    return short || warranty;
  }
  return '';
}

function parseVisits(item: QuotationItem, quotation: Quotation): number | undefined {
  const blob = `${item.frequency} ${item.description || ''} ${item.service_name}`;
  const match =
    blob.match(/AMC\s*(\d+)/i) ||
    blob.match(/(\d+)\s*services?/i) ||
    blob.match(/(\d+)\s*visits?/i);
  if (match) return Number(match[1]);
  if (quotation.is_amc && money(quotation.visit_count) > 0) return Number(quotation.visit_count);
  return undefined;
}

function detectFamily(item: QuotationItem): ServiceFamily | null {
  const text = `${item.service_name} ${item.description || ''}`.toLowerCase();
  if (/bed\s*bug/.test(text)) return 'bed_bug';
  if (/termite/.test(text)) return 'termite';
  if (/mosquito|fogging/.test(text)) return 'mosquito';
  if (/rodent|rat\b|bait/.test(text)) return 'rodent';
  if (
    /cockroach|ant\b|general pest|gel|spray/.test(text) ||
    /pest control/.test(text)
  ) {
    return 'cockroach';
  }
  return null;
}

function isPremium(item: QuotationItem): boolean {
  const text = `${item.service_name} ${item.frequency} ${item.description || ''}`.toLowerCase();
  return /\bpremium\b/.test(text);
}

function isAmc(item: QuotationItem, quotation: Quotation): boolean {
  const text = `${item.frequency} ${item.description || ''} ${item.service_name}`.toLowerCase();
  // CRM one-time labels are "One Time" / "One Time Service" — never treat as AMC.
  if (/one[\s-]*time|both visits|15 days/.test(text)) return false;
  if (/\bamc\b|annual|\byear\b/.test(text)) return true;
  if (/\d+\s*services?/.test(text)) return true;
  if (quotation.is_amc && detectFamily(item) === 'cockroach') return true;
  return false;
}

function isPendingRodentBaiting(item: QuotationItem): boolean {
  const text = `${item.service_name} ${item.frequency} ${item.description || ''}`.toLowerCase();
  return /bait|common area|society|shared area|garbage|parking/.test(text);
}

function classifyItem(item: QuotationItem, quotation: Quotation): ClassifiedItem | null {
  const family = detectFamily(item);
  if (!family) return null;
  const amount = money(item.total) || money(item.rate);
  const visits = parseVisits(item, quotation);

  if (family === 'rodent' && isPendingRodentBaiting(item) && amount <= 0) {
    return { family, slot: 'home_rodent', amount: 0, pending: true };
  }

  if (family === 'bed_bug') return { family, slot: 'bed_bug', amount, visits };
  if (family === 'termite') return { family, slot: 'termite', amount, visits };
  if (family === 'rodent') return { family, slot: 'home_rodent', amount, visits };
  if (family === 'mosquito') {
    return {
      family,
      slot: isAmc(item, quotation) ? 'mosquito_plan' : 'mosquito_once',
      amount,
      visits,
    };
  }

  // cockroach / general pest
  const premium = isPremium(item);
  const amc = isAmc(item, quotation);
  if (premium && amc) return { family, slot: 'premium_amc', amount, visits };
  if (premium) return { family, slot: 'premium_once', amount, visits };
  if (amc) return { family, slot: 'standard_amc', amount, visits };
  return { family, slot: 'standard_once', amount, visits };
}

function classifyQuotation(quotation: Quotation): ClassifiedItem[] {
  const items = Array.isArray(quotation.items) ? quotation.items : [];
  const classified: ClassifiedItem[] = [];
  for (const item of items) {
    const row = classifyItem(item, quotation);
    if (row) classified.push(row);
  }
  return classified;
}

function familiesIn(classified: ClassifiedItem[]): ServiceFamily[] {
  const order: ServiceFamily[] = ['cockroach', 'bed_bug', 'termite', 'rodent', 'mosquito'];
  const present = new Set(classified.map((c) => c.family));
  return order.filter((f) => present.has(f));
}

function slotAmount(classified: ClassifiedItem[], slot: RateSlot): number {
  const hit = classified.find((c) => c.slot === slot && !c.pending && c.amount > 0);
  return hit?.amount || 0;
}

function slotVisits(classified: ClassifiedItem[], slot: RateSlot, fallback?: number): number | undefined {
  const hit = classified.find((c) => c.slot === slot);
  return hit?.visits || fallback;
}

function rateWithGst(amount: number, gst: string): string {
  return gst ? `₹${formatRate(amount)} ${gst}` : `₹${formatRate(amount)}`;
}

function joinBlocks(parts: Array<string | false | null | undefined>): string {
  return parts
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cockroachFull(quotation: Quotation, classified: ClassifiedItem[], gst: string): string {
  const property = propertyLabel(quotation);
  const stdOnce = slotAmount(classified, 'standard_once');
  const stdAmc = slotAmount(classified, 'standard_amc');
  const premOnce = slotAmount(classified, 'premium_once');
  const premAmc = slotAmount(classified, 'premium_amc');
  const stdVisits = slotVisits(classified, 'standard_amc', 3);
  const premVisits = slotVisits(classified, 'premium_amc', 3);
  const warranty = premiumWarranty(quotation);

  const standardLines: string[] = ['*Standard Treatment*'];
  if (stdOnce > 0) standardLines.push(`• One-time service *${rateWithGst(stdOnce, gst)}*`);
  if (stdAmc > 0) {
    standardLines.push(
      `• Annual plan *${rateWithGst(stdAmc, gst)}* for *${stdVisits || 3} visits*`,
    );
  }
  standardLines.push(
    '• Spray and gel treatment in the agreed areas. Please clear utensils and food items from the areas scheduled for spray.',
  );

  const premiumLines: string[] = [
    '*Premium Treatment – Recommended for an odourless gel service*',
  ];
  if (premOnce > 0) premiumLines.push(`• One-time service *${rateWithGst(premOnce, gst)}*`);
  if (premAmc > 0) {
    premiumLines.push(
      `• Annual plan *${rateWithGst(premAmc, gst)}* for *${premVisits || 3} visits*`,
    );
  }
  premiumLines.push(
    '• Imported, professional-grade gel applied around cockroach hiding spots. For gel-only treatment, you can stay at home and keep kitchen utensils in place.',
  );
  premiumLines.push('• If a spray is required, we’ll explain the preparation in advance.');
  if (warranty) premiumLines.push(`• *Service warranty ${warranty}*`);

  const showStandard = stdOnce > 0 || stdAmc > 0;
  const showPremium = premOnce > 0 || premAmc > 0;
  // If staff only priced one tier, still introduce that tier; if both empty
  // (should not happen), fall back to a short ask-for-details note.
  const bodyParts: string[] = [];
  if (showStandard) bodyParts.push(standardLines.join('\n'));
  if (showPremium) {
    bodyParts.push(premiumLines.join('\n'));
    bodyParts.push(
      'The gel attracts cockroaches to the bait, including those hiding in cracks and corners. Activity typically reduces gradually over the following days. Ant treatment is included in the agreed areas.',
    );
  }
  if (!showStandard && !showPremium) {
    bodyParts.push('Please reply with the flat size so we can share the Standard and Premium options.');
  }

  const replyHint =
    showStandard && showPremium
      ? 'To book, reply *Standard* or *Premium* with your address and preferred date. We’ll confirm the available slot.'
      : showPremium
        ? 'To book Premium, reply with your address and preferred date. We’ll confirm the available slot.'
        : 'To book, reply with your address and preferred date. We’ll confirm the available slot.';

  return joinBlocks([
    greeting(quotation),
    `*Cockroach & Ant Control Quotation | ${property}*`,
    ...bodyParts,
    replyHint,
    signature(),
  ]);
}

function bedBugFull(quotation: Quotation, classified: ClassifiedItem[], gst: string): string {
  const property = propertyLabel(quotation);
  const rate = slotAmount(classified, 'bed_bug');
  const rateLine =
    rate > 0
      ? `*Package ${rateWithGst(rate, gst)} for both visits*`
      : '*Package for both visits — rate as agreed*';

  return joinBlocks([
    greeting(quotation),
    `*Bed Bug Treatment Quotation | ${property}*`,
    rateLine,
    [
      '• *First visit* – We treat affected areas, including bed frames, mattress seams, sofas, cupboards and nearby hiding spots where activity is found.',
      '• *Second visit* – We return around *15 days* later to target newly hatched bed bugs and address remaining activity.',
    ].join('\n'),
    'The follow-up is included in your quote.',
    'To schedule your first visit, reply with your address and preferred date. We’ll share preparation instructions before your appointment.',
    signature(),
  ]);
}

function termiteFull(quotation: Quotation, classified: ClassifiedItem[], gst: string): string {
  const property = propertyLabel(quotation);
  const rate = slotAmount(classified, 'termite');
  const rateLine =
    rate > 0 ? `*Charges ${rateWithGst(rate, gst)}*` : '*Charges as per the agreed scope*';

  return joinBlocks([
    greeting(quotation),
    `*Termite Treatment Quotation | ${property}*`,
    rateLine,
    '*Service warranty – 2 years for the treated areas, as per the agreed scope*',
    [
      '• We treat the agreed floor and wall junctions using drill-and-inject treatment where required.',
      '• We seal drilled holes with white cement after treatment.',
      '• If affected furniture is included in your quote, we treat the agreed wooden areas separately.',
    ].join('\n'),
    'Treating termite access points helps control existing activity and protect the treated areas.',
    'Reply with your address and preferred date. We’ll confirm the areas covered and the available slot.',
    signature(),
  ]);
}

function rodentFull(quotation: Quotation, classified: ClassifiedItem[], gst: string): string {
  const property = propertyLabel(quotation);
  const homeRate = slotAmount(classified, 'home_rodent');
  const parts: string[] = [
    greeting(quotation),
    `*Rodent Control Quotation | ${property}*`,
  ];

  if (homeRate > 0) {
    parts.push(`*Option 1 – Home Rodent Repellent Treatment | ${rateWithGst(homeRate, gst)}*`);
    parts.push(
      [
        '• We apply rodent-repellent spray in affected areas and around likely entry points.',
        '• We place rodent-repellent pouches at suitable locations inside the flat.',
      ].join('\n'),
    );
    parts.push(
      'The scent helps discourage rodents from entering and can encourage rodents already inside to move away from treated areas.',
    );
  }

  parts.push('*Option 2 – Rodent Baiting | Society Common Areas Only*');
  parts.push(
    'For agreed shared areas such as parking and garbage collection zones, we provide rodent baiting. The bait is designed to kill rodents that consume it. Pricing depends on the areas to be covered.',
  );
  parts.push(
    homeRate > 0
      ? 'To book home treatment, send your complete address and preferred date and time. For common-area baiting, share the society name and areas requiring treatment for a separate quote.'
      : 'For common-area baiting, share the society name and areas requiring treatment for a separate quote. For home treatment, send your complete address and preferred date and time.',
  );
  parts.push(signature());
  return joinBlocks(parts);
}

function mosquitoFull(quotation: Quotation, classified: ClassifiedItem[], gst: string): string {
  const property = propertyLabel(quotation);
  const once = slotAmount(classified, 'mosquito_once');
  const plan = slotAmount(classified, 'mosquito_plan');
  const visits = slotVisits(classified, 'mosquito_plan', 3);
  const areas = mosquitoAreas(quotation);
  const bullets: string[] = [];
  if (once > 0) bullets.push(`• *One-time service ${rateWithGst(once, gst)}*`);
  if (plan > 0) {
    bullets.push(`• *Scheduled plan ${rateWithGst(plan, gst)} for ${visits || 3} visits*`);
  }
  if (bullets.length === 0) {
    bullets.push('• Fogging for the agreed areas — rate as discussed');
  }

  return joinBlocks([
    greeting(quotation),
    `*Mosquito Control Quotation | ${property}*`,
    bullets.join('\n'),
    `*Areas covered* – ${areas}`,
    'Fogging helps reduce adult mosquito activity in the treated areas. During the visit, we’ll point out visible stagnant-water spots where mosquitoes can breed.',
    'For societies and commercial premises, we can coordinate visits around resident or business timings.',
    'To book, send your address, the areas you want covered and your preferred date.',
    signature(),
  ]);
}

function cockroachBlock(classified: ClassifiedItem[], gst: string): string {
  const stdOnce = slotAmount(classified, 'standard_once');
  const stdAmc = slotAmount(classified, 'standard_amc');
  const premOnce = slotAmount(classified, 'premium_once');
  const premAmc = slotAmount(classified, 'premium_amc');
  const stdVisits = slotVisits(classified, 'standard_amc', 3);
  const premVisits = slotVisits(classified, 'premium_amc', 3);
  const lines: string[] = ['*Cockroach & Ant Control*'];
  if (stdOnce > 0) {
    lines.push(`• Standard *${rateWithGst(stdOnce, gst)}* – One-time spray and gel treatment.`);
  }
  if (premOnce > 0) {
    lines.push(
      `• Premium *${rateWithGst(premOnce, gst)}* – One-time imported, odourless gel treatment. Kitchen utensils can stay in place for gel-only service.`,
    );
  }
  if (stdAmc > 0 || premAmc > 0) {
    const bits: string[] = [];
    if (stdAmc > 0) {
      bits.push(`Standard *${rateWithGst(stdAmc, gst)}* for *${stdVisits || 3} visits*`);
    }
    if (premAmc > 0) {
      bits.push(`Premium *${rateWithGst(premAmc, gst)}* for *${premVisits || 3} visits*`);
    }
    lines.push(`• Annual plans – ${bits.join(' or ')}.`);
  }
  return lines.join('\n');
}

function bedBugBlock(classified: ClassifiedItem[], gst: string): string {
  const rate = slotAmount(classified, 'bed_bug');
  const head =
    rate > 0
      ? `*Bed Bug Treatment | ${rateWithGst(rate, gst)}*`
      : '*Bed Bug Treatment*';
  return `${head}\nTwo visits included. We return around *15 days* later to target newly hatched bed bugs.`;
}

function termiteBlock(classified: ClassifiedItem[], gst: string): string {
  const rate = slotAmount(classified, 'termite');
  const head =
    rate > 0
      ? `*Termite Treatment | ${rateWithGst(rate, gst)}*`
      : '*Termite Treatment*';
  return `${head}\nDrill-and-inject treatment where required, with a *2-year service warranty* for the agreed treated areas.`;
}

function rodentBlock(classified: ClassifiedItem[], gst: string): string {
  const home = slotAmount(classified, 'home_rodent');
  const parts: string[] = [];
  if (home > 0) {
    parts.push(
      `*Home Rodent Repellent Treatment | ${rateWithGst(home, gst)}*\nRepellent spray and pouches placed around affected areas and likely entry points.`,
    );
  }
  parts.push(
    '*Rodent Baiting | Society Common Areas Only*\nAvailable for agreed shared areas. Share the society name and areas to be covered for a separate quote.',
  );
  return parts.join('\n\n');
}

function mosquitoBlock(
  quotation: Quotation,
  classified: ClassifiedItem[],
  gst: string,
): string {
  const once = slotAmount(classified, 'mosquito_once');
  const plan = slotAmount(classified, 'mosquito_plan');
  const visits = slotVisits(classified, 'mosquito_plan', 3);
  const areas = mosquitoAreas(quotation);
  const lines: string[] = ['*Mosquito Control*'];
  if (once > 0) {
    lines.push(`• One-time fogging *${rateWithGst(once, gst)}* for ${areas}.`);
  }
  if (plan > 0) {
    lines.push(`• Scheduled plan *${rateWithGst(plan, gst)}* for *${visits || 3} visits*.`);
  }
  if (once <= 0 && plan <= 0) {
    lines.push(`• Fogging for ${areas}.`);
  }
  return lines.join('\n');
}

function hasPendingBaiting(families: ServiceFamily[]): boolean {
  // Rodent baiting is always separately quoted in the combined template.
  return families.includes('rodent');
}

function fixedPricedAmount(classified: ClassifiedItem[]): number {
  return classified
    .filter(
      (c) =>
        !c.pending &&
        c.amount > 0 &&
        (c.family === 'bed_bug' || c.family === 'termite' || c.family === 'rodent'),
    )
    .reduce((sum, c) => sum + c.amount, 0);
}

type PlanChoice = { label: string; amount: number };

/** Cockroach Standard/Premium and Mosquito one-time/plan are alternatives, not add-ons. */
function alternativeChoices(
  classified: ClassifiedItem[],
  slots: Array<{ slot: RateSlot; label: string }>,
): PlanChoice[] {
  const choices: PlanChoice[] = [];
  for (const { slot, label } of slots) {
    const amount = slotAmount(classified, slot);
    if (amount > 0) choices.push({ label, amount });
  }
  return choices;
}

function buildCombinedTotalLines(
  quotation: Quotation,
  classified: ClassifiedItem[],
  families: ServiceFamily[],
  gst: string,
): string {
  const pending = hasPendingBaiting(families);
  const baseLabel = pending ? 'Total for priced services' : 'Total';
  const fixed = fixedPricedAmount(classified);

  const cockroachChoices = alternativeChoices(classified, [
    { slot: 'standard_once', label: 'Standard' },
    { slot: 'premium_once', label: 'Premium' },
    { slot: 'standard_amc', label: 'Standard annual' },
    { slot: 'premium_amc', label: 'Premium annual' },
  ]);
  const mosquitoChoices = alternativeChoices(classified, [
    { slot: 'mosquito_once', label: 'Mosquito one-time' },
    { slot: 'mosquito_plan', label: 'Mosquito plan' },
  ]);

  const cockroachOpts = cockroachChoices.length ? cockroachChoices : [{ label: '', amount: 0 }];
  const mosquitoOpts = mosquitoChoices.length ? mosquitoChoices : [{ label: '', amount: 0 }];

  const lines: string[] = [];
  for (const cock of cockroachOpts) {
    for (const mos of mosquitoOpts) {
      const total = fixed + cock.amount + mos.amount;
      if (total <= 0) continue;
      const tags = [cock.label, mos.label].filter(Boolean);
      const label =
        tags.length > 0 && (cockroachChoices.length > 1 || mosquitoChoices.length > 1)
          ? `${baseLabel} (${tags.join(' + ')})`
          : baseLabel;
      lines.push(`*${label} ${rateWithGst(total, gst)}*`);
    }
  }

  if (lines.length > 0) return lines.join('\n');

  const totals = resolveQuotationTotals(quotation);
  const fallback = totals.grand_total || totals.total_amount || 0;
  if (fallback > 0) return `*${baseLabel} ${rateWithGst(fallback, gst)}*`;
  return `*${baseLabel}* — as per selected services`;
}

function combinedMessage(
  quotation: Quotation,
  classified: ClassifiedItem[],
  families: ServiceFamily[],
  gst: string,
): string {
  const property = propertyLabel(quotation);
  const area = locality(quotation);
  const headerPlace = area ? `${property}, ${area}` : property;
  const blocks: string[] = [];
  for (const family of families) {
    if (family === 'cockroach') blocks.push(cockroachBlock(classified, gst));
    if (family === 'bed_bug') blocks.push(bedBugBlock(classified, gst));
    if (family === 'termite') blocks.push(termiteBlock(classified, gst));
    if (family === 'rodent') blocks.push(rodentBlock(classified, gst));
    if (family === 'mosquito') blocks.push(mosquitoBlock(quotation, classified, gst));
  }

  return joinBlocks([
    greeting(quotation),
    `*Pest Control Quotation | ${headerPlace}*`,
    'Thank you for sharing your requirements. Here are the services quoted for your property.',
    blocks.join('\n\n'),
    buildCombinedTotalLines(quotation, classified, families, gst),
    'We’ll coordinate the visits and share preparation instructions for each service in advance.',
    'To book, confirm the services and plans you prefer, and send your full address and preferred date. We’ll confirm the available slot.',
    signature(),
  ]);
}

function fallbackMessage(quotation: Quotation): string {
  const totals = resolveQuotationTotals(quotation);
  const gst = gstWording(quotation);
  const amount = totals.grand_total || totals.total_amount;
  const amountLine =
    amount > 0 ? `Amount: *${rateWithGst(amount, gst)}*` : 'Amount: as per discussion';
  return joinBlocks([
    greeting(quotation),
    `*Pest Control Quotation | ${propertyLabel(quotation)}*`,
    `Quotation No: ${clean(quotation.quotation_no) || '—'}`,
    amountLine,
    'Please reply with your preferred date and complete address so we can confirm the slot.',
    signature(),
  ]);
}

/** Build customer WhatsApp quotation body for a saved CRM quotation. */
export function buildQuotationWhatsAppMessage(quotation: Quotation): string {
  const gst = gstWording(quotation);
  const classified = classifyQuotation(quotation);
  const families = familiesIn(classified);

  if (families.length === 0) {
    return fallbackMessage(quotation);
  }
  if (families.length === 1) {
    const family = families[0];
    if (family === 'cockroach') return cockroachFull(quotation, classified, gst);
    if (family === 'bed_bug') return bedBugFull(quotation, classified, gst);
    if (family === 'termite') return termiteFull(quotation, classified, gst);
    if (family === 'rodent') return rodentFull(quotation, classified, gst);
    if (family === 'mosquito') return mosquitoFull(quotation, classified, gst);
  }
  return combinedMessage(quotation, classified, families, gst);
}

/** Open wa.me with the filled quotation template. */
export function openQuotationWhatsApp(quotation: Quotation): void {
  const mobile = clean(quotation.mobile);
  if (!mobile) {
    throw new Error('Quotation has no mobile number');
  }
  openWhatsApp(mobile, buildQuotationWhatsAppMessage(quotation));
}

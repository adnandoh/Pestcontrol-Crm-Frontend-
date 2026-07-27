/**
 * Pest Control 99 — WhatsApp e-card (Meta template) config.
 * Green E-Card on CRM Inquiries + Website Leads → pestecardaadsd.
 */
export const WHATSAPP_ORG_ID = '96d71345-5c98-4e9a-8095-0eae9ff855c4';

/**
 * Green E-Card template.
 * Note: pestecardaadsd E-Brochure URL is currently static on Meta
 * (https://www.pestcontrol99.com/e-card/), so track_ecard cannot be enabled
 * until that button URL ends with {{1}}.
 */
export const ECARD_TEMPLATE = {
  name: 'pestecardaadsd',
  language: 'en_US',
  metaId: '898122920007286',
  label: 'Send E-Card',
  description:
    'Sends approved pestecardaadsd WhatsApp template (Call Us + E-Brochure).',
  destinationUrl: 'https://www.pestcontrol99.com/e-card/',
  /** Meta button URL is static — do not send track_ecard until upgraded to {{1}}. */
  supportsTracking: false,
} as const;

export type ECardInquirySource = 'crm' | 'website';

/** Prefix so CRM and website inquiry IDs never collide in WhatsFlow tracking. */
export function buildECardExternalId(
  source: ECardInquirySource | undefined,
  inquiryId: number | string | undefined,
): string | undefined {
  if (inquiryId === undefined || inquiryId === null || inquiryId === '') return undefined;
  const id = String(inquiryId).trim();
  if (!id) return undefined;
  if (!source) return id;
  return `${source}:${id}`;
}

/** Normalize to Meta format: country code + digits, no + (e.g. 919876543210). */
export function normalizeWhatsAppPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

export function isValidWhatsAppPhone(digits: string): boolean {
  return /^91\d{10}$/.test(digits) || /^\d{10,15}$/.test(digits);
}

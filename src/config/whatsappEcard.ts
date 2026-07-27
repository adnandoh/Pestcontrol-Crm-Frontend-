/**
 * Pest Control 99 — WhatsApp e-card (Meta template) config.
 * Green E-Card on CRM + Website inquiries.
 *
 * pc99_business_utility = same Call Now + E-Brochure copy as pc99_business_details,
 * submitted as Utility with empty footer + dynamic tracking URL.
 */
export const WHATSAPP_ORG_ID = '96d71345-5c98-4e9a-8095-0eae9ff855c4';

/** Green E-Card — Utility trackable business details (empty footer). */
export const ECARD_TEMPLATE = {
  name: 'pc99_business_utility',
  language: 'en_US',
  label: 'Send E-Card',
  description:
    'Sends pc99_business_utility (Call Now + E-Brochure, Utility, no footer) with click tracking. Opens appear on E-Card WhatsApp Tracking.',
  destinationUrl: 'https://www.pestcontrol99.com/e-card/',
  legacyName: 'pest_business_details',
  marketingFallbackName: 'pc99_business_details',
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

/**
 * Pest Control 99 — WhatsApp e-card (Meta template) config.
 *
 * Green E-Card on CRM + Website inquiries.
 *
 * Meta locked recreating `pest_business_details` for ~4 weeks after upgrading
 * its E-Brochure URL to dynamic tracking. Temporary Approved-trackable twin:
 * `pc99_business_details` — same Call Now + E-Brochure copy, dynamic {{1}} URL.
 */
export const WHATSAPP_ORG_ID = '96d71345-5c98-4e9a-8095-0eae9ff855c4';

/** Green E-Card — same business-details message + trackable E-Brochure. */
export const ECARD_TEMPLATE = {
  /** Prefer Meta name once unlocked; until then use approved trackable twin. */
  name: 'pc99_business_details',
  language: 'en_US',
  label: 'Send E-Card',
  description:
    'Sends the PestControl99 business details WhatsApp template (Call Now + E-Brochure) with click tracking. Opens appear on E-Card WhatsApp Tracking.',
  destinationUrl: 'https://www.pestcontrol99.com/e-card/',
  /** Original locked Meta name (cannot recreate for ~4 weeks). */
  legacyName: 'pest_business_details',
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

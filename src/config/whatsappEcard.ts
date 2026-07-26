/**
 * Pest Control 99 — WhatsApp e-card (Meta template) config.
 * Template: pest_business_details · Meta ID 1333062758460952 · en_US · no body variables
 */
export const WHATSAPP_ORG_ID = '96d71345-5c98-4e9a-8095-0eae9ff855c4';

export const ECARD_TEMPLATE = {
  name: 'pest_business_details',
  language: 'en_US',
  metaId: '1333062758460952',
  label: 'Send E-Card',
  description:
    'Sends the approved PestControl99 business details WhatsApp template (digital visiting card / brochure buttons).',
} as const;

/** Pest-Card WhatsApp Track button — Approved Meta template (static E-Brochure URL). */
export const TRACKED_ECARD_TEMPLATE = {
  name: 'pest_ecard_test',
  language: 'en_US',
  metaId: '1012404895122748',
  label: 'Pest-Card WhatsApp Track',
  description:
    'Sends approved pest_ecard_test WhatsApp template. Static E-Brochure URL — no track_ecard on this template.',
  destinationUrl: 'https://www.pestcontrol99.com/e-card/',
} as const;

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

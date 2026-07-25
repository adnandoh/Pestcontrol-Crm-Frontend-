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

/** Tracked brochure template — unique click URL per customer (WhatsFlow track_ecard). */
export const TRACKED_ECARD_TEMPLATE = {
  name: 'pest_ecard_tracked',
  language: 'en_US',
  label: 'Pest-Card WhatsApp Track',
  description:
    'Sends pest_ecard_tracked with a per-customer tracking link. Clicks appear on E-Card WhatsApp Tracking.',
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

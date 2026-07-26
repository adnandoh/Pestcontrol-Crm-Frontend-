/**
 * Pest Control 99 — WhatsApp e-card (Meta template) config.
 * Both green E-Card and blue Pest-Card Track use pest_service_card
 * (Approved Utility with dynamic tracking URL).
 */
export const WHATSAPP_ORG_ID = '96d71345-5c98-4e9a-8095-0eae9ff855c4';

const ECARD_DESTINATION_URL = 'https://www.pestcontrol99.com/e-card/';

/** Green E-Card button — same tracked Utility template as Pest-Card Track. */
export const ECARD_TEMPLATE = {
  name: 'pest_service_card',
  language: 'en_US',
  label: 'Send E-Card',
  description:
    'Sends pest_service_card with per-customer tracking link. Clicks appear on E-Card WhatsApp Tracking.',
  destinationUrl: ECARD_DESTINATION_URL,
} as const;

/** Blue Pest-Card WhatsApp Track — same Approved Utility with dynamic tracking URL. */
export const TRACKED_ECARD_TEMPLATE = {
  name: 'pest_service_card',
  language: 'en_US',
  label: 'Pest-Card WhatsApp Track',
  description:
    'Sends pest_service_card with per-customer tracking link. Clicks appear on E-Card WhatsApp Tracking.',
  destinationUrl: ECARD_DESTINATION_URL,
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

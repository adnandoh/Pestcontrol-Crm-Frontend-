/**
 * Not Booked promotional WhatsApp copy for Website Leads + CRM Inquiries.
 * Freeform wa.me text (not Meta templates). Call + Website lines are
 * linkified by WhatsApp so the customer can tap them.
 */

import { openWhatsApp } from './whatsapp';

export const NOT_BOOKED_OFFER_CALL = '8080748282';
export const NOT_BOOKED_OFFER_CALL_DISPLAY = '8080 74 8282';
export const NOT_BOOKED_OFFER_WEBSITE = 'https://www.pestcontrol99.com';

/** Exact promotional body staff share to not-booked leads. */
export function buildNotBookedOfferMessage(): string {
  return `Hello Sir/Ma’am,

Save *Pestcontrol99.com* for your next pest control service.

Cockroach & Ant • Bed Bug • Termite • Rodent • Mosquito • Wood Borer

*30% OFF | 100% guaranteed results*
As per service warranty terms.

For homes, societies & businesses.
*Available 24×7*

To book, *reply to this message* or *call ${NOT_BOOKED_OFFER_CALL_DISPLAY}*.
${NOT_BOOKED_OFFER_WEBSITE}

📞 *Call:* ${NOT_BOOKED_OFFER_CALL}
🌐 *Website:* ${NOT_BOOKED_OFFER_WEBSITE}`;
}

/** Open WhatsApp chat to the lead with the Not Booked offer prefilled. */
export function openNotBookedOfferWhatsApp(mobile: string): void {
  openWhatsApp(mobile, buildNotBookedOfferMessage());
}

export function openNotBookedOfferCall(): void {
  window.open(`tel:${NOT_BOOKED_OFFER_CALL}`, '_self');
}

export function openNotBookedOfferWebsite(): void {
  window.open(NOT_BOOKED_OFFER_WEBSITE, '_blank', 'noopener,noreferrer');
}

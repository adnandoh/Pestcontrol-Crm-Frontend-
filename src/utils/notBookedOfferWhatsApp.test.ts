import { describe, expect, it } from 'vitest';
import {
  NOT_BOOKED_OFFER_CALL,
  NOT_BOOKED_OFFER_WEBSITE,
  buildNotBookedOfferMessage,
} from './notBookedOfferWhatsApp';

describe('notBookedOfferWhatsApp', () => {
  it('includes the promotional copy, call CTA, and website CTA', () => {
    const msg = buildNotBookedOfferMessage();
    expect(msg).toContain('Hello Sir/Ma’am');
    expect(msg).toContain('Pestcontrol99.com');
    expect(msg).toContain('30% OFF | 100% guaranteed results');
    expect(msg).toContain('Available 24×7');
    expect(msg).toContain('8080 74 8282');
    expect(msg).toContain(`*Call:* ${NOT_BOOKED_OFFER_CALL}`);
    expect(msg).toContain(`*Website:* ${NOT_BOOKED_OFFER_WEBSITE}`);
    expect(msg).toContain(NOT_BOOKED_OFFER_WEBSITE);
  });
});

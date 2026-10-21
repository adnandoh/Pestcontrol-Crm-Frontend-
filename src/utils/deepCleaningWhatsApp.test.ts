import { describe, expect, it } from 'vitest';
import type { DeepCleaningBooking, DeepCleaningInquiry } from '../types';
import {
  DEEP_CLEANING_TERMS_URL,
  deepCleaningBookingConfirmation,
  deepCleaningBookingWhatsAppItems,
  deepCleaningCompletion,
  deepCleaningCustomerName,
  deepCleaningInquiryAcknowledgement,
  deepCleaningInquiryFollowUp,
  deepCleaningInquiryWhatsAppItems,
  deepCleaningQuotation,
  deepCleaningTeamDetails,
  deepCleaningTechnicianJob,
} from './deepCleaningWhatsApp';

function inquiry(overrides: Partial<DeepCleaningInquiry> = {}): DeepCleaningInquiry {
  return {
    id: 12,
    name: 'Website Lead',
    mobile: '9876543210',
    city: '',
    service: 'Deep Cleaning',
    status: 'New',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function booking(overrides: Partial<DeepCleaningBooking> = {}): DeepCleaningBooking {
  return {
    id: 8,
    code: 'DC-00008',
    name: 'Ravi Mehta',
    mobile: '9876543210',
    city: 'Mumbai',
    address: 'Andheri West',
    service: 'Kitchen Deep Cleaning',
    property_size: '2BHK',
    preferred_date_display: '21 Oct 2026',
    preferred_time: '9 AM – 12 PM',
    price: 4500,
    status: 'Pending',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function assertSafe(message: string) {
  expect(message).not.toMatch(/\{[a-z_]+\}/i);
  expect(message.toLowerCase()).not.toContain('undefined');
  expect(message.toLowerCase()).not.toContain('null');
  expect(message).not.toContain('7710032627');
  expect(message).not.toContain('8080748282');
  expect(message.toLowerCase()).not.toContain('payout');
  expect(message.toLowerCase()).not.toContain('commission');
  expect(message).not.toContain('₹₹');
  expect(message).not.toContain('₹0');
}

describe('DeepCleaning WhatsApp messages', () => {
  it('uses Sir/Ma\'am when the lead name is still a placeholder', () => {
    expect(deepCleaningCustomerName('Website Lead')).toBe('Sir/Ma\'am');
    expect(deepCleaningCustomerName('  ')).toBe('Sir/Ma\'am');
    expect(deepCleaningCustomerName('Ravi Mehta')).toBe('Ravi Mehta');
  });

  it('asks only for details that are still missing', () => {
    const blank = deepCleaningInquiryAcknowledgement(inquiry());
    expect(blank).toContain('Sir/Ma\'am');
    expect(blank).toContain('required cleaning service');
    expect(blank).toContain('location / PIN code');
    expect(blank).toContain('7710082627');
    assertSafe(blank);

    const known = deepCleaningInquiryAcknowledgement(
      inquiry({
        name: 'Ravi Mehta',
        service: 'Sofa Cleaning',
        city: 'Pune',
        property_size: '3 Seater',
        preferred_date: '2026-10-22',
      }),
    );
    expect(known).toContain('Ravi Mehta');
    expect(known).not.toContain('location / PIN code');
    expect(known).not.toContain('required cleaning service');
    expect(known).not.toContain('property size');
    expect(known).not.toContain('preferred date');
    assertSafe(known);
  });

  it('follows up without inventing a service category', () => {
    const text = deepCleaningInquiryFollowUp(inquiry());
    expect(text).toContain('for cleaning services');
    expect(text).not.toContain('for *Deep Cleaning*');
    assertSafe(text);
  });

  it('builds a quotation that does not confirm the booking', () => {
    const row = inquiry({
      name: 'Anita',
      service: 'Full Home Deep Cleaning',
      city: 'Thane',
      property_size: '2BHK',
      estimated_price: 8900,
    });
    const text = deepCleaningQuotation(row);
    expect(text).toContain('*Quotation ID:* DCQ-12');
    expect(text).toContain('*Service Amount (excl. GST):* ₹8,900');
    expect(text).toContain('Applicable GST is extra');
    expect(text).toContain(DEEP_CLEANING_TERMS_URL);
    expect(text).toContain('subject to inspection');
    expect(text).not.toContain('booking is confirmed');
    expect(text).not.toContain('Total');
    expect(text).toContain('Bedrooms and living room');
    assertSafe(text);
    expect(deepCleaningInquiryWhatsAppItems(row).map((item) => item.label)).toEqual([
      'Inquiry acknowledgement',
      'Follow up',
      'Quotation',
    ]);
    expect(deepCleaningInquiryWhatsAppItems(inquiry()).map((item) => item.label)).not.toContain('Quotation');
  });

  it('confirms a booking without paid, GST math, team size, or a sent team claim', () => {
    const text = deepCleaningBookingConfirmation(booking());
    expect(text).toContain('booking is confirmed');
    expect(text).toContain('*Booking ID:* DC-00008');
    expect(text).toContain('*Service Amount (excl. GST):* ₹4,500');
    expect(text).toContain('will be shared separately');
    expect(text).not.toContain('have been shared');
    expect(text).not.toContain('Team Size');
    expect(text).not.toContain('Paid');
    expect(text).not.toContain('Balance');
    expect(text).toContain(DEEP_CLEANING_TERMS_URL);
    expect(text).toContain('Platform, sink');
    assertSafe(text);
  });

  it('opens the technician chat for the job and the customer chat for team details', () => {
    const row = booking({
      status: 'On Process',
      technician_name: 'Imran',
      technician_mobile: '9000000001',
      notes: 'Call from the gate',
    });
    const labels = deepCleaningBookingWhatsAppItems(row);
    expect(labels.map((item) => item.label)).toEqual([
      'Booking confirmation',
      'Team details to customer',
      'Updated team details',
      'Job details to technician',
    ]);
    expect(labels[2].message).toContain('Updated team details');
    expect(labels[2].message).not.toContain('Team Size');
    expect(labels[3].mobile).toBe('9000000001');
    expect(labels[3].message).toContain('*NEW CLEANING JOB ASSIGNED*');
    expect(labels[3].message).toContain('Call from the gate');
    expect(labels[3].message).not.toContain('http');
    labels.forEach((item) => assertSafe(item.message));
    expect(deepCleaningTeamDetails(row).includes('Imran')).toBe(true);
    expect(deepCleaningTechnicianJob(row)).not.toContain('maps');
  });

  it('offers completion only after the job is done, and nothing after cancellation', () => {
    const done = booking({ status: 'Done', service: 'Carpet Cleaning' });
    const items = deepCleaningBookingWhatsAppItems(done);
    expect(items.map((item) => item.label)).toContain('Completion and aftercare');
    const completion = deepCleaningCompletion(done);
    expect(completion).toContain('has been completed');
    expect(completion).toContain('until dry');
    expect(completion).not.toContain('Paid');
    assertSafe(completion);
    expect(deepCleaningBookingWhatsAppItems(booking({ status: 'Cancelled' }))).toEqual([]);
  });
});

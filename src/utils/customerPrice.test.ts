import { describe, expect, it } from 'vitest';
import {
  formatCustomerPricePlusGst,
  formatInrGrouped,
  formatWhatsAppAmountParam,
  resolveCustomerPriceBase,
} from './customerPrice';

describe('customerPrice', () => {
  it('formats INR grouping', () => {
    expect(formatInrGrouped(1000)).toBe('1,000');
    expect(formatInrGrouped(100000)).toBe('1,00,000');
  });

  it('uses taxable_amount as the customer base', () => {
    const job = {
      price: '1180',
      taxable_amount: '1000',
      gst_amount: '180',
      gst_mode: 'GST_INCLUSIVE',
      final_payable_amount: '1180',
    };
    expect(resolveCustomerPriceBase(job)).toBe(1000);
    expect(formatCustomerPricePlusGst(job)).toBe('₹1,000 + GST');
    expect(formatWhatsAppAmountParam(job)).toBe('1,000 + GST');
  });

  it('keeps special labels', () => {
    expect(formatCustomerPricePlusGst({ price_display: 'Free (Complaint)', price: '0' })).toBe(
      'Free (Complaint)',
    );
    expect(formatCustomerPricePlusGst({ included_in_amc: true, price: '0' })).toBe(
      'Included in AMC',
    );
  });

  it('treats bare cash price without GST snapshot as the base', () => {
    expect(formatCustomerPricePlusGst({ price: '1000' })).toBe('₹1,000 + GST');
  });
});

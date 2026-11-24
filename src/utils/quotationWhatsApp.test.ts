import { describe, expect, it } from 'vitest';
import type { Quotation, QuotationItem } from '../types';
import {
  QUOTATION_WHATSAPP_SUPPORT,
  buildQuotationWhatsAppMessage,
} from './quotationWhatsApp';

function item(partial: Partial<QuotationItem> & Pick<QuotationItem, 'service_name'>): QuotationItem {
  return {
    frequency: 'One Time',
    quantity: 1,
    rate: 0,
    total: 0,
    ...partial,
  };
}

function quotation(overrides: Partial<Quotation> = {}): Quotation {
  return {
    id: 1,
    quotation_no: 'QT-2026-00125',
    customer_name: 'Salman Shaikh',
    mobile: '9876543210',
    address: '2 BHK Flat, Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    quotation_type: 'Residential',
    property_type: 'Residential Flat',
    status: 'Draft',
    total_amount: 0,
    discount: 0,
    tax_amount: 0,
    grand_total: 0,
    gst_percent: 18,
    price_includes_gst: false,
    is_amc: false,
    visit_count: 1,
    contract_amount: 0,
    license_number: 'LAID020185',
    items: [],
    scopes: [],
    payment_terms: [],
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function assertSafe(message: string) {
  expect(message).not.toMatch(/\{[a-z_]+\}/i);
  expect(message.toLowerCase()).not.toContain('undefined');
  expect(message.toLowerCase()).not.toContain('null');
  expect(message).not.toContain('₹₹');
  expect(message).toContain(QUOTATION_WHATSAPP_SUPPORT);
  expect(message).toContain('*Pestcontrol99.com');
}

describe('buildQuotationWhatsAppMessage', () => {
  it('builds cockroach Standard + Premium quotation with + GST', () => {
    const message = buildQuotationWhatsAppMessage(
      quotation({
        items: [
          item({
            service_name: 'General Pest Control',
            frequency: 'One Time',
            description: 'Standard',
            rate: 1250,
            total: 1250,
          }),
          item({
            service_name: 'General Pest Control',
            frequency: 'One Time',
            description: 'Premium',
            rate: 1600,
            total: 1600,
          }),
          item({
            service_name: 'General Pest Control',
            frequency: 'AMC 3 Services',
            description: 'Standard',
            rate: 2500,
            total: 2500,
          }),
          item({
            service_name: 'General Pest Control',
            frequency: 'AMC 3 Services',
            description: 'Premium',
            rate: 3300,
            total: 3300,
          }),
        ],
        scopes: [
          {
            title: 'Warranty',
            content: '30 days free revisit if covered pests reappear in treated areas.',
          },
        ],
      }),
    );

    assertSafe(message);
    expect(message).toContain('Hello Salman Shaikh,');
    expect(message).toContain('*Cockroach & Ant Control Quotation | 2 BHK Flat*');
    expect(message).toContain('*₹1,250 + GST*');
    expect(message).toContain('*₹1,600 + GST*');
    expect(message).toContain('*₹2,500 + GST*');
    expect(message).toContain('*₹3,300 + GST*');
    expect(message).toContain('reply *Standard* or *Premium*');
    expect(message).not.toContain('1,475');
  });

  it('builds bed bug package template', () => {
    const message = buildQuotationWhatsAppMessage(
      quotation({
        items: [
          item({
            service_name: 'Bed Bug Treatment',
            frequency: '2 Visits',
            rate: 3400,
            total: 3400,
          }),
        ],
      }),
    );
    assertSafe(message);
    expect(message).toContain('*Bed Bug Treatment Quotation');
    expect(message).toContain('*Package ₹3,400 + GST for both visits*');
    expect(message).toContain('*15 days*');
  });

  it('builds termite template with warranty', () => {
    const message = buildQuotationWhatsAppMessage(
      quotation({
        items: [
          item({
            service_name: 'Termite Treatment',
            frequency: 'One Time',
            rate: 3900,
            total: 3900,
          }),
        ],
      }),
    );
    assertSafe(message);
    expect(message).toContain('*Termite Treatment Quotation');
    expect(message).toContain('*Charges ₹3,900 + GST*');
    expect(message).toContain('2 years');
  });

  it('builds rodent template with home rate and separate baiting', () => {
    const message = buildQuotationWhatsAppMessage(
      quotation({
        items: [
          item({
            service_name: 'Rodent Control',
            frequency: 'One Time',
            rate: 1650,
            total: 1650,
          }),
        ],
      }),
    );
    assertSafe(message);
    expect(message).toContain('*Rodent Control Quotation');
    expect(message).toContain('Home Rodent Repellent Treatment');
    expect(message).toContain('₹1,650 + GST');
    expect(message).toContain('Society Common Areas Only');
    expect(message).toContain('separate quote');
  });

  it('builds mosquito template with areas and plan', () => {
    const message = buildQuotationWhatsAppMessage(
      quotation({
        items: [
          item({
            service_name: 'Mosquito Control',
            frequency: 'One Time',
            rate: 1650,
            total: 1650,
          }),
          item({
            service_name: 'Mosquito Control',
            frequency: 'AMC 3 Services',
            rate: 3300,
            total: 3300,
          }),
        ],
        scopes: [
          {
            title: 'Area Covered',
            content: 'Garden | Parking | Passages | Terrace',
          },
        ],
      }),
    );
    assertSafe(message);
    expect(message).toContain('*Mosquito Control Quotation');
    expect(message).toContain('₹1,650 + GST');
    expect(message).toContain('₹3,300 + GST');
    expect(message).toContain('Garden, Parking, Passages, Terrace');
  });

  it('assembles combined quotation with service blocks and priced total', () => {
    const message = buildQuotationWhatsAppMessage(
      quotation({
        master_location_name: 'Andheri West',
        items: [
          item({
            service_name: 'General Pest Control',
            frequency: 'One Time Service',
            description: 'One Time Service',
            rate: 1250,
            total: 1250,
          }),
          item({
            service_name: 'Bed Bug Treatment',
            frequency: 'One Time Service',
            rate: 3400,
            total: 3400,
          }),
          item({
            service_name: 'Rodent Control',
            frequency: 'One Time Service',
            rate: 1650,
            total: 1650,
          }),
        ],
      }),
    );
    assertSafe(message);
    expect(message).toContain('*Pest Control Quotation | 2 BHK Flat, Andheri West*');
    expect(message).toContain('*Cockroach & Ant Control*');
    expect(message).toContain('*Bed Bug Treatment | ₹3,400 + GST*');
    expect(message).toContain('*Home Rodent Repellent Treatment');
    expect(message).toContain('*Rodent Baiting | Society Common Areas Only*');
    expect(message).toContain('*Total for priced services ₹6,300 + GST*');
  });

  it('does not add Standard and Premium into one combined total', () => {
    const message = buildQuotationWhatsAppMessage(
      quotation({
        items: [
          item({
            service_name: 'General Pest Control',
            frequency: 'One Time Service',
            description: 'Standard',
            rate: 1250,
            total: 1250,
          }),
          item({
            service_name: 'General Pest Control',
            frequency: 'One Time Service',
            description: 'Premium',
            rate: 1600,
            total: 1600,
          }),
          item({
            service_name: 'Bed Bug Treatment',
            frequency: 'One Time Service',
            rate: 3400,
            total: 3400,
          }),
        ],
      }),
    );
    assertSafe(message);
    expect(message).toContain('*Total (Standard) ₹4,650 + GST*');
    expect(message).toContain('*Total (Premium) ₹5,000 + GST*');
    expect(message).not.toContain('₹6,250');
  });

  it('maps CRM AMC 3 Services frequency to annual cockroach plan', () => {
    const message = buildQuotationWhatsAppMessage(
      quotation({
        items: [
          item({
            service_name: 'General Pest Control',
            frequency: 'AMC 3 Services',
            description: 'AMC 3 Services',
            rate: 2500,
            total: 2500,
          }),
        ],
      }),
    );
    assertSafe(message);
    expect(message).toContain('*Cockroach & Ant Control Quotation');
    expect(message).toContain('Annual plan *₹2,500 + GST* for *3 visits*');
    expect(message).not.toContain('One-time service *₹2,500');
  });

  it('uses Hello, when customer name is blank', () => {
    const message = buildQuotationWhatsAppMessage(
      quotation({
        customer_name: '',
        contact_person: '',
        company_name: '',
        items: [
          item({
            service_name: 'Termite Treatment',
            rate: 3900,
            total: 3900,
          }),
        ],
      }),
    );
    expect(message.startsWith('Hello,')).toBe(true);
  });

  it('uses including GST when quotation prices already include tax', () => {
    const message = buildQuotationWhatsAppMessage(
      quotation({
        price_includes_gst: true,
        items: [
          item({
            service_name: 'Bed Bug Treatment',
            rate: 3400,
            total: 3400,
          }),
        ],
      }),
    );
    expect(message).toContain('including GST');
    expect(message).not.toContain('+ GST');
  });

  it('matches Pestcontrol99_WhatsApp_Quotation_Templates.docx required phrases', () => {
    const cockroach = buildQuotationWhatsAppMessage(
      quotation({
        items: [
          item({
            service_name: 'General Pest Control',
            description: 'Standard',
            rate: 1250,
            total: 1250,
          }),
          item({
            service_name: 'General Pest Control',
            description: 'Premium',
            rate: 1600,
            total: 1600,
          }),
          item({
            service_name: 'General Pest Control',
            frequency: 'AMC 3 Services',
            description: 'Standard',
            rate: 2500,
            total: 2500,
          }),
          item({
            service_name: 'General Pest Control',
            frequency: 'AMC 3 Services',
            description: 'Premium',
            rate: 3300,
            total: 3300,
          }),
        ],
        scopes: [{ title: 'Warranty', content: '30 days free revisit.' }],
      }),
    );
    assertSafe(cockroach);
    expect(cockroach).toContain('*Standard Treatment*');
    expect(cockroach).toContain(
      'Spray and gel treatment in the agreed areas. Please clear utensils and food items from the areas scheduled for spray.',
    );
    expect(cockroach).toContain('*Premium Treatment – Recommended for an odourless gel service*');
    expect(cockroach).toContain('Imported, professional-grade gel applied around cockroach hiding spots');
    expect(cockroach).toContain('If a spray is required, we’ll explain the preparation in advance.');
    expect(cockroach).toContain('*Service warranty 30 days free revisit*');
    expect(cockroach).toContain('Ant treatment is included in the agreed areas.');

    const termite = buildQuotationWhatsAppMessage(
      quotation({
        items: [item({ service_name: 'Termite Treatment', rate: 3900, total: 3900 })],
      }),
    );
    assertSafe(termite);
    expect(termite).toContain('drill-and-inject treatment where required');
    expect(termite).toContain('seal drilled holes with white cement');
    expect(termite).toContain('*Service warranty – 2 years for the treated areas, as per the agreed scope*');

    const combined = buildQuotationWhatsAppMessage(
      quotation({
        master_location_name: 'Kothrud',
        property_type: 'Office',
        address: '500 sq. ft. Office, Kothrud',
        items: [
          item({
            service_name: 'General Pest Control',
            description: 'Standard',
            rate: 1800,
            total: 1800,
          }),
          item({ service_name: 'Termite Treatment', rate: 3900, total: 3900 }),
          item({ service_name: 'Mosquito Control', rate: 1650, total: 1650 }),
          item({
            service_name: 'Mosquito Control',
            frequency: 'AMC 3 Services',
            rate: 3300,
            total: 3300,
          }),
        ],
        scopes: [
          {
            title: 'Area Covered',
            content: 'Cabins | Workstations | Reception | Pantry',
          },
        ],
      }),
    );
    assertSafe(combined);
    expect(combined).toContain('*Pest Control Quotation |');
    expect(combined).toContain('Kothrud');
    expect(combined).toContain('*Cockroach & Ant Control*');
    expect(combined).toContain('*Termite Treatment | ₹3,900 + GST*');
    expect(combined).toContain('*Mosquito Control*');
    expect(combined).toContain('One-time fogging');
    expect(combined).toContain('Scheduled plan');
    expect(combined).toContain('Thank you for sharing your requirements.');
    expect(combined).toContain('confirm the services and plans you prefer');
  });
});

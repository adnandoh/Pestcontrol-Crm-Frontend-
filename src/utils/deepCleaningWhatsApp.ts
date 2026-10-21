import type { DeepCleaningBooking, DeepCleaningInquiry } from '../types';

/** Live terms page. Staff send these chats by hand; nothing is posted to a WhatsApp API. */
export const DEEP_CLEANING_TERMS_URL = 'https://www.deepcleaning99.com/booking-terms/';
const SUPPORT = '7710082627';

type Scope = { included: string; excluded: string; aftercare: string };

const SCOPE: Record<string, Scope> = {
  'full home': {
    included:
      'Bedrooms and living room; kitchen platform, sink, compatible tiles and cabinet exteriors; agreed bathrooms; suitable floor cleaning; accessible fans, doors, switchboard surfaces, windows and tracks; balcony and emptied cabinet interiors where agreed.',
    excluded:
      'Upholstery/carpet shampooing; chimney and appliance interiors; AC servicing; polishing; wall washing; paint/cement removal; heavy furniture shifting.',
    aftercare:
      'Keep rooms ventilated and allow floors and surfaces to dry. Avoid walking on wet floors. Replace belongings only when shelves and cabinets are dry.',
  },
  kitchen: {
    included:
      'Platform, sink, compatible wall tiles, hob surface, cabinet exteriors and accessible floor; emptied cabinet interiors where agreed.',
    excluded:
      'Chimney/duct interiors; appliance interiors; utensil washing; repairs; dismantling; paint/cement removal.',
    aftercare:
      'Allow shelves and cabinets to dry before replacing items. Rinse food-contact surfaces and utensils with clean drinking-quality water before use. Do not operate appliances if electrical parts are damp.',
  },
  bathroom: {
    included:
      'Agreed number of bathrooms; toilets, basins, compatible tiles, floors, mirrors and accessible fittings.',
    excluded:
      'Plumbing repairs; drain blockage removal; polishing; restoration; guaranteed removal of permanent stains.',
    aftercare:
      'Allow floors to dry and keep the area ventilated. Avoid wet tiles. Do not apply or mix additional cleaning chemicals on freshly treated surfaces.',
  },
  sofa: {
    included:
      'Agreed seats/units; inspection, dry vacuuming and material-appropriate cleaning. Wet extraction only where suitable.',
    excluded:
      'Repairs; polishing; unrelated cushions/items; guaranteed removal of every stain or odour. Leather cleaning only if specifically booked.',
    aftercare:
      'Keep the room ventilated. Do not sit on or cover damp upholstery, or replace damp cushions, until fully dry. Avoid direct heat from heaters or hair dryers.',
  },
  mattress: {
    included:
      'Agreed size, quantity and sides; dry vacuuming and material-appropriate cleaning. Limited wet extraction only where permitted.',
    excluded:
      'Bed-frame cleaning unless booked; pest control; internal foam washing; guaranteed stain removal or sterilisation.',
    aftercare:
      'Allow the mattress to dry completely before use. Do not put on bedsheets or a protector while damp. Keep the room ventilated.',
  },
  carpet: {
    included:
      'Agreed carpet/rug area; dry vacuuming, suitable stain treatment and material-appropriate cleaning or extraction.',
    excluded: 'Repairs; backing restoration; heavy furniture shifting; guaranteed removal of permanent stains.',
    aftercare:
      'Keep the area ventilated and avoid walking on the carpet until dry. Do not replace heavy furniture on damp carpet without suitable protection.',
  },
  office: {
    included:
      'Agreed workstations/cabins and furniture exteriors; accessible internal glass and doors; pantry/washrooms as quoted; suitable floor cleaning.',
    excluded:
      'Chair/sofa/carpet shampooing unless booked; electronics interiors; AC servicing; facade cleaning; polishing; paint/cement removal.',
    aftercare:
      'Allow floors and cleaned surfaces to dry before use. Keep staff away from wet areas. Reconnect or use electrical equipment only when safe and dry.',
  },
};

export type DeepCleaningWhatsAppItem = {
  label: string;
  mobile: string;
  message: string;
};

function clean(value?: string | number | null) {
  return String(value ?? '').trim();
}

export function deepCleaningCustomerName(name?: string | null) {
  const text = clean(name);
  if (!text || text.toLowerCase() === 'website lead') return 'Sir/Ma\'am';
  return text;
}

function scopeFor(service?: string | null): Scope | null {
  const text = clean(service).toLowerCase();
  if (!text) return null;
  if (text.includes('office')) return SCOPE.office;
  if (text.includes('full home')) return SCOPE['full home'];
  if (text.includes('kitchen')) return SCOPE.kitchen;
  if (text.includes('bathroom')) return SCOPE.bathroom;
  if (text.includes('sofa')) return SCOPE.sofa;
  if (text.includes('mattress')) return SCOPE.mattress;
  if (text.includes('carpet')) return SCOPE.carpet;
  return null;
}

function rupees(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function serviceAmountLine(value?: string | number | null) {
  const amount = rupees(value);
  if (!amount) return '';
  return `*Service Amount (excl. GST):* ${amount}\nApplicable GST is extra and is confirmed before the visit.`;
}

function propertyLine(parts: Array<string | null | undefined>) {
  return parts.map((part) => clean(part)).filter(Boolean).join(' · ');
}

function lines(parts: Array<string | false | null | undefined>) {
  const kept: string[] = [];
  for (const part of parts) {
    if (part === false || part == null) continue;
    const text = String(part);
    if (!text.trim()) {
      if (kept.length && kept[kept.length - 1] !== '') kept.push('');
      continue;
    }
    kept.push(text);
  }
  return kept.join('\n').trim();
}

function footer() {
  return `*Deepcleaning99.com*\n*Call / WhatsApp: ${SUPPORT}*`;
}

function specificService(service?: string | null) {
  const text = clean(service);
  if (!text || text.toLowerCase() === 'deep cleaning') return '';
  return text;
}

function joinAsk(parts: string[]) {
  if (parts.length <= 1) return parts[0] || '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export function deepCleaningInquiryAcknowledgement(
  row: Pick<
    DeepCleaningInquiry,
    'name' | 'service' | 'city' | 'area' | 'address' | 'property_size' | 'quantity' | 'preferred_date' | 'preferred_date_display'
  >,
) {
  const missing: string[] = [];
  if (!specificService(row.service)) missing.push('required cleaning service');
  if (!clean(row.city) && !clean(row.area) && !clean(row.address)) missing.push('location / PIN code');
  if (!clean(row.property_size) && !clean(row.quantity)) missing.push('property size or item quantity');
  if (!clean(row.preferred_date) && !clean(row.preferred_date_display)) missing.push('preferred date');
  const ask = missing.length
    ? `Please share your ${joinAsk([...missing, 'photos/video if available'])}.`
    : 'Please share photos or a short video if available.';
  return lines([
    `Hello ${deepCleaningCustomerName(row.name)},`,
    '',
    'Thank you for contacting *Deepcleaning99.com*.',
    '',
    ask,
    '',
    'We’ll share the cleaning scope, price and available slots.',
    '',
    `*Call / WhatsApp: ${SUPPORT}*`,
  ]);
}

export function deepCleaningInquiryFollowUp(row: Pick<DeepCleaningInquiry, 'name' | 'service'>) {
  const service = specificService(row.service);
  const about = service ? `for *${service}*` : 'for cleaning services';
  return lines([
    `Hello ${deepCleaningCustomerName(row.name)}, we received your inquiry ${about} at Deepcleaning99.com.`,
    '',
    'Please reply with a convenient time to call, or share your requirements here for a quotation.',
    '',
    `*${SUPPORT}*`,
  ]);
}

export function deepCleaningQuotation(row: DeepCleaningInquiry) {
  const scope = scopeFor(row.service);
  const property = propertyLine([
    row.property_size,
    row.property_type,
    row.package_name,
    row.quantity ? `${row.quantity} ${clean(row.unit)}`.trim() : '',
  ]);
  const locality = clean(row.area) || clean(row.city);
  return lines([
    `Hello ${deepCleaningCustomerName(row.name)},`,
    '',
    `Please find your *${specificService(row.service) || 'cleaning'} quotation* below:`,
    '',
    `*Quotation ID:* DCQ-${row.id}`,
    property ? `*Property / Quantity:* ${property}` : '',
    locality ? `*Location:* ${locality}` : '',
    serviceAmountLine(row.estimated_price),
    '',
    scope ? `*Service Includes:*\n${scope.included}` : '',
    '',
    scope ? `*Not Included:*\n${scope.excluded}` : '',
    '',
    'Cleaning equipment and chemicals are included.',
    '',
    'Final scope and price are subject to inspection and your approval before work begins.',
    '',
    'Please share your preferred date and complete address to check availability and confirm the booking.',
    '',
    `*Service Terms:* ${DEEP_CLEANING_TERMS_URL}`,
    '',
    footer(),
    'by Pestcontrol99.com',
  ]);
}

function visitBits(row: Pick<DeepCleaningBooking, 'property_size' | 'property_type' | 'package_name' | 'quantity' | 'unit' | 'address' | 'city' | 'area' | 'preferred_date_display' | 'preferred_date' | 'preferred_time' | 'notes'>) {
  const property = propertyLine([
    row.property_size,
    row.property_type,
    row.package_name,
    row.quantity ? `${row.quantity} ${clean(row.unit)}`.trim() : '',
  ]);
  const address = propertyLine([row.address, row.area, row.city]);
  const date = clean(row.preferred_date_display) || clean(row.preferred_date);
  const slot = clean(row.preferred_time);
  return { property, address, date, slot, notes: clean(row.notes) };
}

export function deepCleaningBookingConfirmation(row: DeepCleaningBooking) {
  const scope = scopeFor(row.service);
  const visit = visitBits(row);
  return lines([
    `Hello ${deepCleaningCustomerName(row.name)},`,
    '',
    'Your *Deepcleaning99.com booking is confirmed.* ✅',
    '',
    `*Booking ID:* ${clean(row.code) || row.id}`,
    `*Service:* ${clean(row.service) || 'Deep cleaning'}`,
    visit.property ? `*Property / Quantity:* ${visit.property}` : '',
    visit.date ? `*Date:* ${visit.date}` : '',
    visit.slot ? `*Arrival Slot:* ${visit.slot}` : '',
    visit.address ? `*Address:* ${visit.address}` : '',
    '',
    serviceAmountLine(row.price),
    '',
    scope ? `*Included:* ${scope.included}` : '',
    scope ? `*Not Included:* ${scope.excluded}` : '',
    '',
    'Cleaning equipment and chemicals are included. Please arrange water, electricity and building access. Keep valuables safely stored and ensure you or an authorised adult remain present until completion.',
    '',
    '*Please review our service terms before the visit:*',
    DEEP_CLEANING_TERMS_URL,
    '',
    'Contact us before service if you have questions about the scope or terms.',
    '',
    'Your assigned team details will be shared separately.',
    '',
    footer(),
  ]);
}

export function deepCleaningTeamDetails(row: DeepCleaningBooking, updated = false) {
  const visit = visitBits(row);
  const when = [visit.date, visit.slot].filter(Boolean).join(', ');
  return lines([
    `Hello ${deepCleaningCustomerName(row.name)},`,
    '',
    updated ? 'Updated team details for your cleaning.' : 'Your cleaning team has been assigned.',
    '',
    `*Booking ID:* ${clean(row.code) || row.id}`,
    `*Service:* ${clean(row.service) || 'Deep cleaning'}`,
    when ? `*Date / Arrival Slot:* ${when}` : '',
    '',
    clean(row.technician_name) ? `*Team Lead:* ${clean(row.technician_name)}` : '',
    clean(row.technician_mobile) ? `*Contact:* ${clean(row.technician_mobile)}` : '',
    '',
    'Please contact our support team for booking changes or additional services.',
    '',
    `*Deepcleaning99.com*`,
    `*Support: ${SUPPORT}*`,
  ]);
}

export function deepCleaningTechnicianJob(row: DeepCleaningBooking) {
  const scope = scopeFor(row.service);
  const visit = visitBits(row);
  const when = [visit.date, visit.slot].filter(Boolean).join(', ');
  return lines([
    '*NEW CLEANING JOB ASSIGNED*',
    '',
    `*Booking ID:* ${clean(row.code) || row.id}`,
    `*Customer:* ${deepCleaningCustomerName(row.name)}`,
    `*Phone:* ${clean(row.mobile)}`,
    `*Service:* ${clean(row.service) || 'Deep cleaning'}`,
    visit.property ? `*Property / Quantity:* ${visit.property}` : '',
    when ? `*Date / Arrival Slot:* ${when}` : '',
    visit.address ? `*Address:* ${visit.address}` : '',
    '',
    scope ? `*Included Work:* ${scope.included}` : '',
    scope ? `*Excluded Work:* ${scope.excluded}` : '',
    visit.notes ? `*Instructions:* ${visit.notes}` : '',
    '',
    serviceAmountLine(row.price).replace('Service Amount (excl. GST)', 'Customer Service Amount (excl. GST)'),
    '',
    'Confirm acceptance and team availability. Carry the required equipment, chemicals and PPE. Call before arrival. Check surfaces and document existing damage with permission. Obtain office and customer approval before additional work. Complete the customer walkthrough and update job and payment status. Use customer details only for this assigned job.',
    '',
    `*Office Support: ${SUPPORT}*`,
  ]);
}

export function deepCleaningCompletion(row: DeepCleaningBooking) {
  const scope = scopeFor(row.service);
  const visit = visitBits(row);
  return lines([
    `Hello ${deepCleaningCustomerName(row.name)},`,
    '',
    `Your *${clean(row.service) || 'cleaning'}* service has been completed.`,
    '',
    `*Booking ID:* ${clean(row.code) || row.id}`,
    visit.date ? `*Service Date:* ${visit.date}` : '',
    serviceAmountLine(row.price),
    '',
    scope ? `*After-Cleaning Care:*\n${scope.aftercare}` : '',
    '',
    'Please contact us promptly if an agreed cleaning area was missed. Reporting within 24 hours helps us assess the concern; it does not affect your legal rights.',
    '',
    `*Support / WhatsApp: ${SUPPORT}*`,
    '*Deepcleaning99.com*',
  ]);
}

export function deepCleaningInquiryWhatsAppItems(row: DeepCleaningInquiry): DeepCleaningWhatsAppItem[] {
  if (!clean(row.mobile)) return [];
  const items: DeepCleaningWhatsAppItem[] = [
    { label: 'Inquiry acknowledgement', mobile: row.mobile, message: deepCleaningInquiryAcknowledgement(row) },
    { label: 'Follow up', mobile: row.mobile, message: deepCleaningInquiryFollowUp(row) },
  ];
  if (rupees(row.estimated_price)) {
    items.push({ label: 'Quotation', mobile: row.mobile, message: deepCleaningQuotation(row) });
  }
  return items;
}

export function deepCleaningBookingWhatsAppItems(row: DeepCleaningBooking): DeepCleaningWhatsAppItem[] {
  if (row.status === 'Cancelled') return [];
  const items: DeepCleaningWhatsAppItem[] = [];
  if (clean(row.mobile)) {
    items.push({
      label: 'Booking confirmation',
      mobile: row.mobile,
      message: deepCleaningBookingConfirmation(row),
    });
  }
  if (clean(row.mobile) && clean(row.technician_name)) {
    items.push({
      label: 'Team details to customer',
      mobile: row.mobile,
      message: deepCleaningTeamDetails(row, false),
    });
    items.push({
      label: 'Updated team details',
      mobile: row.mobile,
      message: deepCleaningTeamDetails(row, true),
    });
  }
  if (clean(row.technician_mobile)) {
    items.push({
      label: 'Job details to technician',
      mobile: row.technician_mobile || '',
      message: deepCleaningTechnicianJob(row),
    });
  }
  if (row.status === 'Done' && clean(row.mobile)) {
    items.push({
      label: 'Completion and aftercare',
      mobile: row.mobile,
      message: deepCleaningCompletion(row),
    });
  }
  return items;
}

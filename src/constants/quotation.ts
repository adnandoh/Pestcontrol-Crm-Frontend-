/** Pest Control 99 — quotation / invoice letterhead & defaults */

export const COMPANY = {
  name: 'Pest Control 99',
  tagline: 'Professional Pest Management Solutions',
  website: 'www.pestcontrol99.com',
  email: 'info@pestcontrol99.com',
  phones: ['8080748282', '7710032627'],
  license: 'LAID020185',
  address: 'Mumbai, Maharashtra, India',
  gstin: '', // add when available
} as const;

export const BANK_DETAILS = {
  accountName: 'Pest Control 99',
  bankName: '—',
  accountNo: '—',
  ifsc: '—',
  upi: '—',
} as const;

export const DEFAULT_TERMS = `1. This quotation is valid for 30 days from the date of issue unless otherwise stated.
2. Prices are inclusive of applicable taxes unless mentioned separately.
3. Service will be carried out using approved chemicals and trained technicians.
4. Customer must provide access to all required areas at the scheduled time.
5. Warranty / free revisit is as per service scope mentioned above.
6. Payment terms as agreed in this quotation must be fulfilled before / after service as stated.
7. Pest Control 99 is not liable for pre-existing structural damage or pest activity outside the treated area.`;

export const DEFAULT_PAYMENT_TERMS = [
  { term: 'Advance', description: '50% advance before service; balance on completion.' },
  { term: 'Mode', description: 'Cash / UPI / Bank transfer accepted.' },
];

export const DEFAULT_SCOPES_RESIDENTIAL = [
  {
    title: 'General Pest Control',
    content:
      'Gel and spray treatment for cockroaches, ants, spiders and common household pests in kitchen, bathroom and living areas.',
  },
  {
    title: 'Safety',
    content: 'Odourless / low-odour chemicals where applicable. Brief vacate period advised for spray areas.',
  },
];

export const QUOTATION_TYPES = [
  'Residential',
  'Commercial',
  'Society',
  'Office',
  'Restaurant',
  'Clinic/Hospital',
  'AMC Package',
  'One Time Service',
] as const;

export const SERVICE_PRESETS = [
  'Cockroach Control',
  'Bed Bug Treatment',
  'Rodent Control',
  'Termite Treatment',
  'Mosquito Control',
  'Rat Guard Installation',
  'Ants Control',
  'General Pest Control',
  'AMC Package',
];

export const FREQUENCY_OPTIONS = [
  'One Time',
  'Weekly',
  'Monthly',
  'Quarterly',
  'Half Yearly',
  'Yearly',
  '12 Services',
  '6 Services',
  '3 Services',
  'AMC',
];

/** Indian numbering format for amount in words (simplified) */
export function amountInWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return 'Zero Rupees Only';
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const two = (num: number): string => {
    if (num < 20) return ones[num];
    return `${tens[Math.floor(num / 10)]}${num % 10 ? ' ' + ones[num % 10] : ''}`.trim();
  };

  const section = (num: number, label: string): string => {
    if (!num) return '';
    let w = '';
    if (num >= 100) {
      w += ones[Math.floor(num / 100)] + ' Hundred';
      num %= 100;
      if (num) w += ' ';
    }
    if (num) w += two(num);
    return w ? `${w} ${label}`.trim() : '';
  };

  let rem = n;
  let parts: string[] = [];
  if (rem >= 10000000) {
    parts.push(section(Math.floor(rem / 10000000), 'Crore'));
    rem %= 10000000;
  }
  if (rem >= 100000) {
    parts.push(section(Math.floor(rem / 100000), 'Lakh'));
    rem %= 100000;
  }
  if (rem >= 1000) {
    parts.push(section(Math.floor(rem / 1000), 'Thousand'));
    rem %= 1000;
  }
  if (rem) parts.push(section(rem, ''));
  return `${parts.join(' ').trim()} Rupees Only`;
}

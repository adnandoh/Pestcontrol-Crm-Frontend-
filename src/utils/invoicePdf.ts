import html2pdf from "html2pdf.js";
import type { JobCard } from "../types";
import { COMPANY_LOGO_URL, COMPANY_SIGNATURE_STAMP_URL } from "../constants/companyAssets";
import { BANK_DETAILS, COMPANY, INVOICE_DEFAULTS, formatCompanyGstin, formatCompanyPhone } from "../constants/quotation";
import { waitForImagesInElement } from "./pdfImagePreload";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString("en-GB");
};

const formatMoney = (value: string | number | undefined) => {
  const n = Number.parseFloat(String(value ?? 0).replace(/[^\d.-]/g, "")) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
};

const sanitizeFileName = (value: string) => value.replace(/[^\w-]+/g, "_");

export interface ManualInvoiceItem {
  service: string;
  schedule?: string;
  technician?: string;
  amount: number | string;
  quantity?: number | string;
  rate?: number | string;
  sacCode?: string;
}

export interface ManualInvoiceInput {
  invoiceNo?: string;
  invoiceDate?: string;
  billedByName?: string;
  billedByAddress?: string;
  /** Seller/company GSTIN; shown under BILLED BY when set. Empty omits it. */
  billedByGstNumber?: string;
  billedToName: string;
  billedToMobile?: string;
  billedToAddress?: string;
  /** Customer GSTIN; shown as `GSTIN …` on the PDF when set. */
  billedToGstNumber?: string;
  bookingCode?: string;
  bookingCreatedAt?: string;
  nextServiceDate?: string;
  reference?: string;
  tax?: number | string;
  notes?: string;
  items: ManualInvoiceItem[];
  supplyCategory?: string;
  customerState?: string;
  placeOfSupply?: string;
  sacCode?: string;
  gstRate?: number | string;
  cgst?: number | string;
  sgst?: number | string;
  igst?: number | string;
  subtotal?: number | string;
  grandTotal?: number | string;
  paymentReceived?: number | string;
  balanceDue?: number | string;
  paymentTerms?: string;
  dueDate?: string;
  bankIfsc?: string;
  documentLabel?: string;
}

interface RenderInvoicePayload {
  invoiceNo: string;
  invoiceDate: string;
  billedByName: string;
  billedByAddress: string;
  billedByGstNumber: string;
  billedToName: string;
  billedToMobile: string;
  billedToAddress: string;
  billedToGstNumber: string;
  bookingCode: string;
  bookingCreatedAt: string;
  nextServiceDate: string;
  reference: string;
  notes?: string;
  taxAmount: number;
  subtotal: number;
  grandTotal: number;
  items: Array<{
    service: string;
    schedule: string;
    technician: string;
    amount: string;
  }>;
}

const formatGstinLine = (value?: string) => {
  const raw = (value || "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper.startsWith("GSTIN")) return upper.replace(/\s+/g, " ").trim();
  return `GSTIN ${upper}`;
};

const buildSignatureBlockHtml = () => `
  <div style="margin-top:22px;display:flex;justify-content:flex-end;padding-right:4px">
    <div style="text-align:center;min-width:200px">
      <img
        src="${COMPANY_SIGNATURE_STAMP_URL}"
        alt="Authorised Signatory"
        style="height:76px;max-width:210px;width:auto;object-fit:contain;display:block;margin:0 auto"
      />
      <div style="font-size:11px;font-weight:800;color:#1e5a9e;margin-top:8px">${COMPANY.legalName}</div>
      <div style="font-size:9px;color:#6b7280;margin-top:2px">${COMPANY.brandName}</div>
      <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;margin-top:2px">Authorised Signatory</div>
    </div>
  </div>
`;

const buildInvoiceNode = (payload: RenderInvoicePayload) => {
  const logoPath = COMPANY_LOGO_URL;
  const rowsHtml = payload.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px;border:1px solid #e5e7eb;font-size:12px">${item.service}</td>
          <td style="padding:10px;border:1px solid #e5e7eb;font-size:12px">${item.schedule}</td>
          <td style="padding:10px;border:1px solid #e5e7eb;font-size:12px">${item.technician}</td>
          <td style="padding:10px;border:1px solid #e5e7eb;font-size:12px;text-align:right">${item.amount}</td>
        </tr>
      `
    )
    .join("");

  const node = document.createElement("div");
  node.style.fontFamily = "Arial, sans-serif";
  node.style.padding = "0";
  node.style.margin = "0";
  node.style.color = "#111827";
  node.style.width = "680px";
  node.style.maxWidth = "680px";
  node.style.boxSizing = "border-box";
  node.innerHTML = `
    <style>
      .invoice-root,
      .invoice-root * {
        color: #111827 !important;
        box-sizing: border-box;
      }
      .invoice-root {
        width: 100% !important;
        max-width: 680px !important;
        background: #ffffff !important;
        color: #111827 !important;
        overflow: visible !important;
      }
      .invoice-root .inv-header-table {
        width: 100% !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
      }
      .invoice-root .inv-header-table td {
        vertical-align: middle !important;
      }
      .invoice-root .inv-service-table {
        width: 100% !important;
        table-layout: fixed !important;
        word-wrap: break-word !important;
      }
      .invoice-root .inv-service-table th:nth-child(1),
      .invoice-root .inv-service-table td:nth-child(1) { width: 28% !important; }
      .invoice-root .inv-service-table th:nth-child(2),
      .invoice-root .inv-service-table td:nth-child(2) { width: 22% !important; }
      .invoice-root .inv-service-table th:nth-child(3),
      .invoice-root .inv-service-table td:nth-child(3) { width: 25% !important; }
      .invoice-root .inv-service-table th:nth-child(4),
      .invoice-root .inv-service-table td:nth-child(4) { width: 25% !important; }
      .invoice-root .inv-header {
        background: #138443 !important;
        color: #ffffff !important;
      }
      .invoice-root .inv-header * {
        color: #ffffff !important;
      }
      .invoice-root .inv-logo {
        background: #ffffff !important;
      }
      .invoice-root .inv-muted {
        color: #6b7280 !important;
      }
      .invoice-root .inv-body {
        background: #ffffff !important;
      }
      .invoice-root .inv-table,
      .invoice-root .inv-table thead,
      .invoice-root .inv-table tbody,
      .invoice-root .inv-table tr,
      .invoice-root .inv-table th,
      .invoice-root .inv-table td,
      .invoice-root .inv-total-table,
      .invoice-root .inv-total-table tr,
      .invoice-root .inv-total-table td {
        background: #ffffff !important;
        color: #111827 !important;
        border-color: #e5e7eb !important;
      }
      .invoice-root .inv-table th {
        background: #f3f4f6 !important;
      }
      .invoice-root .inv-footer {
        background: #f9fafb !important;
        color: #6b7280 !important;
      }
    </style>
    <div class="invoice-root" style="border:1px solid #e5e7eb;border-radius:10px">
      <table class="inv-header inv-header-table" style="background:#138443;color:#fff;width:100%">
        <tr>
          <td style="padding:14px 16px;width:55%">
            <img class="inv-logo" src="${logoPath}" style="height:48px;max-width:200px;object-fit:contain;background:#fff;border-radius:6px;padding:4px;display:block" />
          </td>
          <td style="padding:14px 16px;width:45%;text-align:right;color:#fff">
            <div style="font-size:26px;font-weight:900;letter-spacing:.04em;line-height:1.1;color:#fff">INVOICE</div>
            <div style="font-size:11px;margin-top:4px;color:#fff">Invoice No: ${payload.invoiceNo}</div>
            <div style="font-size:11px;color:#fff">Date: ${payload.invoiceDate}</div>
          </td>
        </tr>
      </table>
      <div class="inv-body" style="padding:18px 18px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px">
          <div>
            <div class="inv-muted" style="font-size:11px;color:#6b7280;font-weight:700">BILLED BY</div>
            <div style="font-size:14px;font-weight:700;margin-top:5px">${payload.billedByName}</div>
            ${
              payload.billedByGstNumber
                ? `<div style="font-size:12px;color:#111827;line-height:1.6;margin-top:2px">${payload.billedByGstNumber}</div>`
                : ""
            }
            <div class="inv-muted" style="font-size:12px;color:#4b5563;line-height:1.6;white-space:pre-line">${payload.billedByAddress}</div>
            <div class="inv-muted" style="font-size:11px;color:#4b5563;margin-top:4px">${COMPANY.brandName} | ${formatCompanyPhone()}</div>
          </div>
          <div>
            <div class="inv-muted" style="font-size:11px;color:#6b7280;font-weight:700">BILLED TO</div>
            <div style="font-size:14px;font-weight:700;margin-top:5px">${payload.billedToName}</div>
            ${
              payload.billedToGstNumber
                ? `<div style="font-size:12px;color:#111827;line-height:1.6;margin-top:2px">${payload.billedToGstNumber}</div>`
                : ""
            }
            <div class="inv-muted" style="font-size:12px;color:#4b5563;line-height:1.6">Mobile: ${payload.billedToMobile}</div>
            <div class="inv-muted" style="font-size:12px;color:#4b5563;line-height:1.6">Address: ${payload.billedToAddress}</div>
          </div>
        </div>
        <table class="inv-table inv-service-table" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;table-layout:fixed">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="text-align:left;padding:10px;border:1px solid #e5e7eb;font-size:12px">Service</th>
              <th style="text-align:left;padding:10px;border:1px solid #e5e7eb;font-size:12px">Schedule</th>
              <th style="text-align:left;padding:10px;border:1px solid #e5e7eb;font-size:12px">Technician</th>
              <th style="text-align:right;padding:10px;border:1px solid #e5e7eb;font-size:12px">Amount</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="display:flex;justify-content:flex-end;margin-top:14px">
          <table class="inv-total-table" style="width:300px;border-collapse:collapse">
            <tr><td style="padding:6px 4px;font-size:12px">Subtotal</td><td style="padding:6px 4px;font-size:12px;text-align:right">${formatMoney(payload.subtotal)}</td></tr>
            <tr><td style="padding:6px 4px;font-size:12px">Tax</td><td style="padding:6px 4px;font-size:12px;text-align:right">${formatMoney(payload.taxAmount)}</td></tr>
            <tr><td style="padding:8px 4px;font-size:14px;font-weight:800;border-top:1px solid #d1d5db">Grand Total</td><td style="padding:8px 4px;font-size:14px;font-weight:800;border-top:1px solid #d1d5db;text-align:right">${formatMoney(payload.grandTotal)}</td></tr>
          </table>
        </div>
        <div class="inv-muted" style="margin-top:16px;font-size:11px;color:#6b7280;line-height:1.6">
          <div>Booking ID: ${payload.bookingCode}</div>
          <div>Created: ${payload.bookingCreatedAt}</div>
          <div>Next Service Date: ${payload.nextServiceDate}</div>
          <div>Reference: ${payload.reference}</div>
          ${payload.notes ? `<div>Notes: ${payload.notes}</div>` : ""}
        </div>
        ${buildSignatureBlockHtml()}
      </div>
      <div class="inv-footer" style="padding:12px 22px;background:#f9fafb;font-size:11px;color:#6b7280;text-align:center">
        Thank you for choosing ${COMPANY.brandName} — ${COMPANY.legalName}
      </div>
    </div>
  `;
  return node;
};

const moneyPlain = (value: string | number | undefined) => {
  const n = Number.parseFloat(String(value ?? 0).replace(/[^\d.-]/g, "")) || 0;
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const belowTwenty = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tensNames = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const wordsBelowHundred = (n: number) => {
  if (n < 20) return belowTwenty[n];
  return `${tensNames[Math.floor(n / 10)]}${n % 10 ? ` ${belowTwenty[n % 10]}` : ""}`.trim();
};

const wordsBelowThousand = (n: number) => {
  if (n < 100) return wordsBelowHundred(n);
  const rest = n % 100;
  return `${belowTwenty[Math.floor(n / 100)]} Hundred${rest ? ` ${wordsBelowHundred(rest)}` : ""}`;
};

const rupeesInWords = (value: string | number | undefined) => {
  const amount = Math.round((Number.parseFloat(String(value ?? 0).replace(/[^\d.-]/g, "")) || 0) * 100);
  const rupees = Math.floor(amount / 100);
  const paise = amount % 100;
  const chunks = [
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
  ] as const;
  let pending = rupees;
  const parts: string[] = [];
  for (const [size, label] of chunks) {
    const count = Math.floor(pending / size);
    if (count) parts.push(`${wordsBelowThousand(count)} ${label}`);
    pending %= size;
  }
  if (pending) parts.push(wordsBelowThousand(pending));
  const rupeeWords = parts.filter(Boolean).join(" ") || "Zero";
  const paiseWords = paise ? ` and ${wordsBelowHundred(paise)} Paise` : "";
  return `Indian Rupee ${rupeeWords}${paiseWords} Only`;
};

const buildTaxInvoiceNode = (data: ManualInvoiceInput) => {
  const gstRate = Number.parseFloat(String(data.gstRate ?? 18)) || 18;
  const half = gstRate / 2;
  const igst = Number.parseFloat(String(data.igst ?? 0)) || 0;
  const intra = igst <= 0;
  const partyGst = data.supplyCategory === "B2C"
    ? "B2C – Unregistered"
    : formatGstinLine(data.billedToGstNumber) || "-";
  const rows = data.items.map((item, index) => {
    const qty = Number.parseFloat(String(item.quantity ?? 1)) || 1;
    const rate = Number.parseFloat(String(item.rate ?? item.amount ?? 0)) || 0;
    const amount = Number.parseFloat(String(item.amount ?? 0)) || qty * rate;
    const lineCgst = intra ? (amount * half) / 100 : 0;
    const lineSgst = intra ? (amount * half) / 100 : 0;
    const lineIgst = intra ? 0 : (amount * gstRate) / 100;
    const taxCells = intra
      ? `<td style="padding:6px;border:1px solid #d1d5db;text-align:right">${half}%</td><td style="padding:6px;border:1px solid #d1d5db;text-align:right">${moneyPlain(lineCgst)}</td><td style="padding:6px;border:1px solid #d1d5db;text-align:right">${half}%</td><td style="padding:6px;border:1px solid #d1d5db;text-align:right">${moneyPlain(lineSgst)}</td>`
      : `<td style="padding:6px;border:1px solid #d1d5db;text-align:right">${gstRate}%</td><td style="padding:6px;border:1px solid #d1d5db;text-align:right">${moneyPlain(lineIgst)}</td>`;
    return `<tr>
      <td style="padding:6px;border:1px solid #d1d5db">${index + 1}</td>
      <td style="padding:6px;border:1px solid #d1d5db">${item.service}</td>
      <td style="padding:6px;border:1px solid #d1d5db">${item.sacCode || data.sacCode || "998531"}</td>
      <td style="padding:6px;border:1px solid #d1d5db;text-align:right">${qty.toFixed(2)}</td>
      <td style="padding:6px;border:1px solid #d1d5db;text-align:right">${moneyPlain(rate || amount)}</td>
      ${taxCells}
      <td style="padding:6px;border:1px solid #d1d5db;text-align:right">${moneyPlain(amount)}</td>
    </tr>`;
  }).join("");
  const taxHead = intra
    ? `<th style="padding:6px;border:1px solid #d1d5db">CGST</th><th style="padding:6px;border:1px solid #d1d5db">Amt</th><th style="padding:6px;border:1px solid #d1d5db">SGST</th><th style="padding:6px;border:1px solid #d1d5db">Amt</th>`
    : `<th style="padding:6px;border:1px solid #d1d5db">IGST</th><th style="padding:6px;border:1px solid #d1d5db">Amt</th>`;
  const node = document.createElement("div");
  node.style.width = "680px";
  node.style.background = "#fff";
  node.style.color = "#111";
  node.style.fontFamily = "Arial, sans-serif";
  node.innerHTML = `
    <div style="padding:18px 20px 8px;display:flex;justify-content:space-between;gap:16px">
      <div style="max-width:340px">
        <img src="${COMPANY_LOGO_URL}" alt="${COMPANY.brandName}" style="height:54px;object-fit:contain" />
        <div style="font-size:16px;font-weight:800;margin-top:8px">${data.billedByName || COMPANY.legalName}</div>
        <div style="font-size:11px;line-height:1.45;white-space:pre-line">${data.billedByAddress || INVOICE_DEFAULTS.billedByAddress}</div>
        <div style="font-size:11px;margin-top:4px">${formatGstinLine(data.billedByGstNumber) || formatCompanyGstin()}</div>
        <div style="font-size:11px">${formatCompanyPhone()} · ${COMPANY.website}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:800;letter-spacing:.04em">TAX INVOICE</div>
        <div style="font-size:12px;margin-top:8px"># : ${data.invoiceNo || ""}</div>
        <div style="font-size:12px">Invoice Date : ${formatDate(data.invoiceDate)}</div>
        <div style="font-size:12px">Terms : ${data.paymentTerms || "Due end of next month"}</div>
        <div style="font-size:12px">Due Date : ${formatDate(data.dueDate)}</div>
        <div style="font-size:12px">Place Of Supply : ${data.placeOfSupply || "Maharashtra"}</div>
        ${data.documentLabel && data.documentLabel !== "Invoice" ? `<div style="margin-top:6px;font-size:12px;font-weight:800;color:#991b1b">${data.documentLabel}</div>` : ""}
      </div>
    </div>
    <div style="padding:8px 20px 12px">
      <div style="font-size:11px;color:#6b7280">Bill To</div>
      <div style="font-size:14px;font-weight:800">${data.billedToName}</div>
      <div style="font-size:12px">${partyGst}</div>
      <div style="font-size:12px;white-space:pre-line">${data.billedToAddress || ""}</div>
      <div style="font-size:12px">${data.customerState || ""}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="padding:6px;border:1px solid #d1d5db">#</th>
          <th style="padding:6px;border:1px solid #d1d5db;text-align:left">Description</th>
          <th style="padding:6px;border:1px solid #d1d5db">HSN/SAC</th>
          <th style="padding:6px;border:1px solid #d1d5db">Qty</th>
          <th style="padding:6px;border:1px solid #d1d5db">Rate</th>
          ${taxHead}
          <th style="padding:6px;border:1px solid #d1d5db">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;padding:12px 20px">
      <table style="width:280px;font-size:12px;border-collapse:collapse">
        <tr><td style="padding:4px 0">Sub Total</td><td style="text-align:right">${moneyPlain(data.subtotal)}</td></tr>
        ${intra ? `<tr><td style="padding:4px 0">CGST (${half}%)</td><td style="text-align:right">${moneyPlain(data.cgst)}</td></tr><tr><td style="padding:4px 0">SGST (${half}%)</td><td style="text-align:right">${moneyPlain(data.sgst)}</td></tr>` : `<tr><td style="padding:4px 0">IGST (${gstRate}%)</td><td style="text-align:right">${moneyPlain(data.igst)}</td></tr>`}
        <tr><td style="padding:6px 0;font-weight:800;border-top:1px solid #111">Total</td><td style="padding:6px 0;text-align:right;font-weight:800;border-top:1px solid #111">₹${moneyPlain(data.grandTotal)}</td></tr>
        <tr><td style="padding:4px 0">Payment Made</td><td style="text-align:right">(-) ${moneyPlain(data.paymentReceived)}</td></tr>
        <tr><td style="padding:6px 0;font-weight:800">Balance Due</td><td style="text-align:right;font-weight:800">₹${moneyPlain(data.balanceDue)}</td></tr>
      </table>
    </div>
    <div style="padding:0 20px 8px;font-size:12px"><strong>Total In Words</strong><div>${rupeesInWords(data.grandTotal)}</div></div>
    <div style="padding:8px 20px;font-size:12px;line-height:1.5">
      <div style="font-weight:800">Bank details</div>
      <div>${BANK_DETAILS.accountName}</div>
      <div>${BANK_DETAILS.bankName}, ${BANK_DETAILS.branch}</div>
      <div>Account ${BANK_DETAILS.accountNo}</div>
      <div>IFSC ${data.bankIfsc || BANK_DETAILS.ifsc}</div>
    </div>
    <div style="padding:0 20px 16px;font-size:12px">Thanks for your business.</div>
    ${buildSignatureBlockHtml()}
  `;
  return node;
};

const printInvoiceNode = async (node: HTMLElement, filenameBase: string) => {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "width:680px",
    "padding:0",
    "margin:0",
    "background:#ffffff",
    "z-index:-1",
    "opacity:0",
    "pointer-events:none",
  ].join(";");
  wrapper.appendChild(node);
  document.body.appendChild(wrapper);

  try {
    await waitForImagesInElement(node);

    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `${sanitizeFileName(filenameBase)}_invoice.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: 680,
          windowWidth: 680,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(node)
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }
};

const exportInvoicePdf = async (payload: RenderInvoicePayload, filenameBase: string) => {
  await printInvoiceNode(buildInvoiceNode(payload), filenameBase);
};

export const downloadInvoicePdf = async (job: JobCard) => {
  const numericAmount = Number.parseFloat(String(job.price ?? 0).replace(/[^\d.-]/g, "")) || 0;
  const payload: RenderInvoicePayload = {
    invoiceNo: `INV-${job.code || job.id}`,
    invoiceDate: new Date().toLocaleDateString("en-GB"),
    billedByName: COMPANY.legalName,
    billedByAddress: INVOICE_DEFAULTS.billedByAddress,
    billedByGstNumber: formatCompanyGstin(),
    billedToName: job.client_name || "-",
    billedToMobile: job.client_mobile || "-",
    billedToAddress: job.client_address || "-",
    billedToGstNumber: "",
    bookingCode: job.code || "-",
    bookingCreatedAt: formatDate(job.created_at),
    nextServiceDate: formatDate(job.next_service_date),
    reference: job.reference || "Other",
    taxAmount: 0,
    subtotal: numericAmount,
    grandTotal: numericAmount,
    items: [
      {
        service: job.service_type || "-",
        schedule: formatDate(job.schedule_datetime),
        technician: job.technician_name || job.assigned_to || "-",
        amount: formatMoney(job.price),
      },
    ],
  };

  await exportInvoicePdf(payload, job.code || `booking_${job.id}`);
};

export const downloadManualInvoicePdf = async (data: ManualInvoiceInput) => {
  if (data.supplyCategory) {
    await printInvoiceNode(buildTaxInvoiceNode(data), data.invoiceNo || "invoice");
    return;
  }
  const items = data.items
    .filter((item) => item.service.trim())
    .map((item) => {
      const numericAmount = Number.parseFloat(String(item.amount ?? 0).replace(/[^\d.-]/g, "")) || 0;
      return {
        service: item.service.trim(),
        schedule: formatDate(item.schedule),
        technician: item.technician?.trim() || "-",
        amount: formatMoney(numericAmount),
        numericAmount,
      };
    });

  const subtotal = items.reduce((sum, item) => sum + item.numericAmount, 0);
  const taxAmount = Number.parseFloat(String(data.tax ?? 0).replace(/[^\d.-]/g, "")) || 0;
  const grandTotal = subtotal + taxAmount;
  const invoiceNo = (data.invoiceNo || `INV-${Date.now()}`).trim();

  const payload: RenderInvoicePayload = {
    invoiceNo,
    invoiceDate: formatDate(data.invoiceDate) === "-" ? new Date().toLocaleDateString("en-GB") : formatDate(data.invoiceDate),
    billedByName: data.billedByName?.trim() || INVOICE_DEFAULTS.billedByName,
    billedByAddress: data.billedByAddress?.trim() || INVOICE_DEFAULTS.billedByAddress,
    billedByGstNumber:
      data.billedByGstNumber === undefined
        ? formatCompanyGstin()
        : formatGstinLine(data.billedByGstNumber),
    billedToName: data.billedToName.trim() || "-",
    billedToMobile: data.billedToMobile?.trim() || "-",
    billedToAddress: data.billedToAddress?.trim() || "-",
    billedToGstNumber: formatGstinLine(data.billedToGstNumber),
    bookingCode: data.bookingCode?.trim() || "-",
    bookingCreatedAt: formatDate(data.bookingCreatedAt),
    nextServiceDate: formatDate(data.nextServiceDate),
    reference: data.reference?.trim() || INVOICE_DEFAULTS.reference,
    notes: data.notes?.trim(),
    taxAmount,
    subtotal,
    grandTotal,
    items:
      items.length > 0
        ? items.map((item) => ({
            service: item.service,
            schedule: item.schedule,
            technician: item.technician,
            amount: item.amount,
          }))
        : [
            {
              service: INVOICE_DEFAULTS.defaultServiceItem,
              schedule: "-",
              technician: "-",
              amount: formatMoney(0),
            },
          ],
  };

  await exportInvoicePdf(payload, invoiceNo);
};

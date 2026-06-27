import html2pdf from "html2pdf.js";
import type { JobCard } from "../types";
import { COMPANY_LOGO_URL, COMPANY_SIGNATURE_STAMP_URL } from "../constants/companyAssets";
import { COMPANY, INVOICE_DEFAULTS, formatCompanyPhone } from "../constants/quotation";
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
}

export interface ManualInvoiceInput {
  invoiceNo?: string;
  invoiceDate?: string;
  billedByName?: string;
  billedByAddress?: string;
  billedToName: string;
  billedToMobile?: string;
  billedToAddress?: string;
  bookingCode?: string;
  bookingCreatedAt?: string;
  nextServiceDate?: string;
  reference?: string;
  tax?: number | string;
  notes?: string;
  items: ManualInvoiceItem[];
}

interface RenderInvoicePayload {
  invoiceNo: string;
  invoiceDate: string;
  billedByName: string;
  billedByAddress: string;
  billedToName: string;
  billedToMobile: string;
  billedToAddress: string;
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
            <div class="inv-muted" style="font-size:12px;color:#4b5563;line-height:1.6;white-space:pre-line">${payload.billedByAddress}</div>
            <div class="inv-muted" style="font-size:11px;color:#4b5563;margin-top:4px">${COMPANY.brandName} | ${formatCompanyPhone()}</div>
          </div>
          <div>
            <div class="inv-muted" style="font-size:11px;color:#6b7280;font-weight:700">BILLED TO</div>
            <div style="font-size:14px;font-weight:700;margin-top:5px">${payload.billedToName}</div>
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

const exportInvoicePdf = async (payload: RenderInvoicePayload, filenameBase: string) => {
  const node = buildInvoiceNode(payload);

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

export const downloadInvoicePdf = async (job: JobCard) => {
  const numericAmount = Number.parseFloat(String(job.price ?? 0).replace(/[^\d.-]/g, "")) || 0;
  const payload: RenderInvoicePayload = {
    invoiceNo: `INV-${job.code || job.id}`,
    invoiceDate: new Date().toLocaleDateString("en-GB"),
    billedByName: COMPANY.legalName,
    billedByAddress: INVOICE_DEFAULTS.billedByAddress,
    billedToName: job.client_name || "-",
    billedToMobile: job.client_mobile || "-",
    billedToAddress: job.client_address || "-",
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
    billedToName: data.billedToName.trim() || "-",
    billedToMobile: data.billedToMobile?.trim() || "-",
    billedToAddress: data.billedToAddress?.trim() || "-",
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

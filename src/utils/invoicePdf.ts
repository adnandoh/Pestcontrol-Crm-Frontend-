import html2pdf from "html2pdf.js";
import type { JobCard } from "../types";

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

export const downloadInvoicePdf = async (job: JobCard) => {
  const logoPath = "/pest-control-99-logo.png";
  const invoiceNo = `INV-${job.code || job.id}`;
  const amount = formatMoney(job.price);
  const created = formatDate(job.created_at);
  const schedule = formatDate(job.schedule_datetime);
  const nextService = formatDate(job.next_service_date);

  const node = document.createElement("div");
  node.style.fontFamily = "Arial, sans-serif";
  node.style.padding = "24px";
  node.style.color = "#111827";
  node.style.width = "790px";
  node.innerHTML = `
    <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
      <div style="background:#138443;color:#fff;padding:18px 22px;display:flex;justify-content:space-between;align-items:center">
        <img src="${logoPath}" style="height:56px;max-width:280px;object-fit:contain;background:#fff;border-radius:6px;padding:4px" />
        <div style="text-align:right">
          <div style="font-size:26px;font-weight:800;letter-spacing:.04em">INVOICE</div>
          <div style="font-size:12px;margin-top:4px">Invoice No: ${invoiceNo}</div>
          <div style="font-size:12px">Date: ${new Date().toLocaleDateString("en-GB")}</div>
        </div>
      </div>
      <div style="padding:18px 22px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
          <div>
            <div style="font-size:11px;color:#6b7280;font-weight:700">BILLED BY</div>
            <div style="font-size:14px;font-weight:700;margin-top:5px">Pest Control 99</div>
            <div style="font-size:12px;color:#4b5563;line-height:1.6">Mumbai, Maharashtra, India</div>
          </div>
          <div>
            <div style="font-size:11px;color:#6b7280;font-weight:700">BILLED TO</div>
            <div style="font-size:14px;font-weight:700;margin-top:5px">${job.client_name || "-"}</div>
            <div style="font-size:12px;color:#4b5563;line-height:1.6">Mobile: ${job.client_mobile || "-"}</div>
            <div style="font-size:12px;color:#4b5563;line-height:1.6">Address: ${job.client_address || "-"}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="text-align:left;padding:10px;border:1px solid #e5e7eb;font-size:12px">Service</th>
              <th style="text-align:left;padding:10px;border:1px solid #e5e7eb;font-size:12px">Schedule</th>
              <th style="text-align:left;padding:10px;border:1px solid #e5e7eb;font-size:12px">Technician</th>
              <th style="text-align:right;padding:10px;border:1px solid #e5e7eb;font-size:12px">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:10px;border:1px solid #e5e7eb;font-size:12px">${job.service_type || "-"}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;font-size:12px">${schedule}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;font-size:12px">${job.technician_name || job.assigned_to || "-"}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;font-size:12px;text-align:right">${amount}</td>
            </tr>
          </tbody>
        </table>
        <div style="display:flex;justify-content:flex-end;margin-top:14px">
          <table style="width:280px;border-collapse:collapse">
            <tr><td style="padding:6px 4px;font-size:12px">Subtotal</td><td style="padding:6px 4px;font-size:12px;text-align:right">${amount}</td></tr>
            <tr><td style="padding:6px 4px;font-size:12px">Tax</td><td style="padding:6px 4px;font-size:12px;text-align:right">${formatMoney(0)}</td></tr>
            <tr><td style="padding:8px 4px;font-size:14px;font-weight:800;border-top:1px solid #d1d5db">Grand Total</td><td style="padding:8px 4px;font-size:14px;font-weight:800;border-top:1px solid #d1d5db;text-align:right">${amount}</td></tr>
          </table>
        </div>
        <div style="margin-top:16px;font-size:11px;color:#6b7280;line-height:1.6">
          <div>Booking ID: ${job.code || "-"}</div>
          <div>Created: ${created}</div>
          <div>Next Service Date: ${nextService}</div>
          <div>Reference: ${job.reference || "Other"}</div>
        </div>
      </div>
      <div style="padding:12px 22px;background:#f9fafb;font-size:11px;color:#6b7280;text-align:center">
        Thank you for choosing Pest Control 99
      </div>
    </div>
  `;

  document.body.appendChild(node);
  try {
    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename: `${(job.code || `booking_${job.id}`).replace(/[^\w-]+/g, "_")}_invoice.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(node)
      .save();
  } finally {
    document.body.removeChild(node);
  }
};

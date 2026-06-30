import { waitForImagesInElement } from './pdfImagePreload';

export interface DownloadQuotationPdfOptions {
  element: HTMLElement;
  filename: string;
}

/** Inline fixes so html2canvas captures layout reliably (flex/page-break quirks). */
function normalizeQuotationCloneForPdf(clone: HTMLElement): void {
  const scopes = clone.querySelector<HTMLElement>('.q-scopes-section');
  if (scopes) {
    scopes.style.display = 'flex';
    scopes.style.flexWrap = 'wrap';
    scopes.style.gap = '5px 12px';
    scopes.style.width = '100%';
  }

  clone.querySelectorAll<HTMLElement>('.q-scope-block').forEach((block) => {
    block.style.display = 'block';
    block.style.breakInside = 'avoid';
    block.style.pageBreakInside = 'avoid';
    block.style.marginBottom = '0';
    block.style.width = 'calc(50% - 6px)';
    block.style.minWidth = '0';
    block.style.boxSizing = 'border-box';
  });

  const pricing = clone.querySelector<HTMLElement>('.q-pricing-block');
  if (pricing) {
    pricing.style.pageBreakInside = 'auto';
    pricing.style.marginBottom = '4px';
  }

  const totalsTable = clone.querySelector<HTMLElement>('.q-totals-table');
  if (totalsTable) {
    totalsTable.style.width = '100%';
    totalsTable.style.borderCollapse = 'collapse';
    totalsTable.style.tableLayout = 'fixed';
  }

  clone.querySelectorAll<HTMLElement>('.q-totals-value, .q-grand-total-value').forEach((cell) => {
    cell.style.textAlign = 'right';
    cell.style.whiteSpace = 'nowrap';
  });

  // Force flex on payment/bank grid — CSS Grid 1fr causes left-column clipping in html2canvas
  const paymentBankGrid = clone.querySelector<HTMLElement>('.q-payment-bank-grid');
  if (paymentBankGrid) {
    paymentBankGrid.style.display = 'flex';
    paymentBankGrid.style.flexDirection = 'row';
    paymentBankGrid.style.gap = '10px';
    paymentBankGrid.style.width = '100%';
    paymentBankGrid.style.overflow = 'visible';
  }
  clone.querySelectorAll<HTMLElement>('.q-payment-col, .q-bank-col').forEach((col) => {
    col.style.flex = '1 1 0';
    col.style.minWidth = '0';
    col.style.overflow = 'visible';
    col.style.boxSizing = 'border-box';
  });
}

/** Render quotation DOM to A4 PDF and trigger browser download. */
export async function downloadQuotationPdf({
  element,
  filename,
}: DownloadQuotationPdfOptions): Promise<void> {
  const safeName = filename.replace(/[^\w.-]+/g, '_') || 'quotation.pdf';
  const finalName = safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`;

  const { default: html2pdf } = await import('html2pdf.js');

  const captureWidth = 794;

  // Build an isolated off-screen container so html2canvas sees the element
  // at exactly left:0, top:0 with no inherited position offsets.
  const wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'position:absolute',
    'left:-9999px',
    'top:0',
    `width:${captureWidth}px`,
    'padding:0',
    'margin:0',
    'border:0',
    'background:#ffffff',
    'overflow:visible',
  ].join(';');

  const clone = element.cloneNode(true) as HTMLElement;

  // Reset any layout properties on the clone root that could shift content
  clone.style.cssText = [
    `width:${captureWidth}px`,
    `max-width:${captureWidth}px`,
    'margin:0',
    'padding:0',
    'border:0',
    'border-radius:0',
    'box-shadow:none',
    'overflow:visible',
    'background:#ffffff',
  ].join(';');

  clone.classList.add('q-pdf-export');
  clone.querySelector('.quotation-doc')?.classList.add('q-pdf-export');

  // Give the inner padding element a fixed, compact padding
  const paddingEl = clone.querySelector<HTMLElement>('.quotation-print-padding');
  if (paddingEl) {
    paddingEl.classList.add('q-pdf-export');
    paddingEl.style.padding = '20px 24px';
  }

  clone.querySelectorAll('.quotation-no-print').forEach((el) => el.remove());
  normalizeQuotationCloneForPdf(clone);
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    await waitForImagesInElement(clone);

    const options = {
      margin: [0, 0, 0, 0] as [number, number, number, number],
      filename: finalName,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: captureWidth,
        windowWidth: captureWidth,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: {
        unit: 'mm' as const,
        format: 'a4' as const,
        orientation: 'portrait' as const,
      },
      pagebreak: {
        mode: ['css', 'legacy'] as const,
        avoid: ['.q-grand-total-row', '.q-totals-table'],
      },
    };

    await html2pdf().set(options).from(clone).save();
  } finally {
    document.body.removeChild(wrapper);
  }
}

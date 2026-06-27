import { waitForImagesInElement } from './pdfImagePreload';

export interface DownloadQuotationPdfOptions {
  element: HTMLElement;
  filename: string;
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
  const wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${captureWidth}px`,
    'padding:0',
    'margin:0',
    'background:#ffffff',
    'z-index:-1',
    'opacity:0',
    'pointer-events:none',
  ].join(';');

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${captureWidth}px`;
  clone.style.maxWidth = `${captureWidth}px`;
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    await waitForImagesInElement(clone);

    const options = {
      margin: [8, 8, 8, 8] as [number, number, number, number],
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
        avoid: ['.quotation-doc-header', '.quotation-doc-footer', 'tr'],
      },
    };

    await html2pdf().set(options).from(clone).save();
  } finally {
    document.body.removeChild(wrapper);
  }
}

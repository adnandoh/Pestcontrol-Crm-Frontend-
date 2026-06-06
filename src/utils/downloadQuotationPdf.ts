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

  await waitForImagesInElement(element);

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
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4' as const,
      orientation: 'portrait' as const,
    },
    pagebreak: {
      mode: ['css', 'legacy'] as const,
      avoid: ['tr'],
    },
  };

  await html2pdf().set(options).from(element).save();
}

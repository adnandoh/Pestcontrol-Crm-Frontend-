import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Loader2, Printer, Share2, Zap, Pencil, X } from 'lucide-react';
import { enhancedApiService } from '../services/api.enhanced';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import QuotationDocument from '../components/quotation/QuotationDocument';
import { COMPANY, getQuotationDisplayName } from '../constants/quotation';
import { downloadQuotationPdf } from '../utils/downloadQuotationPdf';

const QuotationPreview: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const previewRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    document.body.classList.add('quotation-preview-mode');
    return () => document.body.classList.remove('quotation-preview-mode');
  }, []);

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => enhancedApiService.getQuotation(Number(id)),
    enabled: !!id,
  });

  const convertMutation = useMutation({
    mutationFn: (quotationId: number) => enhancedApiService.convertQuotationToBooking(quotationId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      alert(`Converted to booking: ${data.booking_code}`);
      navigate('/jobcards');
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Conversion failed';
      alert(msg);
    },
  });

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    if (!previewRef.current || !quotation) return;
    setDownloadingPdf(true);
    try {
      await downloadQuotationPdf({
        element: previewRef.current,
        filename: quotation.quotation_no,
      });
    } catch (err) {
      console.error('PDF download failed:', err);
      alert('Could not generate PDF. Please use Print / PDF, or try again in a moment.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!quotation) return;
    const name = getQuotationDisplayName(quotation);
    const message = `Hello ${name},

Please find your quotation from ${COMPANY.name}.

Quotation No: ${quotation.quotation_no}
Amount: Rs.${Number(quotation.grand_total).toLocaleString('en-IN')}

Thank you.
${COMPANY.website}`;
    const phone = quotation.mobile.replace(/\D/g, '').slice(-10);
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="quotation-preview-page flex min-h-[60vh] items-center justify-center text-gray-500">
        Loading quotation...
      </div>
    );
  }
  if (!quotation) {
    return (
      <div className="quotation-preview-page flex min-h-[60vh] items-center justify-center text-red-600 font-bold">
        Quotation not found.
      </div>
    );
  }

  return (
    <div className="quotation-preview-page min-h-full bg-slate-100 pb-8 print:bg-white print:pb-0">
      {/* Toolbar — hidden when printing */}
      <div className="quotation-no-print sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/quotations')} aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/quotations')}
              className="gap-1 text-gray-600"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{quotation.quotation_no}</h2>
              <p className="text-xs text-gray-500">{getQuotationDisplayName(quotation)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/quotations/edit/${quotation.id}`)} className="gap-1">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="gap-1 border-[#1e5a9e] text-[#1e5a9e] hover:bg-blue-50"
            >
              {downloadingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {downloadingPdf ? 'Generating…' : 'Download PDF'}
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="gap-1 text-green-700 border-green-200">
              <Share2 className="h-3.5 w-3.5" /> WhatsApp
            </Button>
            {quotation.status !== 'Converted' && (
              <Button
                size="sm"
                onClick={() => convertMutation.mutate(quotation.id)}
                disabled={convertMutation.isPending}
                className="bg-[#2d8a2f] hover:bg-[#246b27] text-white gap-1"
              >
                <Zap className="h-3.5 w-3.5" /> Convert to Booking
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Document — full width, A4-sized, solid white (no sidebar bleed) */}
      <div className="quotation-preview-canvas mx-auto w-full max-w-[210mm] px-3 py-6 sm:px-4 print:max-w-none print:px-0 print:py-0">
        <div
          ref={previewRef}
          className="quotation-print-area rounded-lg bg-white shadow-lg print:rounded-none print:shadow-none"
        >
          <div className="quotation-print-padding p-6 sm:p-8 md:p-10 print:p-0">
            <QuotationDocument quotation={quotation} />
          </div>
        </div>

        <div className="quotation-no-print mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="p-4 text-center">
            <p className="text-[10px] uppercase font-bold text-gray-400">Status</p>
            <p className="text-sm font-black text-gray-800 mt-1">{quotation.status}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-[10px] uppercase font-bold text-gray-400">Grand Total</p>
            <p className="text-lg font-black text-[#c41e3a] mt-1">
              Rs.{Number(quotation.grand_total).toLocaleString('en-IN')}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-[10px] uppercase font-bold text-gray-400">Type</p>
            <p className="text-sm font-bold text-gray-800 mt-1">{quotation.quotation_type}</p>
          </Card>
        </div>

        <p className="quotation-no-print mt-4 text-center text-[10px] text-gray-400">
          Download PDF saves directly to your device. Print opens the browser print dialog.
        </p>
      </div>
    </div>
  );
};

export default QuotationPreview;

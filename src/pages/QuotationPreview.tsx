import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer, Share2, Zap, Pencil } from 'lucide-react';
import { enhancedApiService } from '../services/api.enhanced';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import QuotationDocument from '../components/quotation/QuotationDocument';
import { COMPANY } from '../constants/quotation';

const QuotationPreview: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const previewRef = useRef<HTMLDivElement>(null);

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

  const handleShareWhatsApp = () => {
    if (!quotation) return;
    const message = `Hello ${quotation.customer_name},

Please find your quotation from ${COMPANY.name}.

Quotation No: ${quotation.quotation_no}
Amount: Rs.${Number(quotation.grand_total).toLocaleString('en-IN')}

Thank you.
${COMPANY.website}`;
    const phone = quotation.mobile.replace(/\D/g, '').slice(-10);
    window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading quotation...</div>;
  }
  if (!quotation) {
    return <div className="p-8 text-center text-red-600 font-bold">Quotation not found.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20 print:bg-white print:pb-0">
      <div className="quotation-no-print sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-[900px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/quotations')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-sm font-bold text-gray-900">{quotation.quotation_no}</h2>
              <p className="text-xs text-gray-500">{quotation.customer_name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/quotations/edit/${quotation.id}`)} className="gap-1">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
              <Printer className="h-3.5 w-3.5" /> Print / PDF
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

      <div className="max-w-[900px] mx-auto mt-6 px-4 print:max-w-none print:px-0 print:mt-0">
        <div
          ref={previewRef}
          className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none print:rounded-none p-8 print:p-0"
        >
          <QuotationDocument quotation={quotation} />
        </div>

        <div className="quotation-no-print mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        <p className="quotation-no-print text-center text-[10px] text-gray-400 mt-4">
          Tip: Use Print / PDF and choose &quot;Save as PDF&quot; to send to customer.
        </p>
      </div>
    </div>
  );
};

export default QuotationPreview;

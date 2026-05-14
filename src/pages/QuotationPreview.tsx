import React, { useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  Share2, 
  Send, 
  CheckCircle,
  FileText,
  Clock,
  User,
  MapPin,
  Calendar,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { enhancedApiService } from '../services/api.enhanced';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { cn } from '../utils/cn';
import type { Quotation } from '../types';

const QuotationPreview: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const previewRef = useRef<HTMLDivElement>(null);

  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => enhancedApiService.getQuotation(Number(id)),
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => enhancedApiService.convertQuotationToBooking(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      alert(`Successfully converted to Booking: ${data.booking_code}`);
      navigate(`/jobcards`);
    },
    onError: (error: any) => alert(error.message || 'Error converting quotation')
  });

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!quotation) return;
    const message = `Hello ${quotation.customer_name}, here is your Quotation ${quotation.quotation_no} for Pest Control services. Amount: ₹${quotation.grand_total}. View here: [Link]`;
    window.open(`https://wa.me/91${quotation.mobile}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (isLoading) return <div className="p-8 text-center">Loading preview...</div>;
  if (!quotation) return <div className="p-8 text-center text-red-500 font-bold">Quotation not found!</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Action Bar - Sticky */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-3 shadow-sm">
        <div className="max-w-[1000px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/quotations')} className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="hidden sm:block">
              <h2 className="text-sm font-black text-gray-900 leading-none">{quotation.quotation_no}</h2>
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-wider">{quotation.customer_name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 bg-white hidden md:flex">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="gap-2 bg-white text-green-600 hover:bg-green-50 border-green-100">
              <Share2 className="h-4 w-4" />
              WhatsApp
            </Button>
            {quotation.status !== 'Converted' && (
              <Button 
                onClick={() => convertMutation.mutate(quotation.id)}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6 shadow-lg shadow-blue-100"
                disabled={convertMutation.isPending}
              >
                <Zap className="h-4 w-4 fill-white" />
                Convert to Booking
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="max-w-[1000px] mx-auto mt-8 px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Document Preview */}
          <div className="lg:col-span-3 space-y-6">
            <div 
              ref={previewRef}
              className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100 print:shadow-none print:border-none print:m-0"
            >
              {/* PDF Header */}
              <div className="p-10 border-b-8 border-blue-600 bg-gray-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-4xl font-black text-blue-900 tracking-tighter uppercase italic">Multi Pest Control</h1>
                    <p className="text-xs text-blue-600 font-bold tracking-widest mt-1 uppercase">Advanced Hygiene & Pest Management Solutions</p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-500 bg-white inline-flex px-2 py-1 rounded-full border border-gray-100">
                      <ShieldCheck className="h-3 w-3 text-green-500" />
                      LICENSE NO: {quotation.license_number}
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-1 uppercase">Quotation</h2>
                    <div className="flex flex-col text-xs font-bold text-gray-500">
                      <span>REF: {quotation.quotation_no}</span>
                      <span>DATE: {format(new Date(quotation.created_at), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-10 p-10 bg-white">
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Client Information</p>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-gray-900 leading-tight">{quotation.customer_name}</h3>
                    {quotation.company_name && <p className="text-sm font-bold text-gray-600 italic">{quotation.company_name}</p>}
                    <p className="text-sm text-gray-500 leading-relaxed font-medium mt-2">{quotation.address}, {quotation.city}, {quotation.state}</p>
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-50">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Mobile</span>
                        <span className="text-sm font-bold text-gray-700">{quotation.mobile}</span>
                      </div>
                      <div className="w-px h-6 bg-gray-100 mx-2" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Email</span>
                        <span className="text-sm font-bold text-gray-700">{quotation.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Service Details</p>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Type</span>
                      <span className="text-sm font-bold text-gray-700">{quotation.quotation_type}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">AMC Status</span>
                      <span className="text-sm font-bold text-gray-700">{quotation.is_amc ? 'YES' : 'NO'}</span>
                    </div>
                    {quotation.is_amc && (
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Visits</span>
                        <span className="text-sm font-bold text-gray-700">{quotation.visit_count} Services / Year</span>
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Valid Until</span>
                      <span className="text-sm font-bold text-red-600">{quotation.expiry_date ? format(new Date(quotation.expiry_date), 'dd/MM/yyyy') : '30 Days'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="p-10">
                <table className="w-full text-left rounded-2xl overflow-hidden border border-gray-100">
                  <thead className="bg-blue-900 text-white">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">#</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Description of Service</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Frequency</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {quotation.items.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-gray-400">{(i + 1).toString().padStart(2, '0')}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{item.service_name}</p>
                          {item.description && <p className="text-xs text-gray-500 mt-1">{item.description}</p>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{item.frequency}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-black text-gray-900">₹{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50/50">
                      <td colSpan={3} className="px-6 py-4 text-sm font-bold text-gray-500 text-right uppercase tracking-wider">Subtotal</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">₹{quotation.total_amount.toLocaleString()}</td>
                    </tr>
                    {quotation.discount > 0 && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={3} className="px-6 py-2 text-sm font-bold text-red-500 text-right uppercase tracking-wider">Discount</td>
                        <td className="px-6 py-2 text-sm font-bold text-red-500 text-right">-₹{quotation.discount.toLocaleString()}</td>
                      </tr>
                    )}
                    <tr className="bg-gray-50/50">
                      <td colSpan={3} className="px-6 py-2 text-sm font-bold text-gray-500 text-right uppercase tracking-wider">GST (18%)</td>
                      <td className="px-6 py-2 text-sm font-bold text-gray-900 text-right">₹{quotation.tax_amount.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-blue-600 text-white">
                      <td colSpan={3} className="px-6 py-5 text-lg font-black text-right uppercase tracking-tighter">Grand Total (Inclusive of All Taxes)</td>
                      <td className="px-6 py-5 text-2xl font-black text-right tracking-tighter">₹{quotation.grand_total.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Footer Terms */}
              <div className="p-10 bg-gray-50/30 grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-gray-100">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Scope of Work</h4>
                  <div className="space-y-3">
                    {quotation.scopes.length > 0 ? quotation.scopes.map((s, i) => (
                      <div key={i}>
                        <p className="text-xs font-bold text-gray-900 uppercase tracking-tight">{s.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{s.content}</p>
                      </div>
                    )) : (
                      <p className="text-[11px] text-gray-500 leading-relaxed italic">Standard pest management procedures will be followed using approved chemicals.</p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Terms & Conditions</h4>
                  <div className="space-y-2">
                    <p className="text-[11px] text-gray-500 leading-relaxed whitespace-pre-line">{quotation.terms_and_conditions}</p>
                  </div>
                  <div className="pt-6 mt-6 border-t border-gray-100 flex flex-col items-end">
                    <div className="h-16 w-32 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] text-gray-300 font-bold uppercase italic">Digitally Signed</div>
                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mt-2">Authorized Signatory</p>
                    <p className="text-[10px] font-bold text-blue-600">Multi Pest Control</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Timeline & Quick Info */}
          <div className="space-y-6">
            <Card className="p-6 border-none shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Status Timeline</h3>
              <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                <div className="flex gap-4 relative">
                  <div className="h-6 w-6 rounded-full bg-blue-600 border-4 border-white shadow-sm z-10" />
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-none">Draft Created</p>
                    <p className="text-[10px] text-gray-500 font-medium mt-1">{format(new Date(quotation.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                  </div>
                </div>
                <div className="flex gap-4 relative">
                  <div className={cn(
                    "h-6 w-6 rounded-full border-4 border-white shadow-sm z-10",
                    quotation.status === 'Sent' || quotation.status === 'Approved' || quotation.status === 'Converted' ? "bg-amber-500" : "bg-gray-200"
                  )} />
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-none">Quotation Sent</p>
                    <p className="text-[10px] text-gray-500 font-medium mt-1">Pending approval</p>
                  </div>
                </div>
                <div className="flex gap-4 relative">
                  <div className={cn(
                    "h-6 w-6 rounded-full border-4 border-white shadow-sm z-10",
                    quotation.status === 'Approved' || quotation.status === 'Converted' ? "bg-green-500" : "bg-gray-200"
                  )} />
                  <div>
                    <p className="text-sm font-bold text-gray-900 leading-none">Customer Approved</p>
                    <p className="text-[10px] text-gray-500 font-medium mt-1">Ready for conversion</p>
                  </div>
                </div>
                {quotation.status === 'Converted' && (
                  <div className="flex gap-4 relative">
                    <div className="h-6 w-6 rounded-full bg-purple-600 border-4 border-white shadow-sm z-10" />
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-none tracking-tight">Converted to Booking</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-1">Job Card {quotation.invoice_no}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 border-none shadow-sm bg-blue-600 text-white">
              <h3 className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-4">Quick Insights</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold opacity-60 uppercase">Contract Value</span>
                  <span className="text-xl font-black">₹{quotation.grand_total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold opacity-60 uppercase">Profit Est.</span>
                  <span className="text-xl font-black">₹{(quotation.grand_total * 0.4).toLocaleString()}</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-6 bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2 font-bold"
                onClick={() => navigate(`/quotations/edit/${quotation.id}`)}
              >
                <FileText className="h-4 w-4" />
                Modify Terms
              </Button>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default QuotationPreview;

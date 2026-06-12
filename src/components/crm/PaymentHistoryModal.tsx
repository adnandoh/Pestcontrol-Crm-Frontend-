import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import type { BookingPaymentRecord, JobCard } from '../../types';
import dayjs from 'dayjs';

interface PaymentHistoryModalProps {
  isOpen: boolean;
  jobCard: JobCard | null;
  onClose: () => void;
}

const formatMoney = (value: string | number) => {
  const num = Number.parseFloat(String(value));
  return Number.isFinite(num) ? num.toLocaleString('en-IN') : '0';
};

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  jobCard,
  onClose,
}) => {
  const [records, setRecords] = useState<BookingPaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !jobCard) return;
    const load = async () => {
      try {
        setLoading(true);
        const data = await enhancedApiService.getBookingPaymentHistory(jobCard.id);
        setRecords(data);
      } catch (err) {
        console.error('Failed to load payment history:', err);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, jobCard?.id]);

  if (!isOpen || !jobCard) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-black text-lg">Payment History</h3>
            <p className="text-gray-300 text-[10px] font-bold uppercase tracking-widest mt-0.5">
              {jobCard.code} • {jobCard.client_name}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-8">Loading history…</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No payment records found.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] uppercase tracking-widest text-gray-500">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Amount</th>
                  <th className="py-2 pr-2">Mode</th>
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2 pr-2">Balance</th>
                  <th className="py-2 pr-2">Collected By</th>
                  <th className="py-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="py-2 pr-2 font-semibold text-gray-700">
                      {dayjs(row.created_at).format('DD MMM YYYY, hh:mm A')}
                    </td>
                    <td className="py-2 pr-2 font-black text-emerald-700">₹{formatMoney(row.amount)}</td>
                    <td className="py-2 pr-2">{row.payment_mode}</td>
                    <td className="py-2 pr-2 capitalize">{row.collection_type.replace('_', ' ')}</td>
                    <td className="py-2 pr-2">₹{formatMoney(row.balance_after)}</td>
                    <td className="py-2 pr-2">{row.collected_by_name || '—'}</td>
                    <td className="py-2 text-gray-500">{row.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryModal;

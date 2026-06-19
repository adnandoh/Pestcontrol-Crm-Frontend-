import React, { useEffect, useState } from 'react';
import { X, Wallet, CreditCard } from 'lucide-react';
import type { JobCard } from '../../types';

export interface CollectPaymentFormData {
  amount: string;
  paymentMode: 'Cash' | 'Online';
  remarks: string;
}

interface CollectPaymentModalProps {
  isOpen: boolean;
  jobCard: JobCard | null;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (data: CollectPaymentFormData) => void;
}

const parseAmount = (value?: string | number | null): number => {
  if (value === null || value === undefined) return 0;
  const raw = String(value).replace(/[₹,\s]/g, '').trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  isOpen,
  jobCard,
  isLoading = false,
  onClose,
  onSubmit,
}) => {
  const pending = parseAmount(jobCard?.pending_amount);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setAmount(pending > 0 ? String(pending) : '');
    setPaymentMode(null);
    setRemarks('');
    setError('');
  }, [isOpen, jobCard?.id, pending]);

  if (!isOpen || !jobCard) return null;

  const handleSubmit = () => {
    const value = parseAmount(amount);
    if (value <= 0) {
      setError('Enter a valid collection amount.');
      return;
    }
    if (value > pending) {
      setError('Amount cannot exceed pending balance.');
      return;
    }
    if (!paymentMode) {
      setError('Select payment mode.');
      return;
    }
    onSubmit({ amount, paymentMode, remarks });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-amber-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-black text-lg">Collect Payment</h3>
            <p className="text-amber-100 text-[10px] font-bold uppercase tracking-widest mt-0.5">
              {jobCard.code} • {jobCard.client_name}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase">Pending</p>
              <p className="text-lg font-black text-amber-700">₹{pending.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase">Total</p>
              <p className="text-lg font-black text-gray-900">
                ₹{parseAmount(jobCard.total_amount || jobCard.price).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Amount to Collect</label>
            <input
              type="number"
              min={0}
              max={pending}
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMode('Cash')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 ${
                paymentMode === 'Cash'
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-gray-100 bg-white'
              }`}
            >
              <Wallet className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase">Cash</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('Online')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 ${
                paymentMode === 'Online'
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-100 bg-white'
              }`}
            >
              <CreditCard className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase">Online</span>
            </button>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              placeholder="Optional payment notes"
            />
          </div>

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
          <button onClick={onClose} className="text-[10px] font-black text-gray-400 uppercase">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-[10px] font-black uppercase disabled:opacity-50"
          >
            {isLoading ? 'Saving…' : 'Collect Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollectPaymentModal;

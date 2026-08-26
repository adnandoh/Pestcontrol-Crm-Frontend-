import React, { useEffect, useMemo, useState } from 'react';
import { X, CheckCircle, Wallet, CreditCard } from 'lucide-react';
import type { JobCard } from '../../types';
import {
  getEffectiveServiceAmount,
  getPlannedServiceCount,
  getServiceAllocationAmount,
  getTechnicianEarningsPreview,
  getTechnicianSharePercent,
} from '../../utils/bookingPayment';

export type PaymentCollectionType = 'full' | 'half' | 'custom';

export interface CompleteJobPaymentPayload {
  paymentMode: 'Cash' | 'Online';
  paymentCollectionType: PaymentCollectionType;
  completionPaidAmount?: number;
  completionPendingAmount?: number;
}

interface CompleteJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: CompleteJobPaymentPayload) => void;
  jobCard: JobCard | null;
  isLoading?: boolean;
}

const parseAmount = (value?: string | number | null): number => {
  if (value === null || value === undefined) return 0;
  const raw = String(value).replace(/[₹,\s]/g, '').trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number) =>
  value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const CompleteJobModal: React.FC<CompleteJobModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  jobCard,
  isLoading = false,
}) => {
  // Customer payment amount (full package on visit 1 for Bed Bugs / multi-visit).
  const paymentAmount = useMemo(() => {
    if (!jobCard) return 0;
    return getEffectiveServiceAmount(jobCard);
  }, [jobCard]);

  const plannedServices = useMemo(
    () => (jobCard ? getPlannedServiceCount(jobCard) : 1),
    [jobCard],
  );
  const currentService = Math.max(1, Number(jobCard?.service_cycle || 1));
  const serviceAllocation = useMemo(
    () => (jobCard ? getServiceAllocationAmount(jobCard) : 0),
    [jobCard],
  );
  const techSharePct = useMemo(
    () => (jobCard ? getTechnicianSharePercent(jobCard) : 40),
    [jobCard],
  );
  const techEarnings = useMemo(
    () => (jobCard ? getTechnicianEarningsPreview(jobCard) : 0),
    [jobCard],
  );
  const isMultiVisitPackage = plannedServices > 1;

  const [collectionType, setCollectionType] = useState<PaymentCollectionType>('full');
  const [customInputMode, setCustomInputMode] = useState<'pending' | 'received'>('pending');
  const [customValue, setCustomValue] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCollectionType('full');
    setCustomInputMode('pending');
    setCustomValue('');
    setPaymentMode(null);
    setError('');
  }, [isOpen, jobCard?.id]);

  const { paidAmount, pendingAmount } = useMemo(() => {
    if (collectionType === 'full') {
      return { paidAmount: paymentAmount, pendingAmount: 0 };
    }
    if (collectionType === 'half') {
      const paid = Math.round((paymentAmount / 2) * 100) / 100;
      return { paidAmount: paid, pendingAmount: Math.round((paymentAmount - paid) * 100) / 100 };
    }
    const custom = parseAmount(customValue);
    if (customInputMode === 'pending') {
      return {
        paidAmount: Math.max(0, paymentAmount - custom),
        pendingAmount: custom,
      };
    }
    return {
      paidAmount: custom,
      pendingAmount: Math.max(0, paymentAmount - custom),
    };
  }, [collectionType, customInputMode, customValue, paymentAmount]);

  const validate = (): string => {
    if (paymentAmount <= 0) {
      return 'This visit is included in the package — no payment to collect.';
    }
    if (collectionType === 'custom') {
      const custom = parseAmount(customValue);
      if (!customValue.trim()) {
        return 'Enter a pending or received amount.';
      }
      if (custom < 0) {
        return 'Amount cannot be negative.';
      }
      if (custom > paymentAmount) {
        return customInputMode === 'pending'
          ? 'Pending amount cannot exceed total booking amount.'
          : 'Received amount cannot exceed total booking amount.';
      }
    }
    if (paidAmount < 0 || pendingAmount < 0) {
      return 'Payment amounts cannot be negative.';
    }
    if (paidAmount > paymentAmount || pendingAmount > paymentAmount) {
      return 'Paid or pending amount cannot exceed total booking amount.';
    }
    if (Math.abs(paidAmount + pendingAmount - paymentAmount) > 0.01) {
      return 'Paid and pending amounts must equal the booking amount.';
    }
    if (!paymentMode) {
      return 'Select how payment was received (Cash or Online).';
    }
    return '';
  };

  const handleConfirm = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!paymentMode) return;

    const payload: CompleteJobPaymentPayload = {
      paymentMode,
      paymentCollectionType: collectionType,
    };

    if (collectionType === 'custom') {
      if (customInputMode === 'pending') {
        payload.completionPendingAmount = pendingAmount;
      } else {
        payload.completionPaidAmount = paidAmount;
      }
    }

    onConfirm(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-zoom-in max-h-[90vh] overflow-y-auto">
        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg tracking-tight">COMPLETE SERVICE</h3>
              {jobCard && (
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  Booking #{jobCard.code || jobCard.id} • {jobCard.client_name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isMultiVisitPackage ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-emerald-800">Total Booking Amount</span>
                <span className="font-black text-emerald-950">₹{formatMoney(paymentAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-emerald-800">Total Services</span>
                <span className="font-black text-emerald-950">{plannedServices}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-emerald-800">Current Service</span>
                <span className="font-black text-emerald-950">
                  Service {currentService} of {plannedServices}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] border-t border-emerald-100 pt-2">
                <span className="font-bold text-emerald-800">Service Amount (allocation)</span>
                <span className="font-black text-emerald-950">₹{formatMoney(serviceAllocation)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-emerald-800">
                  Technician Earnings ({techSharePct}%)
                </span>
                <span className="font-black text-emerald-700">₹{formatMoney(techEarnings)}</span>
              </div>
              <p className="text-[10px] font-medium text-emerald-700/80 pt-1">
                Collect the booking payment once. Technician pay uses this service allocation
                (₹{formatMoney(serviceAllocation)}), not the full booking again on later visits.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Amount</span>
              <span className="text-lg font-black text-gray-900">₹{formatMoney(paymentAmount)}</span>
            </div>
          )}

          <div>
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
              {isMultiVisitPackage ? 'Customer Payment (Booking)' : 'Payment Collection Type'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                ['full', 'Full Payment'],
                ['half', 'Half Payment'],
                ['custom', 'Custom Pending'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setCollectionType(value);
                    setError('');
                  }}
                  className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                    collectionType === value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {collectionType === 'custom' && (
            <div className="space-y-3 p-4 rounded-xl border border-gray-100 bg-gray-50/80">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCustomInputMode('pending')}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase ${
                    customInputMode === 'pending'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  Enter Pending
                </button>
                <button
                  type="button"
                  onClick={() => setCustomInputMode('received')}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase ${
                    customInputMode === 'received'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  Enter Received
                </button>
              </div>
              <input
                type="number"
                min={0}
                max={paymentAmount}
                step="0.01"
                value={customValue}
                onChange={(e) => {
                  setCustomValue(e.target.value);
                  setError('');
                }}
                placeholder={customInputMode === 'pending' ? 'Pending amount' : 'Received amount'}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Paid Amount</p>
              <p className="text-xl font-black text-emerald-800 mt-1">₹{formatMoney(paidAmount)}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pending Amount</p>
              <p className="text-xl font-black text-amber-800 mt-1">₹{formatMoney(pendingAmount)}</p>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">
              Payment Mode
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMode('Cash')}
                disabled={isLoading}
                className={`group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  paymentMode === 'Cash'
                    ? 'border-emerald-400 bg-emerald-100 text-emerald-800'
                    : 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <Wallet className="h-6 w-6" />
                <span className="font-black text-[10px] uppercase tracking-widest">Received Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('Online')}
                disabled={isLoading}
                className={`group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  paymentMode === 'Online'
                    ? 'border-blue-400 bg-blue-100 text-blue-800'
                    : 'border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <CreditCard className="h-6 w-6" />
                <span className="font-black text-[10px] uppercase tracking-widest">Received Online</span>
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between gap-3 border-t border-gray-100 sticky bottom-0">
          <button
            onClick={onClose}
            className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50"
          >
            {isLoading ? 'Completing…' : 'Complete Service'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteJobModal;

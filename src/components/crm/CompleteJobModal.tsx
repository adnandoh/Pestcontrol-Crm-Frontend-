import React from 'react';
import { X, CheckCircle, Wallet, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../utils/cn';
import type { JobCard } from '../../types';

interface CompleteJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentMode: 'Cash' | 'Online') => void;
  jobCard: JobCard | null;
  isLoading?: boolean;
}

const CompleteJobModal: React.FC<CompleteJobModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  jobCard,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg tracking-tight">COMPLETE BOOKING</h3>
              {jobCard && (
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                   {jobCard.code || `ID: ${jobCard.id}`} • {jobCard.client_name}
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

        {/* Content */}
        <div className="p-8 text-center">
          <div className="mb-6">
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Select Payment Mode</h4>
            <p className="text-xs text-gray-500 mt-1 font-medium">Please confirm how the payment was received for this service.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onConfirm('Cash')}
              disabled={isLoading}
              className="group flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 transition-all shadow-sm"
            >
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Wallet className="h-6 w-6" />
              </div>
              <span className="font-black text-[10px] uppercase tracking-widest">Received Cash</span>
            </button>

            <button
              onClick={() => onConfirm('Online')}
              disabled={isLoading}
              className="group flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm"
            >
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <CreditCard className="h-6 w-6" />
              </div>
              <span className="font-black text-[10px] uppercase tracking-widest">Received Online</span>
            </button>
          </div>

          {jobCard?.price && (
            <div className="mt-6 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Amount</span>
               <span className="text-lg font-black text-gray-900">₹{jobCard.price}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-center border-t border-gray-100">
           <button 
             onClick={onClose}
             className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
           >
             Cancel and go back
           </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteJobModal;

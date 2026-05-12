import React, { useState } from 'react';
import { X, Save, Calendar } from 'lucide-react';
import { Button, Input } from '../ui';
import { enhancedApiService } from '../../services/api.enhanced';
import type { CRMInquiryFormData, PestType } from '../../types';
import { PEST_TYPES } from '../../constants/pestTypes';

interface CreateCRMInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateCRMInquiryModal: React.FC<CreateCRMInquiryModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialData: CRMInquiryFormData = {
    name: '',
    mobile: '',
    location: '',
    pest_type: 'Other',
    remark: '',
    service_frequency: 'one-time',
    inquiry_date: new Date().toISOString().split('T')[0],
    inquiry_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    status: 'New',
    reminder_date: '',
    reminder_time: '',
    reminder_note: ''
  };

  const [formData, setFormData] = useState<CRMInquiryFormData>(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.mobile.length !== 10) {
      setError('Mobile number must be 10 digits');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await enhancedApiService.createCRMInquiry(formData);
      onSuccess();
      setFormData(initialData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-20">
          <h3 className="text-lg font-bold text-gray-800">Add New Enquiry</h3>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-xs font-semibold uppercase">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1">
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Client Name *"
                  className="h-11 text-sm border-gray-300 focus:ring-0 focus:border-blue-600 rounded"
                />
              </div>

              {/* Mobile */}
              <div className="space-y-1">
                <Input
                  required
                  type="tel"
                  maxLength={10}
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                  placeholder="Mobile Number *"
                  className="h-11 text-sm border-gray-300 focus:ring-0 focus:border-blue-600 rounded"
                />
              </div>

              {/* Location */}
              <div className="space-y-1">
                <Input
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Service Location *"
                  className="h-11 text-sm border-gray-300 focus:ring-0 focus:border-blue-600 rounded"
                />
              </div>

              {/* Pest Type */}
              <div className="space-y-1">
                <select
                  required
                  value={formData.pest_type}
                  onChange={(e) => setFormData({ ...formData, pest_type: e.target.value as PestType })}
                  className="w-full h-11 px-3 text-sm border border-gray-300 rounded outline-none focus:border-blue-600 bg-white text-gray-600"
                >
                  <option value="" disabled>Select Pest Type *</option>
                  {PEST_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Service Frequency */}
              <div className="space-y-1">
                <select
                  required
                  value={formData.service_frequency}
                  onChange={(e) => setFormData({ ...formData, service_frequency: e.target.value })}
                  className="w-full h-11 px-3 text-sm border border-gray-300 rounded outline-none focus:border-blue-600 bg-white text-gray-600"
                >
                  <option value="one-time">One-Time Service</option>
                  <option value="amc">AMC Service</option>
                </select>
              </div>

              {/* Remarks - Full Width */}
              <div className="md:col-span-2 space-y-1">
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="Remarks"
                  className="w-full min-h-[120px] p-3 text-sm border border-gray-300 rounded outline-none focus:border-blue-600 resize-none transition-all placeholder:text-gray-400 shadow-sm"
                />
              </div>
            </div>
            
            {/* Reminder Section */}
            <div className="md:col-span-2 pt-4 border-t border-gray-100">
               <h4 className="text-[11px] font-black text-orange-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                 <Calendar className="h-3.5 w-3.5" /> Follow-up Reminder (Optional)
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-extrabold text-gray-500 uppercase">Reminder Date</label>
                   <Input
                     type="date"
                     value={formData.reminder_date || ''}
                     onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                     className="h-10 text-sm border-gray-300 focus:ring-0 focus:border-blue-600 rounded"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-extrabold text-gray-500 uppercase">Reminder Time</label>
                   <Input
                     type="time"
                     value={formData.reminder_time || ''}
                     onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                     className="h-10 text-sm border-gray-300 focus:ring-0 focus:border-blue-600 rounded"
                   />
                 </div>
                 <div className="md:col-span-2 space-y-1">
                   <label className="text-[10px] font-extrabold text-gray-500 uppercase">Reminder Note</label>
                   <Input
                     value={formData.reminder_note || ''}
                     onChange={(e) => setFormData({ ...formData, reminder_note: e.target.value })}
                     placeholder="Call client on Friday..."
                     className="h-10 text-sm border-gray-300 focus:ring-0 focus:border-blue-600 rounded"
                   />
                 </div>
               </div>
            </div>
            
            <div className="flex items-center gap-2 pt-2">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Auto-detect:</span>
               <span className="text-[10px] font-bold text-gray-500 uppercase">{new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-end gap-3 sticky bottom-0 z-20">
            <Button
              type="button"
              onClick={onClose}
              className="h-10 px-6 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            >
              Close
            </Button>
            <Button
              disabled={submitting}
              className="h-10 px-8 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCRMInquiryModal;

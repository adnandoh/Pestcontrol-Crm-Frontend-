import React, { useState, useEffect } from 'react';
import { X, Save, Bell } from 'lucide-react';
import { Button, Input } from '../ui';
import { enhancedApiService } from '../../services/api.enhanced';
import type { ReminderFormData, Reminder } from '../../types';
import { useDashboardCounts } from '../../hooks/useDashboardCounts';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inquiryData?: {
    id: number;
    type: 'crm' | 'website';
    name: string;
    mobile: string;
  } | null;
  editData?: Reminder | null;
}

const ReminderModal: React.FC<ReminderModalProps> = ({ isOpen, onClose, onSuccess, inquiryData, editData }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshCounts } = useDashboardCounts();

  const [formData, setFormData] = useState<ReminderFormData>({
    inquiry_type: 'crm',
    inquiry_id: 0,
    customer_name: '',
    mobile_number: '',
    reminder_date: new Date().toISOString().split('T')[0],
    reminder_time: '',
    note: '',
    status: 'pending'
  });

  // Time Picker State
  const [selectedHour, setSelectedHour] = useState('10');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  // Convert 12h to 24h for storage
  const updateTimeInFormData = (h: string, m: string, p: string) => {
    let hour24 = parseInt(h);
    if (p === 'PM' && hour24 !== 12) hour24 += 12;
    if (p === 'AM' && hour24 === 12) hour24 = 0;
    
    const time24 = `${hour24.toString().padStart(2, '0')}:${m}`;
    setFormData(prev => ({ ...prev, reminder_time: time24 }));
  };

  useEffect(() => {
    if (editData) {
      setFormData({
        inquiry_type: editData.inquiry_type,
        inquiry_id: editData.inquiry_id,
        customer_name: editData.customer_name,
        mobile_number: editData.mobile_number,
        reminder_date: editData.reminder_date,
        reminder_time: editData.reminder_time || '',
        note: editData.note,
        status: editData.status
      });

      // Parse 24h to 12h for UI
      if (editData.reminder_time) {
        const [h24, m] = editData.reminder_time.split(':');
        let h12 = parseInt(h24);
        const p = h12 >= 12 ? 'PM' : 'AM';
        h12 = h12 % 12 || 12;
        setSelectedHour(h12.toString().padStart(2, '0'));
        setSelectedMinute(m);
        setSelectedPeriod(p);
      }
    } else if (inquiryData) {
      setFormData(prev => ({
        ...prev,
        inquiry_type: inquiryData.type,
        inquiry_id: inquiryData.id,
        customer_name: inquiryData.name,
        mobile_number: inquiryData.mobile,
        reminder_date: new Date().toISOString().split('T')[0],
        reminder_time: '10:00', // Default 10 AM
        note: '',
        status: 'pending'
      }));
      setSelectedHour('10');
      setSelectedMinute('00');
      setSelectedPeriod('AM');
    }
  }, [inquiryData, editData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reminder_date) {
      setError('Reminder date is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      if (editData) {
        await enhancedApiService.updateReminder(editData.id, formData);
      } else {
        await enhancedApiService.createReminder(formData);
      }
      onSuccess();
      refreshCounts();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save reminder');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-800 uppercase tracking-tight">
              {editData ? 'Edit Reminder' : 'Add Reminder'}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-[10px] font-black uppercase">
              {error}
            </div>
          )}

          <div className="bg-blue-50/50 p-3 rounded border border-blue-100 mb-4">
            <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Customer Details</div>
            <div className="font-bold text-gray-800 uppercase text-sm">{formData.customer_name}</div>
            <div className="text-xs font-bold text-gray-500">{formData.mobile_number}</div>
            <div className="text-[9px] font-bold text-gray-400 uppercase mt-1 italic">Source: {formData.inquiry_type === 'crm' ? 'CRM Inquiry' : 'Website Inquiry'}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Reminder Date *</label>
              <Input
                required
                type="date"
                value={formData.reminder_date}
                onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                className="h-10 text-sm border-gray-300 focus:ring-0 focus:border-blue-600 rounded font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Reminder Time</label>
              <div className="flex items-center gap-1">
                <div className="flex-1 grid grid-cols-3 gap-1">
                  <select
                    value={selectedHour}
                    onChange={(e) => {
                      setSelectedHour(e.target.value);
                      updateTimeInFormData(e.target.value, selectedMinute, selectedPeriod);
                    }}
                    className="h-10 text-sm border border-gray-300 rounded font-bold focus:border-blue-600 outline-none px-1 appearance-none text-center bg-white cursor-pointer hover:bg-gray-50"
                  >
                    {hours.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <select
                    value={selectedMinute}
                    onChange={(e) => {
                      setSelectedMinute(e.target.value);
                      updateTimeInFormData(selectedHour, e.target.value, selectedPeriod);
                    }}
                    className="h-10 text-sm border border-gray-300 rounded font-bold focus:border-blue-600 outline-none px-1 appearance-none text-center bg-white cursor-pointer hover:bg-gray-50"
                  >
                    {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => {
                      setSelectedPeriod(e.target.value);
                      updateTimeInFormData(selectedHour, selectedMinute, e.target.value);
                    }}
                    className="h-10 text-sm border border-gray-300 rounded font-bold focus:border-blue-600 outline-none px-1 appearance-none text-center bg-white cursor-pointer hover:bg-gray-50"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Short Note *</label>
            <textarea
              required
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="e.g. Call me tomorrow, Price follow-up..."
              className="w-full min-h-[100px] p-3 text-sm border border-gray-300 rounded outline-none focus:border-blue-600 resize-none transition-all placeholder:text-gray-400 font-semibold"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <Button
              type="button"
              onClick={onClose}
              className="h-10 px-6 text-xs font-black uppercase bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
            >
              Cancel
            </Button>
            <Button
              disabled={submitting}
              className="h-10 px-8 text-xs font-black uppercase bg-blue-700 hover:bg-blue-800 text-white rounded transition-colors flex items-center gap-2 shadow-lg shadow-blue-200"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Reminder
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReminderModal;

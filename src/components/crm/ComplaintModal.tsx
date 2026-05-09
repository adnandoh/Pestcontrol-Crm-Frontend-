import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, MessageSquare, User, ShieldAlert } from 'lucide-react';
import { Modal, Button, Select, Input, Textarea, Loading } from '../ui';
import { enhancedApiService } from '../../services/api.enhanced';
import type { JobCard, Technician } from '../../types';
import dayjs from 'dayjs';

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: JobCard | null;
  onSuccess?: () => void;
}

const ComplaintModal: React.FC<ComplaintModalProps> = ({ isOpen, onClose, booking, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [formData, setFormData] = useState({
    complaint_type: '',
    complaint_note: '',
    priority: 'Medium',
    revisit_date: dayjs().format('YYYY-MM-DD'),
    technician_id: '' as string | number
  });

  const complaintTypes = [
    'Service Not Effective',
    'Cockroach Still Coming',
    'Bed Bugs Still Active',
    'Need Revisit',
    'Technician Behavior',
    'Chemical Smell Issue',
    'Incomplete Service',
    'Warranty Claim',
    'AMC Complaint',
    'Other'
  ];

  const priorities = ['Low', 'Medium', 'High'];

  useEffect(() => {
    if (isOpen) {
      fetchTechnicians();
      if (booking?.technician) {
        setFormData(prev => ({ ...prev, technician_id: booking.technician || '' }));
      }
    }
  }, [isOpen, booking]);

  const fetchTechnicians = async () => {
    try {
      const data = await enhancedApiService.getActiveTechnicians();
      setTechnicians(data);
    } catch (err) {
      console.error('Error fetching technicians:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setLoading(true);
    try {
      await enhancedApiService.createComplaint({
        parent_booking_id: booking.id,
        complaint_type: formData.complaint_type,
        complaint_note: formData.complaint_note,
        priority: formData.priority,
        revisit_date: formData.revisit_date,
        technician_id: formData.technician_id ? Number(formData.technician_id) : null
      });
      alert('Complaint registered successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating complaint:', err);
      alert('Failed to register complaint');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Complaint Call"
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-1">
        {booking && (
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-900">Complaint Against Booking #{booking.code}</p>
              <p className="text-xs text-red-700">{booking.service_type} - {dayjs(booking.schedule_datetime).format('DD MMM YYYY')}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 block flex items-center">
              <ShieldAlert className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> Complaint Type
            </label>
            <select
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
              value={formData.complaint_type}
              onChange={(e) => setFormData({ ...formData, complaint_type: e.target.value })}
            >
              <option value="">Select Type</option>
              {complaintTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 block flex items-center">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> Complaint Note
            </label>
            <Textarea
              placeholder="Describe the issue in detail..."
              value={formData.complaint_note}
              onChange={(e) => setFormData({ ...formData, complaint_note: e.target.value })}
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 block">Priority</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                {priorities.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 block flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> Revisit Date
              </label>
              <Input
                type="date"
                required
                value={formData.revisit_date}
                onChange={(e) => setFormData({ ...formData, revisit_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 block flex items-center">
              <User className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> Assign Technician (Optional)
            </label>
            <select
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
              value={formData.technician_id}
              onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })}
            >
              <option value="">Select Technician</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-700" type="submit" disabled={loading}>
            {loading ? <Loading size="sm" /> : 'Register Complaint'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ComplaintModal;

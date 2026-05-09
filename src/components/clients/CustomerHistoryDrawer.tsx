import React, { useEffect, useState } from 'react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  History, 
  Star, 
  Plus, 
  MessageCircle, 
  Clock, 
  User,
  TrendingUp,
  Award,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { Drawer, Button, Badge, Loading } from '../ui';
import ComplaintModal from '../crm/ComplaintModal';
import { enhancedApiService } from '../../services/api.enhanced';
import type { CustomerHistory, JobCard } from '../../types';
import dayjs from 'dayjs';

interface CustomerHistoryDrawerProps {
  clientId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

const CustomerHistoryDrawer: React.FC<CustomerHistoryDrawerProps> = ({ clientId, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<CustomerHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBookingForComplaint, setSelectedBookingForComplaint] = useState<JobCard | null>(null);
  const [showComplaintModal, setShowComplaintModal] = useState(false);

  useEffect(() => {
    if (isOpen && clientId) {
      fetchHistory(clientId);
    }
  }, [isOpen, clientId]);

  const fetchHistory = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await enhancedApiService.getCustomerHistory(id);
      setHistory(data);
    } catch (err) {
      console.error('Error fetching customer history:', err);
      setError('Failed to load customer history');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComplaint = (booking: JobCard) => {
    setSelectedBookingForComplaint(booking);
    setShowComplaintModal(true);
  };

  if (!isOpen) return null;

  const handleWhatsApp = (mobile: string) => {
    window.open(`https://wa.me/91${mobile}`, '_blank');
  };

  const handleCall = (mobile: string) => {
    window.location.href = `tel:${mobile}`;
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={history?.client.full_name || 'Customer History'}
      width="w-full md:w-[700px]"
    >
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loading size="lg" />
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-red-500">{error}</p>
          <Button onClick={() => clientId && fetchHistory(clientId)} className="mt-4">
            Retry
          </Button>
        </div>
      ) : history ? (
        <div className="p-6 space-y-8">
          {/* Quick Actions Header */}
          <div className="flex flex-wrap gap-3 pb-6 border-b">
            <Button size="sm" onClick={() => handleCall(history.client.mobile)}>
              <Phone className="h-4 w-4 mr-2" /> Call
            </Button>
            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleWhatsApp(history.client.mobile)}>
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" /> New Booking
            </Button>
            <Button size="sm" variant="outline">
              <Clock className="h-4 w-4 mr-2" /> Reminder
            </Button>
          </div>

          {/* Profile Section */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold">Profile Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="font-medium">{history.client.mobile}</span>
                </div>
                {history.client.email && (
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 text-gray-400 mr-3" />
                    <span>{history.client.email}</span>
                  </div>
                )}
                <div className="flex items-start text-sm">
                  <MapPin className="h-4 w-4 text-gray-400 mr-3 mt-0.5" />
                  <span className="text-gray-600">{history.client.address || 'No address provided'}</span>
                </div>
              </div>
              <div className="space-y-3 md:border-l md:pl-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">First Booking:</span>
                  <span className="font-medium">{history.stats.first_booking ? dayjs(history.stats.first_booking).format('DD MMM YYYY') : 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Last Service:</span>
                  <span className="font-medium">{history.stats.last_service ? dayjs(history.stats.last_service).format('DD MMM YYYY') : 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Type:</span>
                  <Badge variant={history.stats.amc_revenue > 0 ? 'success' : 'secondary'}>
                    {history.stats.amc_revenue > 0 ? 'AMC Client' : 'One-time Client'}
                  </Badge>
                </div>
              </div>
            </div>
          </section>

          {/* Revenue Summary */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-bold">Revenue Summary</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Total Revenue</p>
                <p className="text-xl font-black text-blue-900">₹{history.stats.total_revenue.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">AMC Value</p>
                <p className="text-xl font-black text-green-900">₹{history.stats.amc_revenue.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-1">Bookings</p>
                <p className="text-xl font-black text-purple-900">{history.stats.total_bookings}</p>
              </div>
            </div>
          </section>

          {/* Upcoming Services */}
          {history.upcoming.length > 0 && (
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-bold">Upcoming Services</h3>
              </div>
              <div className="space-y-3">
                {history.upcoming.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-xl">
                    <div>
                      <p className="font-bold text-orange-900">{job.service_type}</p>
                      <p className="text-xs text-orange-700">{dayjs(job.schedule_datetime).format('DD MMM YYYY, hh:mm A')}</p>
                    </div>
                    <Badge variant="warning">{job.status}</Badge>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Booking History */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <History className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-bold">Booking History</h3>
            </div>
            <div className="overflow-hidden border rounded-xl bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.bookings.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">#{job.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{job.service_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{dayjs(job.schedule_datetime).format('DD/MM/YY')}</td>
                      <td className="px-4 py-3">
                        <Badge variant={job.status === 'Done' ? 'success' : job.status === 'Cancelled' ? 'destructive' : 'warning'}>
                          {job.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">₹{job.price}</td>
                      <td className="px-4 py-3 text-right">
                        {job.status === 'Done' && !job.is_complaint_call && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleCreateComplaint(job)}
                          >
                            <AlertCircle className="h-3 w-3 mr-1" /> Complaint
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Feedback Section */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <Award className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-bold">Customer Feedback</h3>
            </div>
            <div className="space-y-4">
              {history.feedbacks.length > 0 ? (
                history.feedbacks.map((f) => (
                  <div key={f.id} className="p-4 bg-white border rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < f.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">{dayjs(f.created_at).format('DD MMM YYYY')}</span>
                    </div>
                    <p className="text-sm text-gray-700 italic">"{f.remark || 'No comment provided'}"</p>
                    <div className="mt-2 pt-2 border-t flex justify-between items-center text-[10px]">
                      <span className="text-gray-500">Booking: #{f.booking_code}</span>
                      <span className="font-medium text-blue-600">Tech: {f.technician_name}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border-2 border-dashed rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500">No feedback available</p>
                </div>
              )}
            </div>
          </section>

          {/* Complaint History */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <ShieldAlert className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-bold">Complaint History</h3>
            </div>
            <div className="space-y-3">
              {history.bookings.filter(j => j.is_complaint_call).length > 0 ? (
                history.bookings.filter(j => j.is_complaint_call).map((c) => (
                  <div key={c.id} className="p-4 bg-red-50/50 border border-red-100 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0">
                      <Badge variant={c.priority === 'High' ? 'destructive' : c.priority === 'Medium' ? 'warning' : 'secondary'} size="sm" className="rounded-none rounded-bl-lg">
                        {c.priority} Priority
                      </Badge>
                    </div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{c.complaint_type}</p>
                        <p className="text-[10px] text-gray-500">#{c.code} • Against #{c.complaint_parent_booking}</p>
                      </div>
                      <Badge variant={c.complaint_status === 'Resolved' ? 'success' : 'warning'}>
                        {c.complaint_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{c.complaint_note}</p>
                    <div className="mt-3 pt-2 border-t border-red-100 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">{dayjs(c.created_at).format('DD MMM YYYY')}</span>
                      <span className="text-[10px] font-bold text-blue-600">Tech: {c.technician_name || 'Unassigned'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 border-2 border-dashed rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500">No complaints registered</p>
                </div>
              )}
            </div>
          </section>

          {/* Reminders History */}
          <section>
            <div className="flex items-center space-x-2 mb-4">
              <Clock className="h-5 w-5 text-indigo-500" />
              <h3 className="text-lg font-bold">Reminders</h3>
            </div>
            <div className="space-y-3">
              {history.reminders.length > 0 ? (
                history.reminders.map((r, i) => (
                  <div key={i} className="p-3 bg-white border rounded-xl flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-[10px] py-0">{r.type}</Badge>
                        <span className="text-sm font-medium">{dayjs(r.date).format('DD MMM YYYY')}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{r.note || 'No notes'}</p>
                    </div>
                    <Badge variant={r.status === 'Done' ? 'success' : 'secondary'}>{r.status}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No reminders found</p>
              )}
            </div>
          </section>

          {/* Technicians History */}
          <section className="pb-8">
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-bold">Technician History</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.technicians.map((name, i) => (
                <div key={i} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-100 flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {name}
                </div>
              ))}
              {history.technicians.length === 0 && <p className="text-sm text-gray-500">No technicians assigned yet</p>}
            </div>
          </section>
        </div>
      ) : null}

      <ComplaintModal
        isOpen={showComplaintModal}
        onClose={() => setShowComplaintModal(false)}
        booking={selectedBookingForComplaint}
        onSuccess={() => clientId && fetchHistory(clientId)}
      />
    </Drawer>
  );
};

export { CustomerHistoryDrawer };

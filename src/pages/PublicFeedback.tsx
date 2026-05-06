import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, CheckCircle, Smartphone, User, Calendar, ShieldCheck, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import dayjs from 'dayjs';

const PublicFeedback: React.FC = () => {
  const { id, token } = useParams<{ id: string; token: string }>();
  const [bookingInfo, setBookingInfo] = useState<{
    booking_id: string;
    service_name: string;
    service_date: string;
    technician_name: string;
    is_submitted: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    rating: 5,
    remark: '',
    technician_behavior: 'excellent' as 'excellent' | 'good' | 'average' | 'poor'
  });

  useEffect(() => {
    const fetchInfo = async () => {
      if (!id || !token) return;
      try {
        setLoading(true);
        const info = await enhancedApiService.getFeedbackBookingInfo(id, token);
        setBookingInfo(info);
        if (info.is_submitted) setSubmitted(true);
      } catch (err: any) {
        console.error('Failed to load booking info:', err);
        setError('Invalid or expired feedback link. Please contact support if you think this is an error.');
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [id, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !token) return;
    
    try {
      setSubmitting(true);
      await enhancedApiService.submitFeedback({
        booking_id: id,
        token: token,
        ...formData
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error('Failed to submit feedback:', err);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4" />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Service Details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-black text-gray-800 uppercase mb-4">Access Denied</h1>
          <p className="text-gray-600 font-medium leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-blue-100 max-w-md w-full animate-fade-up">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-8 ring-emerald-50/50">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 uppercase mb-2">Thank You! ❤️</h1>
          <p className="text-gray-600 font-bold mb-8">Your feedback helps us improve our service every day.</p>
          <div className="pt-6 border-t border-gray-100">
             <div className="flex items-center justify-center gap-2 mb-4">
                <div className="h-1 w-1 bg-blue-400 rounded-full" />
                <div className="h-1 w-1 bg-blue-400 rounded-full" />
                <div className="h-1 w-1 bg-blue-400 rounded-full" />
             </div>
             <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">PestControl99 Premium Service</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-8 border-b border-gray-100">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">PestControl99</h1>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Quality Feedback System</p>
          </div>
          <ShieldCheck className="h-6 w-6 text-blue-600" />
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 pb-20">
        {/* Booking Card */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-8 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase">Service Info</span>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">#{bookingInfo?.booking_id}</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
               <div className="p-2 bg-gray-50 rounded-lg">
                  <Smartphone className="h-4 w-4 text-gray-400" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Service Provided</p>
                  <p className="text-sm font-bold text-gray-800">{bookingInfo?.service_name}</p>
               </div>
            </div>

            <div className="flex items-start gap-3">
               <div className="p-2 bg-gray-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-400" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Service Date</p>
                  <p className="text-sm font-bold text-gray-800">{dayjs(bookingInfo?.service_date).format('DD MMMM, YYYY')}</p>
               </div>
            </div>

            <div className="flex items-start gap-3">
               <div className="p-2 bg-gray-50 rounded-lg">
                  <User className="h-4 w-4 text-gray-400" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">Technician Name</p>
                  <p className="text-sm font-bold text-gray-800 uppercase">{bookingInfo?.technician_name}</p>
               </div>
            </div>
          </div>
        </div>

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-up delay-100">
          <div>
            <label className="text-[11px] font-black text-gray-500 uppercase mb-4 block text-center tracking-[0.1em]">Rate Your Experience</label>
            <div className="flex justify-between items-center px-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className={`flex flex-col items-center gap-2 transition-all ${
                    formData.rating >= star ? 'scale-110' : 'scale-100 opacity-40'
                  }`}
                >
                  <div className={`p-4 rounded-2xl shadow-sm transition-colors ${
                    formData.rating >= star ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-white border-2 border-transparent'
                  }`}>
                    <Star className={`h-8 w-8 ${formData.rating >= star ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                  </div>
                  <span className={`text-[10px] font-black uppercase ${formData.rating >= star ? 'text-yellow-700' : 'text-gray-400'}`}>
                    {star === 1 ? 'Poor' : star === 5 ? 'Excellent' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div>
              <label className="text-[11px] font-black text-gray-500 uppercase mb-2 block tracking-tight flex items-center gap-2">
                <User className="h-3 w-3" /> Technician Behavior
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['excellent', 'good', 'average', 'poor'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, technician_behavior: opt as any })}
                    className={`px-4 py-3 text-[11px] font-black uppercase rounded-2xl border-2 transition-all ${
                      formData.technician_behavior === opt 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 scale-[1.02]' 
                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black text-gray-500 uppercase mb-2 block tracking-tight flex items-center gap-2">
                <MessageSquare className="h-3 w-3" /> Any Remarks?
              </label>
              <textarea
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="Share your experience (Optional)"
                className="w-full p-5 text-sm font-bold text-gray-800 bg-white border-2 border-gray-100 rounded-[1.5rem] outline-none focus:border-blue-500/30 transition-all min-h-[120px]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 text-white font-black uppercase py-5 rounded-[1.5rem] shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>SUBMIT FEEDBACK <CheckCircle className="h-5 w-5" /></>
            )}
          </button>
        </form>
      </main>

      <footer className="max-w-md mx-auto px-6 py-12 text-center border-t border-gray-100 opacity-30">
         <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">© 2026 PestControl99 India</p>
      </footer>
    </div>
  );
};

export default PublicFeedback;

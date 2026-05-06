import React, { useState } from 'react';
import { Star, MessageSquare, UserCheck, Link as LinkIcon, Send, Copy, Check } from 'lucide-react';
import { Button, Modal } from '../ui';
import { enhancedApiService } from '../../services/api.enhanced';
import type { JobCard } from '../../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobCard: JobCard | null;
  onSuccess?: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, jobCard, onSuccess }) => {
  const [activeFlow, setActiveFlow] = useState<'manual' | 'link' | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<{ link: string; token: string } | null>(null);
  
  // Manual feedback form state
  const [manualData, setManualData] = useState({
    rating: 5,
    remark: '',
    technician_behavior: 'excellent' as 'excellent' | 'good' | 'average' | 'poor'
  });

  if (!jobCard) return null;

  const handleGenerateLink = async () => {
    try {
      setLoading(true);
      const result = await enhancedApiService.generateFeedbackLink(jobCard.id);
      setGeneratedLink({ link: result.link, token: result.token });
    } catch (error) {
      console.error('Failed to generate feedback link:', error);
      alert('Failed to generate feedback link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    if (generatedLink) {
      const message = `Hello ${jobCard.client_name} 👋\n\nThank you for choosing PestControl99.\n\nPlease rate your recent service experience:\n\n${generatedLink.link}\n\nYour feedback helps us improve our service 🙏`;
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${jobCard.client_mobile}?text=${encodedMessage}`, '_blank');
    }
  };

  const handleSaveManual = async () => {
    try {
      setLoading(true);
      await enhancedApiService.createManualFeedback({
        booking: jobCard.id,
        ...manualData
      });
      alert('Feedback saved successfully!');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to save manual feedback:', error);
      alert('Failed to save manual feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={onClose} title="Service Feedback" size="md">
      {!activeFlow ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <button
            onClick={() => setActiveFlow('manual')}
            className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl transition-all group"
          >
            <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-sm font-bold text-blue-900">Manual Feedback</span>
            <span className="text-[10px] text-blue-600 mt-1 uppercase font-black">Staff Entry</span>
          </button>

          <button
            onClick={() => {
              setActiveFlow('link');
              handleGenerateLink();
            }}
            className="flex flex-col items-center justify-center p-6 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-xl transition-all group"
          >
            <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
              <LinkIcon className="h-6 w-6 text-purple-600" />
            </div>
            <span className="text-sm font-bold text-purple-900">Generate Link</span>
            <span className="text-[10px] text-purple-600 mt-1 uppercase font-black">WhatsApp Share</span>
          </button>
        </div>
      ) : activeFlow === 'manual' ? (
        <div className="space-y-6 py-2">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <button onClick={() => setActiveFlow(null)} className="text-xs font-bold text-gray-500 hover:text-gray-800">← Back</button>
            <h3 className="text-sm font-black uppercase text-gray-800">Manual Feedback Entry</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Rating (1-5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setManualData({ ...manualData, rating: star })}
                    className={`p-2 rounded-lg transition-all ${
                      manualData.rating >= star ? 'text-yellow-500 bg-yellow-50 shadow-sm' : 'text-gray-300 bg-gray-50'
                    }`}
                  >
                    <Star className={`h-6 w-6 ${manualData.rating >= star ? 'fill-yellow-500' : ''}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Technician Behavior</label>
              <select
                value={manualData.technician_behavior}
                onChange={(e) => setManualData({ ...manualData, technician_behavior: e.target.value as any })}
                className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="average">Average</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block">Remark / Customer Notes</label>
              <textarea
                value={manualData.remark}
                onChange={(e) => setManualData({ ...manualData, remark: e.target.value })}
                placeholder="Ask customer for their review..."
                className="w-full p-3 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" fullWidth onClick={() => setActiveFlow(null)}>Cancel</Button>
            <Button 
              fullWidth 
              onClick={handleSaveManual} 
              loading={loading}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
            >
              Save Feedback
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 py-2">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <button onClick={() => setActiveFlow(null)} className="text-xs font-bold text-gray-500 hover:text-gray-800">← Back</button>
            <h3 className="text-sm font-black uppercase text-gray-800">WhatsApp Feedback Link</h3>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-3" />
              <span className="text-xs font-bold text-gray-400 uppercase">Generating Link...</span>
            </div>
          ) : generatedLink ? (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shareable URL</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white border border-gray-200 px-3 py-2 rounded-lg text-xs font-mono text-gray-600 truncate">
                    {generatedLink.link}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`p-2 rounded-lg border transition-all ${
                      copied ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Send className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-green-900 uppercase">Message Template</h4>
                    <p className="text-[11px] text-green-700 font-medium mt-1 leading-relaxed">
                      "Hello {jobCard.client_name} 👋... Your feedback helps us improve our service 🙏"
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                fullWidth 
                onClick={handleShareWhatsApp}
                className="bg-[#25D366] hover:bg-[#128C7E] shadow-[#25D366]/20 h-12"
              >
                <Send className="h-4 w-4 mr-2" /> Share on WhatsApp
              </Button>
            </div>
          ) : (
             <div className="py-12 text-center text-red-500 font-bold uppercase">
               Failed to generate link
             </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default FeedbackModal;

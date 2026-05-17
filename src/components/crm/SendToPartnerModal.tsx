import React, { useEffect, useState } from 'react';
import { X, Smartphone, Loader2, AlertCircle } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import type { JobCard, Technician } from '../../types';
import { Button } from '../ui';

interface SendToPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  jobCard: JobCard | null;
}

const SendToPartnerModal: React.FC<SendToPartnerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  jobCard,
}) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    enhancedApiService
      .getTechnicians({ is_active: true, page_size: 200 })
      .then((res) => {
        const withApp = res.results.filter((t) => t.has_partner_app);
        setTechnicians(withApp);
        if (withApp.length === 0) {
          setError(
            'No technicians have a Partner App account. Link a partner account to a technician first.',
          );
        }
      })
      .catch(() => setError('Failed to load technicians'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleSend = async (techId: number) => {
    if (!jobCard) return;
    try {
      setSending(techId);
      setError(null);
      await enhancedApiService.sendJobToPartnerApp(jobCard.id, techId);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Could not send booking to app');
    } finally {
      setSending(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-[#1e5a9e] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-white" />
            <div>
              <h3 className="text-white font-bold text-lg">Send to Partner App</h3>
              {jobCard && (
                <p className="text-blue-100 text-xs">
                  Booking #{jobCard.id} · {jobCard.client_name}
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-gray-600 mb-4">
            The booking stays in <strong>Pending</strong> until the technician accepts it in the
            app. Then it moves to <strong>On Process</strong> automatically.
          </p>

          {error && (
            <div className="mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[#1e5a9e]" />
            </div>
          ) : (
            <ul className="space-y-2">
              {technicians.map((tech) => (
                <li
                  key={tech.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-3 hover:border-[#1e5a9e]/30 hover:bg-blue-50/30"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{tech.name}</p>
                    <p className="text-xs text-gray-500">{tech.mobile}</p>
                    {tech.partner_name && (
                      <p className="text-[10px] text-[#2d8a2f] font-medium mt-0.5">
                        App: {tech.partner_name}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#2d8a2f] hover:bg-[#246b27] text-white shrink-0"
                    disabled={sending !== null}
                    onClick={() => handleSend(tech.id)}
                  >
                    {sending === tech.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Send'
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SendToPartnerModal;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, User, Briefcase, ChevronRight, Loader2, AlertCircle, MapPin, Clock, Phone, Search, Wrench } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import type { JobCard, Technician } from '../../types';
import {
  fireAndForget,
  sendTechAssignedPairApi,
} from '../../services/whatsappPc99Send';
import { Button } from '../ui';
import { cn } from '../../utils/cn';
import CopyablePhone from './CopyablePhone';
import { notify } from '../../utils/notify';
import { parseAssignTechnicianError, type AssignTechnicianError } from '../../utils/assignTechnicianErrors';
import { isTechnicianAssignable } from '../../utils/technicianStatus';

/** Normalize booking / tech service labels for overlap checks. */
function serviceMatchKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/／/g, '/')
    .trim();
}

function bookingServiceLabels(job: JobCard | null): string[] {
  if (!job) return [];
  const fromItems = (job.service_items || [])
    .map((item) => String((item as { service?: string })?.service || '').trim())
    .filter(Boolean);
  if (fromItems.length) return [...new Set(fromItems)];
  const source = String((job as JobCard & { source_service?: string }).source_service || '').trim();
  if (source) return [source];
  return String(job.service_type || '')
    .split(/[,|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function techBaseServices(tech: Technician): string[] {
  if (tech.base_services?.length) return tech.base_services;
  if (tech.skills?.length) return tech.skills;
  return [];
}

function techCoversBooking(tech: Technician, bookingServices: string[]): boolean {
  const services = techBaseServices(tech);
  if (!services.length || !bookingServices.length) return false;
  const allowed = new Set(services.map(serviceMatchKey));
  return bookingServices.some((s) => {
    const key = serviceMatchKey(s);
    return [...allowed].some((a) => a === key || a.includes(key) || key.includes(a));
  });
}

interface AssignTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  jobCard: JobCard | null;
}

const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({ isOpen, onClose, onSuccess, jobCard }) => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [assignError, setAssignError] = useState<AssignTechnicianError | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTechnicians();
    }
  }, [isOpen, jobCard?.id, jobCard?.master_city]);

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      setAssignError(null);
      let booking = jobCard;
      if (jobCard?.id) {
        try {
          booking = await enhancedApiService.getJobCard(jobCard.id, { fresh: true });
        } catch {
          booking = jobCard;
        }
      }
      const activeTechnicians = await enhancedApiService.getActiveTechnicians({
        fresh: true,
        jobId: booking?.id,
      });
      // Hard client filter — the server already excludes them, but a cached
      // response from before a status change must not leak an unassignable
      // technician into the popup.
      setTechnicians(
        (Array.isArray(activeTechnicians) ? activeTechnicians : []).filter(
          (tech) =>
            tech.is_active !== false && isTechnicianAssignable(tech.presence_status),
        ),
      );
    } catch (err) {
      setAssignError({
        message: 'Failed to load technicians. Please try again.',
        code: 'unknown',
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (techId: number) => {
    if (!jobCard) return;
    const tech = technicians.find((row) => row.id === techId) || null;
    if (!tech) return;

    try {
      setAssigning(techId);
      setAssignError(null);
      const updated = await enhancedApiService.assignTechnician(jobCard.id, techId);
      const overrideMsg = (updated as JobCard & { message?: string; partner_override?: boolean })
        ?.message;
      fireAndForget(
        sendTechAssignedPairApi(updated || {
          ...jobCard,
          technician_name: tech?.name || jobCard.technician_name,
          technician_mobile: tech?.mobile || tech?.phone || jobCard.technician_mobile,
        }, tech),
      );
      notify.success(
        overrideMsg || `${tech?.name || 'Technician'} assigned to booking #${jobCard.id}.`,
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setAssignError(parseAssignTechnicianError(err, 'Failed to assign technician'));
      console.error(err);
    } finally {
      setAssigning(null);
    }
  };

  const bookingServices = bookingServiceLabels(jobCard);

  const filteredTechnicians = technicians.filter((tech) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const mobile = (tech.mobile || tech.phone || '').replace(/\D/g, '');
    const services = techBaseServices(tech).join(' ').toLowerCase();
    return (
      tech.name.toLowerCase().includes(q) ||
      mobile.includes(q.replace(/\D/g, '')) ||
      services.includes(q)
    );
  });

  // Qualified (matching base services) first, then others — still all assignable.
  const orderedTechnicians = [...filteredTechnicians].sort((a, b) => {
    const aMatch = techCoversBooking(a, bookingServices) ? 0 : 1;
    const bMatch = techCoversBooking(b, bookingServices) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.name.localeCompare(b.name);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <User className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg tracking-tight">Assign Technician</h3>
              {jobCard && (
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  Booking {jobCard.id} • {jobCard.client_name}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar bg-gray-50/30">
          {assignError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-shake">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-bold leading-snug">{assignError.message}</p>
                  {(assignError.code === 'technician_inactive'
                    || assignError.code === 'technician_unavailable') && (
                    <p className="text-[10px] font-semibold text-red-600/90">
                      Set the technician to Active on their profile, then try again.
                    </p>
                  )}
                  {assignError.editTechnicianPath && (
                    <Link
                      to={assignError.editTechnicianPath}
                      className="inline-flex text-[10px] font-black uppercase tracking-wide text-red-800 underline underline-offset-2 hover:text-red-950"
                      onClick={onClose}
                    >
                      {assignError.code === 'technician_unavailable'
                        ? 'Edit technician status →'
                        : 'Edit technician service areas →'}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded-xl text-[11px] text-sky-900 leading-snug">
            Only Active technicians are listed — anyone On Leave or Suspended is hidden until
            their status changes. Base Services and Service Areas are shown for reference;
            matching Base Services appear first.
          </div>

          {bookingServices.length > 0 && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 leading-snug">
              <span className="font-black uppercase tracking-wide text-[10px] text-indigo-700">
                Booking services
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {bookingServices.map((svc) => (
                  <span
                    key={svc}
                    className="rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-bold text-indigo-800"
                  >
                    {svc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {jobCard?.parent_job ? (
            <div className="mb-4 p-3 bg-violet-50 border border-violet-100 rounded-xl text-[11px] text-violet-900 leading-snug">
              This is one service line ({jobCard.service_type}). Assigning here sets the technician for this service only — other services in the package stay unchanged.
            </div>
          ) : (jobCard?.service_type || '').includes(',') ? (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-900 leading-snug">
              Multi-service package. This name fills only unassigned service lines. Open Cockroach / Termite / etc. separately to assign a different technician per service.
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Select Staff Member ({technicians.length} active)
              </p>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or mobile..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-white font-semibold"
              />
            </div>
            
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                <span className="text-[10px] font-black text-gray-400 uppercase">Loading Staff...</span>
              </div>
            ) : technicians.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                <p className="text-xs font-bold text-gray-700">No active technicians found.</p>
                <p className="text-[10px] text-gray-500 mt-2 font-semibold px-6 leading-relaxed">
                  Open Technicians and mark staff as Active, or add a new technician.
                </p>
              </div>
            ) : filteredTechnicians.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                <p className="text-xs font-bold text-gray-400 italic">No match for &quot;{searchQuery}&quot;</p>
                <p className="text-[10px] text-amber-700 mt-2 font-semibold">
                  If they exist but are Inactive, open Technicians and mark them Active.
                </p>
              </div>
            ) : (
              orderedTechnicians.map((tech) => {
                // Informational only — CRM desk assign has no active-job capacity limit.
                const workload = tech.active_jobs || 0;
                const services = techBaseServices(tech);
                const covers = techCoversBooking(tech, bookingServices);

                return (
                  <button
                    key={tech.id}
                    type="button"
                    onClick={() => handleAssign(tech.id)}
                    disabled={assigning !== null}
                    title="Click to assign — no job limit"
                    className={cn(
                      "w-full group relative bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all text-left flex items-center justify-between",
                      covers && "border-emerald-300 ring-1 ring-emerald-100",
                      assigning === tech.id && "ring-2 ring-blue-500 bg-blue-50/30",
                      assigning !== null && assigning !== tech.id && "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2.5 rounded-full transition-colors bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                      
                      <div className="min-w-0">
                        <h4 className="font-black text-gray-900 text-sm group-hover:text-blue-600 transition-colors uppercase leading-none mb-1">
                          {tech.name}
                          {covers && (
                            <span className="ml-2 inline-flex align-middle rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-emerald-800">
                              Matches booking
                            </span>
                          )}
                        </h4>
                        {tech.latest_remark && (
                          <p
                            className="mb-1 text-[10px] leading-snug text-red-600 line-clamp-2"
                            title={tech.latest_remark.remark}
                          >
                            {tech.latest_remark.remark}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                         <div className="flex flex-col gap-1.5">
                            <span className={cn(
                              "text-[10px] font-bold flex items-center gap-1",
                              workload > 0 ? "text-blue-600" : "text-gray-400"
                            )}>
                              <Briefcase className="h-3 w-3" /> 
                              {workload} Active Jobs
                            </span>

                            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />
                              <CopyablePhone
                                phone={tech.mobile || tech.phone}
                                className="text-[10px] font-bold text-gray-500"
                              />
                            </span>

                            <span className="text-[10px] font-bold text-violet-700 flex items-start gap-1">
                              <Wrench className="h-3 w-3 shrink-0 mt-0.5" />
                              <span className="leading-snug">
                                {services.length > 0
                                  ? services.join(' · ')
                                  : 'All services (not configured)'}
                              </span>
                            </span>

                            {(tech.service_cities && tech.service_cities.length > 0
                              ? tech.service_cities.map((c) => c.name).join(', ')
                              : tech.service_area || tech.city) && (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-tighter">
                                <MapPin className="h-3 w-3" />
                                {tech.service_cities && tech.service_cities.length > 0
                                  ? tech.service_cities.map((c) => c.name).join(', ')
                                  : `${tech.service_area || ''}${tech.service_area && tech.city ? ' - ' : ''}${tech.city || ''}`}
                              </span>
                            )}

                            {tech.last_active && (
                              <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1 italic">
                                <Clock className="h-3 w-3" />
                                Active {new Date(tech.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                         </div>
                        </div>

                        {/* Detailed Active Jobs */}
                        {tech.active_job_details && tech.active_job_details.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {tech.active_job_details.map((job: any) => (
                              <span 
                                key={job.id} 
                                className="px-1.5 py-0.5 bg-blue-50/50 text-[9px] font-bold text-blue-700 rounded border border-blue-100 flex items-center gap-1"
                              >
                                <span className="opacity-50">{job.id}</span>
                                <span className="max-w-[80px] truncate">{job.client__full_name || job.client_name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                       <div className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border shadow-xs bg-blue-50 text-blue-700 border-blue-200">
                         Assign
                       </div>
                       
                       {assigning === tech.id ? (
                         <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                       ) : (
                         <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                       )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between gap-3 border-t border-gray-200">
           <span className="text-[9px] font-bold text-gray-400 italic">
             Assign any active technician — no job limit. Selecting one auto-starts the job.
           </span>
           <Button 
             variant="outline" 
             size="sm" 
             onClick={onClose}
             className="h-8 font-bold text-xs uppercase"
           >
             Cancel
           </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignTechnicianModal;

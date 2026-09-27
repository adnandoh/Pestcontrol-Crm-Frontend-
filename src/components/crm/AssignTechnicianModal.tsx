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
import { technicianMatchesStaffSearch } from '../../utils/technicianStaffSearch';
import { technicianTypeTone } from '../../utils/technicianType';
import {
  bookingCityLabel,
  bookingLocationLabel,
  formatLineupClock,
  formatLineupWhen,
  lineupRoleLabel,
  splitAssignedTechnicians,
  technicianAreaChips,
} from '../../utils/assignTechnicianLineup';

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
  const [liveJob, setLiveJob] = useState<JobCard | null>(jobCard);

  useEffect(() => {
    if (isOpen) {
      setLiveJob(jobCard);
      setSearchQuery('');
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
      if (booking) setLiveJob(booking);
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
    if (tech.service_eligible === false) {
      setAssignError({
        message: tech.service_ineligibility_reason
          || `${tech.name} is not eligible for this booking.`,
        code: 'technician_service_ineligible',
        technicianId: tech.id,
        technicianName: tech.name,
        editTechnicianPath: `/technicians/edit/${tech.id}`,
      });
      return;
    }

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

  const booking = liveJob || jobCard;
  const bookingServices = bookingServiceLabels(booking);
  const bookingCity = bookingCityLabel(booking);
  const bookingLocation = bookingLocationLabel(booking);
  const bookingWhen = formatLineupWhen(booking?.schedule_datetime, booking?.time_slot);

  const filteredTechnicians = technicians.filter((tech) =>
    technicianMatchesStaffSearch(tech, searchQuery),
  );

  // Qualified (matching base services) first, then others — still all assignable.
  const orderedTechnicians = [...filteredTechnicians].sort((a, b) => {
    const aMatch = techCoversBooking(a, bookingServices) ? 0 : 1;
    const bMatch = techCoversBooking(b, bookingServices) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.name.localeCompare(b.name);
  });

  const { assigned: assignedTechnicians, unassigned: unassignedAll } =
    splitAssignedTechnicians(orderedTechnicians, booking);
  const unassignedTechnicians = unassignedAll.filter((tech) => tech.service_eligible !== false);
  const ineligibleTechnicians = unassignedAll.filter((tech) => tech.service_eligible === false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <User className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg tracking-tight">Assign Technician</h3>
              {booking && (
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  Booking {booking.id} • {booking.client_name}
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
                  {assignError.code === 'technician_service_ineligible' && (
                    <p className="text-[10px] font-semibold text-red-600/90">
                      Turn on One-Time Jobs, AMC Jobs, Standard Service, or Premium Service
                      for this booking, then try again.
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
                        : assignError.code === 'technician_service_ineligible'
                          ? 'Edit service eligibility →'
                          : 'Edit technician service areas →'}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 p-3 bg-sky-50 border border-sky-100 rounded-xl text-[11px] text-sky-900 leading-snug">
            Only Active technicians are listed — anyone On Leave or Suspended is hidden until
            their status changes. Technicians who do not match this booking&apos;s One-Time/AMC
            or Standard/Premium settings stay visible with the reason, and cannot be assigned.
            Areas, Priority or Secondary, and same-day bookings are shown for lineup. Matching
            base services appear first in each section.
          </div>

          <div className="mb-4 p-3 bg-white border border-gray-200 rounded-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              This booking
            </p>
            <p className="mt-1 text-sm font-black text-gray-900">{bookingWhen}</p>
            {(bookingCity || bookingLocation) && (
              <p className="mt-1 text-[11px] font-bold text-emerald-700 flex items-start gap-1">
                <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                <span>
                  {[bookingCity, bookingLocation].filter(Boolean).join(' · ')}
                </span>
              </p>
            )}
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

          {booking?.parent_job ? (
            <div className="mb-4 p-3 bg-violet-50 border border-violet-100 rounded-xl text-[11px] text-violet-900 leading-snug">
              This is one service line ({booking.service_type}). Assigning here sets the technician for this service only — other services in the package stay unchanged.
            </div>
          ) : (booking?.service_type || '').includes(',') ? (
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
              [
                {
                  key: 'assigned',
                  title: 'Assigned technicians',
                  rows: assignedTechnicians,
                  empty: 'No active technician is on this booking yet.',
                  blocked: false,
                },
                {
                  key: 'unassigned',
                  title: 'Unassigned technicians',
                  rows: unassignedTechnicians,
                  empty: 'No other active technicians match.',
                  blocked: false,
                },
                {
                  key: 'ineligible',
                  title: 'Not eligible for this booking',
                  rows: ineligibleTechnicians,
                  empty: '',
                  blocked: true,
                },
              ].filter((section) => section.key !== 'ineligible' || section.rows.length > 0).map((section) => (
                <div key={section.key} className="space-y-2">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest pt-1">
                    {section.title} ({section.rows.length})
                  </p>
                  {section.rows.length === 0 ? (
                    <p className="text-[11px] font-semibold text-gray-400 px-1">{section.empty}</p>
                  ) : (
                    section.rows.map((tech) => {
                      const workload = tech.active_jobs || 0;
                      const services = techBaseServices(tech);
                      const covers = techCoversBooking(tech, bookingServices);
                      const areas = technicianAreaChips(tech, booking);
                      const role = lineupRoleLabel(tech.technician_type);
                      const sameDay = tech.lineup_bookings;
                      const onThisBooking = (tech.assigned_service_lines || [])
                        .map((line) => line.service_type)
                        .filter(Boolean);
                      const blocked = section.blocked;

                      return (
                        <button
                          key={tech.id}
                          type="button"
                          onClick={() => {
                            if (!blocked) handleAssign(tech.id);
                          }}
                          disabled={assigning !== null || blocked}
                          title={blocked ? 'Not eligible for this booking' : 'Click to assign — no job limit'}
                          className={cn(
                            "w-full group relative bg-white p-4 rounded-xl border border-gray-200 shadow-sm transition-all text-left flex items-start justify-between gap-3",
                            !blocked && "hover:shadow-md hover:border-blue-500",
                            covers && !blocked && "border-emerald-300 ring-1 ring-emerald-100",
                            blocked && "cursor-not-allowed border-amber-200 bg-amber-50/40 opacity-90",
                            assigning === tech.id && "ring-2 ring-blue-500 bg-blue-50/30",
                            assigning !== null && assigning !== tech.id && "opacity-60"
                          )}
                        >
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="p-2.5 rounded-full transition-colors bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white shrink-0">
                              <User className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <h4 className="font-black text-gray-900 text-sm group-hover:text-blue-600 transition-colors uppercase leading-snug mb-1 flex flex-wrap items-center gap-1.5">
                                <span>{tech.name}</span>
                                <span className={cn(
                                  'inline-flex rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide ring-1 ring-inset',
                                  technicianTypeTone(tech.technician_type),
                                )}>
                                  {role}
                                </span>
                                {covers && !blocked && (
                                  <span className="inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-emerald-800">
                                    Matches booking
                                  </span>
                                )}
                                {blocked && (
                                  <span className="inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-amber-800">
                                    Not assignable
                                  </span>
                                )}
                              </h4>
                              {blocked && (
                                <p className="mb-1 text-[10px] font-semibold leading-snug text-amber-800">
                                  {tech.service_ineligibility_reason
                                    || 'Does not match this booking’s One-Time/AMC or Standard/Premium settings.'}
                                </p>
                              )}
                              {onThisBooking.length > 0 && (
                                <p className="mb-1 text-[10px] font-bold leading-snug text-indigo-700">
                                  On this booking: {onThisBooking.join(' · ')}
                                </p>
                              )}
                              {tech.latest_remark && (
                                <p
                                  className="mb-1 text-[10px] leading-snug text-red-600 line-clamp-2"
                                  title={tech.latest_remark.remark}
                                >
                                  {tech.latest_remark.remark}
                                </p>
                              )}
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

                                <div className="text-[10px] font-bold text-gray-700">
                                  <span className="flex items-center gap-1 text-emerald-700 mb-1">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    City / area
                                  </span>
                                  {areas.length === 0 ? (
                                    <span className="text-gray-400">No service area selected</span>
                                  ) : (
                                    <span className="flex flex-wrap gap-1">
                                      {areas.map((chip) => (
                                        <span
                                          key={chip.label}
                                          title={chip.matchesBooking ? 'Covers this booking' : undefined}
                                          className={cn(
                                            'inline-flex max-w-full rounded-md border px-1.5 py-0.5 text-[10px] font-bold leading-snug whitespace-normal break-words',
                                            chip.matchesBooking
                                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                              : 'border-gray-200 bg-gray-50 text-gray-700',
                                          )}
                                        >
                                          {chip.label}
                                          {chip.matchesBooking && bookingLocation ? ` · ${bookingLocation}` : ''}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                </div>

                                <div className="text-[10px] font-bold text-gray-700">
                                  <span className="block text-[9px] font-black uppercase tracking-wide text-gray-400 mb-0.5">
                                    Same-day bookings
                                  </span>
                                  {Array.isArray(sameDay) ? (
                                    sameDay.length === 0 ? (
                                      <span className="text-gray-400 font-semibold">None scheduled this day</span>
                                    ) : (
                                      <ul className="space-y-1">
                                        {sameDay.map((row) => {
                                          const place = [row.city, row.location].filter(Boolean).join(' · ');
                                          return (
                                            <li key={row.id} className="leading-snug text-gray-700 font-semibold">
                                              <span className="text-gray-900">{formatLineupClock(row.schedule_datetime, row.time_slot)}</span>
                                              {row.service_type ? ` · ${row.service_type}` : ''}
                                              {row.client_name ? ` · ${row.client_name}` : ''}
                                              {place ? ` · ${place}` : ''}
                                              {row.this_booking ? ' · this booking' : ''}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    )
                                  ) : (
                                    tech.active_job_details && tech.active_job_details.length > 0 && (
                                      <ul className="space-y-1">
                                        {tech.active_job_details.map((job) => (
                                          <li key={job.id} className="leading-snug text-gray-700 font-semibold">
                                            #{job.id} · {job.service_type}
                                            {(job.client__full_name || job.client_name) ? ` · ${job.client__full_name || job.client_name}` : ''}
                                          </li>
                                        ))}
                                      </ul>
                                    )
                                  )}
                                </div>

                                {tech.last_active && (
                                  <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1 italic">
                                    <Clock className="h-3 w-3" />
                                    Active {new Date(tech.last_active).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pt-0.5">
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
              ))
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

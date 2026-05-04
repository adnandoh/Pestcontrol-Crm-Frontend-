import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, ChevronRight, Loader2, AlertCircle, MapPin, Clock, Phone } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import type { JobCard, Technician } from '../../types';
import { Button } from '../ui';
import { cn } from '../../utils/cn';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTechnicians();
    }
  }, [isOpen]);

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      setError(null);
      // We use getTechnicians which we annotated in backend to include active_jobs
      const response = await enhancedApiService.getTechnicians({ is_active: true });
      setTechnicians(response.results);
    } catch (err) {
      setError('Failed to load technicians');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (techId: number) => {
    if (!jobCard) return;
    try {
      setAssigning(techId);
      setError(null);
      await enhancedApiService.assignTechnician(jobCard.id, techId);
      onSuccess();
      onClose();
    } catch (err) {
      setError('Failed to assign technician');
      console.error(err);
    } finally {
      setAssigning(null);
    }
  };

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
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 animate-shake">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Select Staff Member</p>
            
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
                <span className="text-[10px] font-black text-gray-400 uppercase">Loading Staff...</span>
              </div>
            ) : technicians.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white">
                <p className="text-xs font-bold text-gray-400 italic">No active technicians found</p>
              </div>
            ) : (
              technicians.map((tech) => {
                const workload = tech.active_jobs || 0;
                const isHighLoad = workload >= 7;
                const isMediumLoad = workload >= 4 && workload < 7;
                
                return (
                  <button
                    key={tech.id}
                    onClick={() => handleAssign(tech.id)}
                    disabled={assigning !== null || workload >= 10}
                    className={cn(
                      "w-full group relative bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-500 transition-all text-left flex items-center justify-between",
                      assigning === tech.id && "ring-2 ring-blue-500 bg-blue-50/30",
                      workload >= 10 && "opacity-60 grayscale-[0.5] cursor-not-allowed bg-gray-50/50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2.5 rounded-full transition-colors",
                        isHighLoad ? "bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white" :
                        isMediumLoad ? "bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white" :
                        "bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white"
                      )}>
                        <User className="h-5 w-5" />
                      </div>
                      
                      <div>
                        <h4 className="font-black text-gray-900 text-sm group-hover:text-blue-600 transition-colors uppercase leading-none mb-1">
                          {tech.name}
                        </h4>
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
                              <Phone className="h-3 w-3" />
                              {tech.mobile || tech.phone || '---'}
                            </span>

                            {(tech.service_area || tech.city) && (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-tighter">
                                <MapPin className="h-3 w-3" />
                                {tech.service_area || ''}{tech.service_area && tech.city ? ' - ' : ''}{tech.city || ''}
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

                    <div className="flex items-center gap-3">
                       <div className={cn(
                         "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border shadow-xs",
                         isHighLoad && workload < 10 ? "bg-red-50 text-red-700 border-red-200" :
                         workload >= 10 ? "bg-gray-100 text-gray-700 border-gray-300" :
                         isMediumLoad ? "bg-amber-50 text-amber-700 border-amber-200" :
                         "bg-emerald-50 text-emerald-700 border-emerald-200"
                       )}>
                         {workload >= 10 ? 'Max Capacity' : isHighLoad ? 'High Load' : isMediumLoad ? 'Busy' : 'Available'}
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
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
           <span className="text-[9px] font-bold text-gray-400 italic">Selecting a technician will auto-start the job.</span>
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

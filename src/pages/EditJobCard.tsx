import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  User,
  Settings,
  IndianRupee,
  Calendar,
  ShieldCheck,
  Zap,
  Target
} from 'lucide-react';
import {
  Button,
  Card,
  PageLoading,
  Input,
} from '../components/ui';
import { useFormValidation, jobCardValidationRules } from '../hooks/useFormValidation';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { JobCardFormData, JobCard, Technician } from '../types';

const EditJobCard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const getInitialFormData = (): JobCardFormData => ({
    client_name: '',
    client_mobile: '',
    client_email: '',
    client_city: '',
    client_address: '',
    client_notes: '',
    job_type: 'Customer',
    service_category: 'One-Time Service',
    property_type: '',
    bhk_size: '',
    is_paused: false,
    service_type: '',
    schedule_date: '',
    time_slot: '',
    state: '',
    city: '',
    status: 'Pending',
    payment_status: 'Unpaid',
    assigned_to: '',
    technician: undefined,
    price: '',
    next_service_date: '',
    reference: '',
    extra_notes: '',
    contract_duration: '',
    notes: ''
  });

  const [formData, setFormData] = useState<JobCardFormData>(getInitialFormData());

  const {
    errors,
    validateField,
    validateForm,
    clearError,
    scrollToFirstError,
  } = useFormValidation(jobCardValidationRules);

  const serviceTypeCategories = [
    {
      name: 'General Pest',
      options: ['Cockroach', 'Ants', 'Mosquito', 'Spiders', 'Flies', 'Silverfish', 'Moths', 'Beetles', 'Centipedes/Millipedes', 'Earwigs', 'Crickets']
    },
    {
      name: 'Advanced Pest',
      options: ['Bed Bug', 'Rodent', 'Fleas', 'Ticks', 'Mites', 'Termite', 'Wood Borer', 'Aphids', 'Thrips', 'Scale Insects', 'Whiteflies', 'Caterpillars', 'Slugs/Snails']
    }
  ];

  const serviceTypeOptions = serviceTypeCategories.flatMap(cat => cat.options);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [jobData, techData] = await Promise.all([
          enhancedApiService.getJobCard(parseInt(id)),
          enhancedApiService.getActiveTechnicians()
        ]);
        
        setJobCard(jobData);
        setTechnicians(techData || []);
        
        const initialForm = {
          client_name: jobData.client_name || '',
          client_mobile: jobData.client_mobile || '',
          client_email: jobData.client_email || '',
          client_city: jobData.client_city || '',
          client_address: jobData.client_address || '',
          client_notes: jobData.client_notes || '',
          job_type: jobData.job_type || 'Customer',
          service_category: jobData.service_category || 'One-Time Service',
          property_type: jobData.property_type || '',
          bhk_size: jobData.bhk_size || '',
          is_paused: jobData.is_paused || false,
          service_type: jobData.service_type || '',
          schedule_date: jobData.schedule_date || '',
          time_slot: jobData.time_slot || '',
          state: jobData.state || '',
          city: jobData.city || '',
          status: jobData.status || 'Pending',
          payment_status: jobData.payment_status || 'Unpaid',
          assigned_to: jobData.assigned_to || '',
          technician: jobData.technician,
          price: jobData.price || '',
          next_service_date: jobData.next_service_date || '',
          reference: jobData.reference || '',
          notes: jobData.notes || '',
          extra_notes: jobData.extra_notes || '',
          contract_duration: jobData.contract_duration || ''
        };
        
        setFormData(initialForm);
        
        const services = jobData.service_type ? jobData.service_type.split(', ') : [];
        setSelectedServices(services.filter(s => serviceTypeOptions.includes(s)));
        
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleInputChange = (field: keyof JobCardFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const handleServiceTypeChange = (service: string, checked: boolean) => {
    if (checked) {
      setSelectedServices(prev => [...prev, service]);
    } else {
      setSelectedServices(prev => prev.filter(s => s !== service));
      setSelectAll(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedServices([...serviceTypeOptions]);
    } else {
      setSelectedServices([]);
    }
  };

  useEffect(() => {
    const updatedServiceType = selectedServices.join(', ');
    if (formData.service_type !== updatedServiceType) {
        handleInputChange('service_type', updatedServiceType);
    }
  }, [selectedServices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setTimeout(() => { scrollToFirstError(); }, 100);
      return;
    }
    try {
      setSubmitting(true);
      await enhancedApiService.updateJobCard(parseInt(id), formData);
      navigate(jobCard?.job_type === 'Society' ? '/society-jobcards' : '/jobcards');
    } catch (err: any) {
      setError(err.message || 'Failed to update booking');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading text="Loading booking..." />;
  if (!jobCard) return <div className="p-10 text-center">Booking Not Found</div>;

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10 h-full">
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white rounded border border-gray-200 shadow-sm transition-colors">
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight uppercase italic">Edit Booking</h1>
            <span className="text-[10px] font-bold text-blue-600 uppercase">Code: {jobCard.code}</span>
          </div>
        </div>
      </div>

      <Card className="border-gray-200 shadow-xs overflow-hidden">
        <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
          <div className="p-4 bg-white/50">
            <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User className="h-3 w-3" /> Client & Service Location
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Mobile Number</label>
                <Input value={formData.client_mobile} readOnly disabled className="h-8 text-xs font-bold bg-gray-50 italic" />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Client Name</label>
                <Input value={formData.client_name} readOnly disabled className="h-8 text-xs font-bold bg-gray-50 italic uppercase" />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Service State</label>
                <Input value={formData.state} onChange={(e) => handleInputChange('state', e.target.value)} className="h-8 text-xs font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Service City</label>
                <Input value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} className="h-8 text-xs font-bold" />
              </div>
              <div className="lg:col-span-4">
                <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Detailed Address *</label>
                <Input value={formData.client_address} onChange={(e) => handleInputChange('client_address', e.target.value)} className="h-8 text-xs font-medium" required />
              </div>
            </div>
          </div>

          <div className="p-4 bg-white">
            <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Select Service Pest Types *
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {serviceTypeCategories.map((category, idx) => (
                  <div key={category.name} className={cn("rounded-xl p-3 border", idx === 0 ? "bg-emerald-50/30 border-emerald-100" : "bg-indigo-50/30 border-indigo-100")}>
                    <h5 className={cn("text-[9px] font-extrabold uppercase tracking-tighter mb-2 pb-1 border-b flex items-center gap-1.5", idx === 0 ? "text-emerald-700 border-emerald-100" : "text-indigo-700 border-indigo-100")}>
                       {idx === 0 ? <Zap className="h-3 w-3" /> : <Target className="h-3 w-3" />} {category.name} Range
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1.5">
                       {category.options.map(pest => (
                         <div key={pest} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`edit-pest-${pest}`}
                              checked={selectedServices.includes(pest)}
                              onChange={(e) => handleServiceTypeChange(pest, e.target.checked)}
                              className={cn("h-3 w-3 rounded", idx === 0 ? "text-emerald-600" : "text-indigo-600")}
                            />
                            <label htmlFor={`edit-pest-${pest}`} className="text-[10px] font-bold text-gray-700 cursor-pointer truncate uppercase tracking-tighter">{pest}</label>
                         </div>
                       ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="p-4 bg-gray-50/50">
            <h4 className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar className="h-3 w-3" /> Schedule & Assignment
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Schedule Date *</label>
                <Input type="date" value={formData.schedule_date} onChange={(e) => handleInputChange('schedule_date', e.target.value)} className="h-8 text-xs font-bold" required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Service Price *</label>
                <div className="relative">
                  <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <Input type="number" value={formData.price} onChange={(e) => handleInputChange('price', e.target.value)} className="pl-6 h-8 text-xs font-extrabold text-blue-800" required />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Assigned Technician</label>
                <select
                  value={formData.technician || ''}
                  onChange={(e) => {
                    const techId = e.target.value;
                    const tech = technicians.find(t => t.id.toString() === techId);
                    handleInputChange('technician', techId ? parseInt(techId) : null);
                    handleInputChange('assigned_to', tech ? tech.name : '');
                  }}
                  className="w-full h-8 px-2 text-xs font-bold border border-gray-300 rounded outline-none bg-white font-extrabold uppercase tracking-tighter"
                >
                  <option value="">Select Technician</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-rose-500 mb-1 block uppercase tracking-tighter">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full h-8 px-2 text-xs font-extrabold border border-gray-300 rounded outline-none bg-white text-rose-600 uppercase"
                >
                  {['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Hold', 'Inactive'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="p-4">
             <label className="text-[10px] font-extrabold text-gray-400 mb-2 block uppercase">Additional Notes</label>
             <textarea
               value={formData.notes || ''}
               onChange={(e) => handleInputChange('notes', e.target.value)}
               rows={2}
               className="w-full border border-gray-300 rounded p-2 text-xs font-medium outline-none"
             />
          </div>

          <div className="p-4 bg-gray-50 flex items-center justify-end gap-2">
             <Button type="button" variant="outline" onClick={() => navigate(-1)} className="h-8 text-[11px] font-extrabold uppercase">Discard</Button>
             <Button onClick={handleSubmit} disabled={submitting} className="h-8 text-[11px] font-extrabold bg-blue-700 hover:bg-blue-800 shadow-lg px-8 uppercase">Update Booking</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditJobCard;
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  IndianRupee,
  Calendar,
} from 'lucide-react';
import {
  Button,
  Card,
  PageLoading,
  Input,
  ClockTimePicker,
} from '../components/ui';

import { useFormValidation, jobCardValidationRules } from '../hooks/useFormValidation';
import { enhancedApiService } from '../services/api.enhanced';
import type { JobCardFormData, JobCard, Technician } from '../types';

import { PRICING_DATA, PROPERTY_LOCATIONS, SERVICE_TYPES } from '../constants/pricing';

const EditJobCard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  
  // Pricing selector states
  const [pricingService, setPricingService] = useState('');
  const [pricingArea, setPricingArea] = useState('');
  const [pricingType, setPricingType] = useState('');

  const getInitialFormData = (): JobCardFormData => ({
    client_name: '',
    client_mobile: '',
    client_email: '',
    client_city: '',
    client_address: '',
    client_notes: '',
    job_type: 'Customer',
    service_category: 'One-Time Service',
    property_type: 'Home / Flat',
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
    price: '0.00',
    next_service_date: '',
    reference: '',
    extra_notes: '',
    contract_duration: '',
    notes: ''
  });

  const [formData, setFormData] = useState<JobCardFormData>(getInitialFormData());

  const {
    validateForm,
    clearError,
    scrollToFirstError,
  } = useFormValidation(jobCardValidationRules);

  // Handle pricing calculation
  useEffect(() => {
    if (pricingService && pricingArea && pricingType) {
      const serviceData = PRICING_DATA[pricingService];
      if (serviceData && serviceData[pricingType]) {
        const typeData = serviceData[pricingType];
        if (typeof typeData === 'object') {
          const price = (typeData as any)[pricingArea];
          if (price !== undefined) {
             setFormData(prev => ({ ...prev, price: price.toString() }));
          }
        } else if (typeof typeData === 'number') {
           setFormData(prev => ({ ...prev, price: typeData.toString() }));
        }
      }
    } else {
      // Reset price if selection is incomplete
      setFormData(prev => ({ ...prev, price: '0.00' }));
    }
  }, [pricingService, pricingArea, pricingType]);

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
          property_type: jobData.property_type || 'Home / Flat',
          bhk_size: jobData.bhk_size || '',
          is_paused: jobData.is_paused || false,
          service_type: jobData.service_type || '',
          schedule_date: jobData.schedule_date || '',
          time_slot: jobData.time_slot || '',
          state: jobData.state || 'Maharashtra',
          city: jobData.city || 'Mumbai',
          status: jobData.status || 'Pending',
          payment_status: jobData.payment_status || 'Unpaid',
          assigned_to: jobData.assigned_to || '',
          technician: jobData.technician,
          price: jobData.price || '0.00',
          next_service_date: jobData.next_service_date || '',
          reference: jobData.reference || '',
          notes: jobData.notes || '',
          extra_notes: jobData.extra_notes || '',
          contract_duration: jobData.contract_duration || ''
        };
        
        setFormData(initialForm);
        
        // Try to infer pricing states
        if (jobData.bhk_size) setPricingArea(jobData.bhk_size);
        
        let inferredType = jobData.service_category || '';
        if (inferredType === 'One-Time Service') inferredType = 'One-Time';
        setPricingType(inferredType);
        
        const services = jobData.service_type ? jobData.service_type.split(', ') : [];
        setSelectedServices(services.filter(s => serviceTypeOptions.includes(s)));
        
        // Infer pricing service from first selected pest if possible
        if (services.length > 0) {
          const firstPest = services[0];
          if (['Cockroach', 'Ants'].includes(firstPest)) setPricingService('Cockroach / Ants');
          else if (firstPest === 'Bed Bug') setPricingService('Bed Bugs');
          else if (firstPest === 'Termite') setPricingService('Termite');
          else if (firstPest === 'Rodent') setPricingService('Rodent');
          else if (firstPest === 'Mosquito') setPricingService('Mosquito');
        }
        
      } catch (err: any) {
        // Error handling
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

          {/* Section: Service Configuration & Pricing (Updated UI) */}
          <div className="p-5 bg-white border-b">
             <div className="flex flex-col lg:flex-row lg:items-end gap-6">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div>
                      <label className="text-[10px] font-extrabold text-gray-400 mb-1.5 block uppercase tracking-wider">Select Service*</label>
                      <select
                        value={pricingService}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPricingService(val);
                          
                          // Handle automatic type selection
                          const availableTypes = SERVICE_TYPES[val] || [];
                          if (availableTypes.length === 1) {
                            setPricingType(availableTypes[0]);
                             // Also map to backend category
                            const typeVal = availableTypes[0];
                            if (typeVal === 'AMC') {
                                handleInputChange('service_category', 'AMC');
                            } else if (typeVal.includes('One-Time')) {
                                handleInputChange('service_category', 'One-Time Service');
                            } else {
                                handleInputChange('service_category', typeVal);
                            }
                          } else {
                            setPricingType('');
                          }
                          
                          // Auto-check pests
                          const serviceToPestsMap: Record<string, string[]> = {
                            'Cockroach / Ants': ['Cockroach', 'Ants'],
                            'Bed Bugs': ['Bed Bug'],
                            'Termite': ['Termite'],
                            'Rodent': ['Rodent'],
                            'Mosquito': ['Mosquito']
                          };
                          if (serviceToPestsMap[val]) {
                            setSelectedServices(serviceToPestsMap[val]);
                          }
                        }}
                        className="w-full h-10 px-3 text-xs font-bold border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-gray-50/50"
                        required
                      >
                        <option value="">Select Service</option>
                        {Object.keys(SERVICE_TYPES).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-extrabold text-gray-400 mb-1.5 block uppercase tracking-wider">Select Area*</label>
                      <select
                        value={pricingArea}
                        onChange={(e) => {
                          setPricingArea(e.target.value);
                          if (PROPERTY_LOCATIONS.includes(e.target.value)) {
                            handleInputChange('bhk_size', e.target.value);
                          } else {
                            handleInputChange('bhk_size', '');
                          }
                        }}
                        className="w-full h-10 px-3 text-xs font-bold border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-gray-50/50"
                        required
                      >
                        <option value="">Select Area</option>
                        {pricingService === 'Rodent' ? (
                          <>
                            <option value="Society Area">Society Area</option>
                            <option value="Windows">Windows</option>
                          </>
                        ) : pricingService === 'Hotel / Commercial' ? (
                          <option value="Commercial Space">Commercial Space</option>
                        ) : (
                          PROPERTY_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)
                        )}
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-extrabold text-gray-400 mb-1.5 block uppercase tracking-wider">Select Type*</label>
                      <select
                        value={pricingType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPricingType(val);
                          // Map to backend service_category
                          if (val === 'AMC 3 Services') {
                            handleInputChange('service_category', 'AMC');
                          } else {
                            handleInputChange('service_category', 'One-Time Service');
                          }
                        }}
                        className="w-full h-10 px-3 text-xs font-bold border border-gray-200 rounded-lg outline-none focus:border-blue-500 bg-gray-50/50"
                        required
                        disabled={!pricingService}
                      >
                        <option value="">Select Type</option>
                        {pricingService && SERVICE_TYPES[pricingService]?.map((t: string) => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                </div>

                <div className="flex flex-col items-center lg:items-end justify-center min-w-[120px]">
                   <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Total Price</span>
                   <div className="text-4xl font-black text-yellow-500 flex items-center">
                      <span className="text-2xl mr-1 italic">₹</span>
                      {formData.price}
                   </div>
                </div>
             </div>
             
             {(pricingService === 'Hotel / Commercial' || (pricingService === 'Rodent' && pricingArea === 'Society Area')) && (
               <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                 <p className="text-xs font-bold text-amber-700 italic">“Technician visit ke baad final rate diya jayega.”</p>
               </div>
             )}
          </div>

          <div className="p-5 bg-gray-50/30">
            <h4 className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" /> Schedule & Assignment
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1.5 block uppercase tracking-tight">Schedule Date *</label>
                <Input type="date" value={formData.schedule_date} onChange={(e) => handleInputChange('schedule_date', e.target.value)} className="w-full h-10 px-3 text-xs font-bold border-gray-200 rounded-lg shadow-sm" required />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1.5 block uppercase tracking-tighter">Available Time Slot</label>
                <ClockTimePicker
                  value={formData.time_slot || ''}
                  onChange={(val) => handleInputChange('time_slot', val)}
                  placeholder="Select Time"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1.5 block uppercase">Service Price Override</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input type="number" value={formData.price} onChange={(e) => handleInputChange('price', e.target.value)} className="w-full h-10 pl-9 pr-3 text-sm font-black border border-gray-200 rounded-lg outline-none text-blue-700 bg-white shadow-sm" required />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1.5 block uppercase tracking-tighter">Assigned Technician</label>
                <select
                  value={formData.technician || ''}
                  onChange={(e) => {
                    const techId = e.target.value;
                    const tech = technicians.find(t => t.id.toString() === techId);
                    handleInputChange('technician', techId ? parseInt(techId) : null);
                    handleInputChange('assigned_to', tech ? tech.name : '');
                  }}
                  disabled={formData.status !== 'On Process'}
                  className={`w-full h-10 px-3 text-xs font-bold border border-gray-200 rounded-lg outline-none shadow-sm uppercase ${formData.status !== 'On Process' ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'}`}
                >
                  <option value="">Select Technician</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1.5 block uppercase tracking-tighter">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full h-10 px-3 text-xs font-black border border-gray-200 rounded-lg outline-none bg-white text-rose-600 uppercase shadow-sm"
                >
                  {['Pending', 'On Process', 'Done'].map(s => <option key={s} value={s}>{s}</option>)}
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
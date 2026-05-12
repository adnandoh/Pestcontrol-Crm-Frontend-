import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  IndianRupee,
  Calendar,
  MessageCircle,
  Send,
  UserCheck
} from 'lucide-react';
import { openWhatsApp, whatsAppTemplates } from '../utils/whatsapp';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
import {
  Button,
  PageLoading,
  Input,
  ClockTimePicker,
} from '../components/ui';

import { useFormValidation, jobCardValidationRules } from '../hooks/useFormValidation';
import { enhancedApiService } from '../services/api.enhanced';
import type { JobCardFormData, JobCard } from '../types';

import { PRICING_DATA, PROPERTY_LOCATIONS, SERVICE_TYPES } from '../constants/pricing';

const EditJobCard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  
  const {
    errors,
    validateForm,
    clearError,
    scrollToFirstError,
  } = useFormValidation(jobCardValidationRules);
  const isInitialLoad = React.useRef(true);
  const [isPriceManuallyEdited, setIsPriceManuallyEdited] = useState(false);
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
    schedule_datetime: '',
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
    notes: '',
    commercial_type: 'home',
    is_price_estimated: false,
    cancellation_reason: '',
    reminder_date: '',
    reminder_time: '',
    reminder_note: '',
    is_reminder_done: false
  });

  const [formData, setFormData] = useState<JobCardFormData>(getInitialFormData());

  // Handle pricing calculation
  useEffect(() => {
    // 1. Skip if still loading from API
    // 2. Skip if it's the very first render cycle where states are being initialized
    // 3. Skip if the user has manually overridden the price in this session
    if (loading || isInitialLoad.current || isPriceManuallyEdited) return;

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
    }
  }, [pricingService, pricingArea, pricingType, loading, isPriceManuallyEdited]);

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

  const [isNextDateManual, setIsNextDateManual] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await enhancedApiService.getJobCard(parseInt(id));
        
        setJobCard(data);
        
        const formattedDate = data.schedule_datetime ? dayjs(data.schedule_datetime).tz("Asia/Kolkata").format('YYYY-MM-DD') : '';

        setFormData({
          client_name: data.client_name || '',
          client_mobile: data.client_mobile || '',
          client_email: data.client_email || '',
          client_city: data.client_city || '',
          client_address: data.client_address || '',
          client_notes: data.client_notes || '',
          job_type: data.job_type || 'Customer',
          commercial_type: data.commercial_type || 'home',
          is_price_estimated: data.is_price_estimated || false,
          service_category: data.service_category || 'One-Time Service',
          property_type: data.property_type || 'Home / Flat',
          bhk_size: data.bhk_size || '',
          is_paused: data.is_paused || false,
          service_type: data.service_type || '',
          schedule_datetime: formattedDate,
          time_slot: data.time_slot || (data.schedule_datetime ? dayjs(data.schedule_datetime).tz("Asia/Kolkata").format('hh:mm A') : ''),
          state: data.state || 'Maharashtra',
          city: data.city || 'Mumbai',
          status: data.status || 'Pending',
          payment_status: data.payment_status || 'Unpaid',
          assigned_to: data.assigned_to || '',
          technician: data.technician,
          price: data.price?.toString() || '0.00',
          next_service_date: data.next_service_date || '',
          reference: data.reference || '',
          notes: data.notes || '',
          extra_notes: data.extra_notes || '',
          contract_duration: data.contract_duration || '',
          cancellation_reason: data.cancellation_reason || '',
          reminder_date: data.reminder_date || '',
          reminder_time: data.reminder_time || '',
          reminder_note: data.reminder_note || '',
          is_reminder_done: data.is_reminder_done || false
        });
        
        // If it already has a next service date, mark it as manual/respected
        if (data.next_service_date) {
          setIsNextDateManual(true);
        }
        
        // Try to infer pricing states
        if (data.bhk_size) setPricingArea(data.bhk_size);
        
        let inferredType = data.service_category || '';
        if (inferredType === 'One-Time Service') inferredType = 'One Time Service';
        if (inferredType === 'AMC') inferredType = 'AMC 3 Services';
        setPricingType(inferredType);
        
        const services = data.service_type ? data.service_type.split(', ') : [];
        setSelectedServices(services.filter((s: string) => serviceTypeOptions.includes(s)));
        
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
        console.error("Error fetching job card:", err);
      } finally {
        setLoading(false);
        // After states are set and loading is false, allow future pricing updates
        // but only after this specific execution block finishes
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 100);
      }
    };
    fetchData();
  }, [id]);

  // Handle Next Service Date Auto-calculation
  useEffect(() => {
    if (loading || !formData.schedule_datetime || isNextDateManual) return;

    const service = pricingService.toLowerCase();
    const isCockroachAMC = service.includes('cockroach') && formData.service_category === 'AMC';
    const isBedBug = service.includes('bedbug') || service.includes('bed bug');

    if (isCockroachAMC || isBedBug) {
        const scheduleDate = new Date(formData.schedule_datetime);
        if (isNaN(scheduleDate.getTime())) return;

        let nextDate = new Date(scheduleDate);
        
        if (isCockroachAMC) {
          nextDate.setMonth(nextDate.getMonth() + 4);
        } else if (isBedBug) {
          nextDate.setDate(nextDate.getDate() + 15);
        }
        
        const nextDateStr = nextDate.toISOString().split('T')[0];
        
        if (nextDateStr !== formData.next_service_date) {
            setFormData(prev => ({ ...prev, next_service_date: nextDateStr }));
        }
    }
  }, [pricingService, formData.service_category, formData.schedule_datetime, isNextDateManual, loading]);

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
      console.error('Validation errors:', validationErrors);
      const errorFields = Object.keys(validationErrors).map(field => field.replace('_', ' ')).join(', ');
      alert(`Please fix the following errors: ${errorFields}`);
      setTimeout(() => { scrollToFirstError(); }, 100);
      return;
    }
    try {
      setSubmitting(true);
      // Ensure schedule_datetime is in ISO format
      const submitData = { ...formData };
      if (submitData.schedule_datetime) {
        // Create a dayjs object from the date part in IST
        let combined = dayjs.tz(submitData.schedule_datetime, "Asia/Kolkata");
        
        if (submitData.time_slot) {
          const timeMatch = submitData.time_slot.match(/(\d+):(\d+)/);
          const ampmMatch = submitData.time_slot.match(/(AM|PM)/i);
          
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const ampm = ampmMatch ? ampmMatch[0].toUpperCase() : 'AM';
            
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            
            combined = combined.hour(hours).minute(minutes).second(0);
          }
        } else {
          // If no time slot is selected, default to a reasonable time (e.g., 10 AM)
          // or keep existing time if available. For now, let's keep midnight if not specified.
          combined = combined.hour(10).minute(0).second(0);
        }
        submitData.schedule_datetime = combined.toISOString();
      }
      await enhancedApiService.updateJobCard(parseInt(id!), submitData);
      navigate('/jobcards');
    } catch (err: any) {
      console.error('Update error:', err);
      alert(err.message || 'Failed to update booking. Please check all fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading text="Loading booking..." />;
  if (!jobCard) return <div className="p-10 text-center">Booking Not Found</div>;

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10 h-full pb-10 relative">
      {/* Page Title Area (Simplified) */}
      <div className="flex items-center gap-3 px-4 py-4 -mx-4 sm:mx-0 mb-2">
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 hover:bg-white rounded border border-gray-200 transition-colors shadow-sm bg-white/50">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none">Edit Booking</h1>
          <span className="text-[11px] font-bold text-gray-500 mt-1">{jobCard.code || jobCard.id}</span>
        </div>

        {/* WhatsApp Actions */}
        <div className="flex items-center gap-2 ml-auto bg-white/50 p-1.5 rounded-lg border border-gray-200">
          <button
            onClick={() => openWhatsApp(formData.client_mobile, whatsAppTemplates.bookingConfirmation({
              clientName: formData.client_name,
              bookingId: jobCard.code || jobCard.id.toString(),
              serviceType: formData.service_type,
              area: formData.bhk_size || formData.property_type || '',
              date: dayjs(formData.schedule_datetime).format('DD/MM/YYYY'),
              time: formData.time_slot || dayjs(formData.schedule_datetime).format('hh:mm A'),
              amount: formData.price?.toString() || '0',
              address: formData.client_address || ''
            }))}
            className="p-2 bg-green-50 hover:bg-green-600 text-green-600 hover:text-white rounded-md transition-all shadow-sm"
            title="Send Confirmation"
          >
            <MessageCircle className="h-4 w-4" />
          </button>

          {jobCard.technician_mobile && (
            <>
              <button
                onClick={() => openWhatsApp(jobCard.technician_mobile!, whatsAppTemplates.technicianJobDetails({
                  bookingId: jobCard.code || jobCard.id.toString(),
                  clientName: formData.client_name,
                  clientMobile: formData.client_mobile,
                  serviceType: formData.service_type,
                  area: formData.bhk_size || formData.property_type || '',
                  amount: formData.price?.toString() || '0',
                  address: formData.client_address || '',
                  dateTime: `${dayjs(formData.schedule_datetime).format('DD/MM/YYYY')} @ ${formData.time_slot || dayjs(formData.schedule_datetime).format('hh:mm A')}`,
                  instructions: formData.notes || ''
                }))}
                className="p-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-md transition-all shadow-sm"
                title="Send to Technician"
              >
                <Send className="h-4 w-4" />
              </button>

              <button
                onClick={() => openWhatsApp(formData.client_mobile, whatsAppTemplates.technicianAssigned({
                  clientName: formData.client_name,
                  bookingId: jobCard.code || jobCard.id.toString(),
                  techName: jobCard.technician_name || jobCard.assigned_to || '',
                  techContact: jobCard.technician_mobile || '',
                  serviceType: formData.service_type,
                  area: formData.bhk_size || formData.property_type || '',
                  dateTime: `${dayjs(formData.schedule_datetime).format('DD/MM/YYYY')} @ ${formData.time_slot || dayjs(formData.schedule_datetime).format('hh:mm A')}`,
                  amount: formData.price?.toString() || '0'
                }))}
                className="p-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-md transition-all shadow-sm"
                title="Notify Client (Tech Assigned)"
              >
                <UserCheck className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section: Client & Location */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-[13px] font-extrabold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <User className="h-4 w-4" /> Client & Service Location
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-4">
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Mobile Number</label>
                <Input value={formData.client_mobile} readOnly disabled className="h-10 text-sm font-medium bg-gray-50 text-gray-500 shadow-sm" />
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Client Name</label>
                <Input value={formData.client_name} readOnly disabled className="h-10 text-sm font-medium bg-gray-50 text-gray-500 shadow-sm uppercase" />
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Service State</label>
                <Input id="state" name="state" value={formData.state} onChange={(e) => handleInputChange('state', e.target.value)} error={errors.state} className="h-10 text-sm font-medium text-gray-900 shadow-sm" />
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Service City</label>
                <Input id="city" name="city" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} error={errors.city} className="h-10 text-sm font-medium text-gray-900 shadow-sm" />
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Commercial Type *</label>
                <select
                  value={formData.commercial_type}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setFormData(prev => ({ 
                      ...prev, 
                      commercial_type: val,
                      is_price_estimated: val !== 'home',
                      price: val !== 'home' ? '0.00' : prev.price
                    }));
                    clearError('commercial_type');
                  }}
                  className={`w-full h-10 px-3 text-sm font-bold border rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white ${errors.commercial_type ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="home">Home (Residential)</option>
                  <option value="hotel">Hotel</option>
                  <option value="society">Society</option>
                  <option value="villa">Villa</option>
                  <option value="office">Office</option>
                  <option value="other">Other Commercial</option>
                </select>
                {errors.commercial_type && <p className="mt-1 text-xs text-red-600">{errors.commercial_type}</p>}
                {formData.commercial_type !== 'home' && (
                  <p className="text-[10px] text-blue-600 font-bold mt-1 animate-fade-in flex items-center gap-1">
                    👉 Final price will be decided after technician visit.
                  </p>
                )}
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Booking Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className={`w-full h-10 px-3 text-sm font-bold border rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white ${errors.status ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="Pending">Pending</option>
                  <option value="On Process">On Process</option>
                  <option value="Done">Done</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                {errors.status && <p className="mt-1 text-xs text-red-600">{errors.status}</p>}
              </div>

              {formData.status === 'Cancelled' && (
                <div className="lg:col-span-2">
                  <label className="text-[13px] font-bold text-red-700 mb-1.5 block">Cancellation Reason *</label>
                  <Input 
                    value={formData.cancellation_reason || ''} 
                    onChange={(e) => handleInputChange('cancellation_reason', e.target.value)} 
                    error={errors.cancellation_reason}
                    className="h-10 text-sm font-medium text-gray-900 shadow-sm border-red-200 bg-red-50/30" 
                    placeholder="Enter reason for cancellation (min 4 chars)"
                    required 
                  />
                </div>
              )}

              {formData.status === 'Pending' && formData.removal_remarks && (
                <div className="lg:col-span-2">
                  <label className="text-[13px] font-bold text-amber-700 mb-1.5 block">Removal Remarks</label>
                  <Input 
                    value={formData.removal_remarks || ''} 
                    onChange={(e) => handleInputChange('removal_remarks', e.target.value)} 
                    error={errors.removal_remarks}
                    className="h-10 text-sm font-medium text-gray-900 shadow-sm border-amber-200 bg-amber-50/30" 
                    placeholder="Remarks for technician removal"
                  />
                </div>
              )}

              <div className="lg:col-span-4">
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Detailed Address *</label>
                <Input id="client_address" name="client_address" value={formData.client_address} onChange={(e) => handleInputChange('client_address', e.target.value)} error={errors.client_address} className="h-10 text-sm font-medium text-gray-900 shadow-sm" required />
              </div>
            </div>
          </div>

          {/* Section: Service Configuration & Pricing */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
             <div className="absolute inset-0 bg-blue-50/30 pointer-events-none" />
             <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div>
                      <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Select Service *</label>
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
                        className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-white shadow-sm"
                        required
                      >
                        <option value="">Select Service</option>
                        {Object.keys(SERVICE_TYPES).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Select Area *</label>
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
                        className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-white shadow-sm"
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
                      <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Select Type *</label>
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
                        className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-white shadow-sm disabled:bg-gray-50"
                        required
                        disabled={!pricingService}
                      >
                        <option value="">Select Type</option>
                        {pricingService && SERVICE_TYPES[pricingService]?.map((t: string) => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                </div>

                <div className="flex flex-col items-start lg:items-end justify-center min-w-[140px] pl-4 lg:border-l border-gray-200">
                   <span className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                     {formData.commercial_type === 'home' ? 'Total Price' : 'Estimated Price'}
                   </span>
                   {formData.commercial_type === 'home' ? (
                     <div className="text-4xl font-black text-gray-900 flex items-center">
                        <span className="text-2xl mr-1 text-gray-400">₹</span>
                        {formData.price}
                     </div>
                   ) : (
                     <div className="flex flex-col items-start lg:items-end">
                       <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-md tracking-tighter uppercase mb-1">To be decided</span>
                       <span className="text-sm font-bold text-gray-400 italic leading-tight">After Visit</span>
                     </div>
                   )}
                </div>
             </div>
             
             {formData.commercial_type !== 'home' && (
               <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                 <p className="text-xs font-bold text-amber-700 italic">“Technician visit ke baad final rate diya jayega.”</p>
               </div>
             )}
          </div>

          {/* Section: Schedule & Assignment */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-[13px] font-extrabold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
              <Calendar className="h-4 w-4" /> Schedule & Assignment
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Schedule Date *</label>
                <Input id="schedule_datetime" name="schedule_datetime" type="date" value={formData.schedule_datetime} onChange={(e) => handleInputChange('schedule_datetime', e.target.value)} className={`w-full h-10 px-3 text-sm font-medium border rounded-lg shadow-sm ${errors.schedule_datetime ? 'border-red-500' : 'border-gray-300'}`} required />
                {errors.schedule_datetime && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.schedule_datetime}</p>}
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Available Time Slot *</label>
                <ClockTimePicker
                  value={formData.time_slot || ''}
                  onChange={(val) => handleInputChange('time_slot', val)}
                  placeholder="Select Time"
                />
                {errors.time_slot && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.time_slot}</p>}
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Service Price Override</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    type="number" 
                    value={formData.price} 
                    onChange={(e) => {
                      handleInputChange('price', e.target.value);
                      setIsPriceManuallyEdited(true);
                    }} 
                    className="w-full h-10 pl-9 pr-3 text-sm font-bold border-gray-300 rounded-lg outline-none text-blue-700 bg-white shadow-sm" 
                    required 
                  />
                </div>
              </div>

              {/* Next Service Date Field */}
              {((pricingService.toLowerCase().includes('cockroach') && formData.service_category === 'AMC') || 
                pricingService.toLowerCase().includes('bed bug')) && (
                <div className="animate-fade-in md:col-span-1">
                  <label className="text-[13px] font-bold text-blue-700 mb-1.5 block">Next Service Date (Auto-calculated)</label>
                  <Input
                    type="date"
                    value={formData.next_service_date}
                    onChange={(e) => {
                      handleInputChange('next_service_date', e.target.value);
                      setIsNextDateManual(true);
                    }}
                    className="w-full h-10 px-3 text-sm font-bold border-blue-200 bg-blue-50/50 rounded-lg shadow-sm focus:border-blue-500"
                  />
                  <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase italic">
                    {pricingService.toLowerCase().includes('cockroach') ? 'Every 4 months for AMC' : 'After 15 days for Bed Bug'}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Section: Payment & Reference */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Payment Status</label>
                <select
                  value={formData.payment_status}
                  onChange={(e) => handleInputChange('payment_status', e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Payment Mode</label>
                <select
                  value={formData.payment_mode || ''}
                  onChange={(e) => handleInputChange('payment_mode', e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select Mode</option>
                  <option value="Cash">Cash</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Reference *</label>
                <select
                  value={formData.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  className={`w-full h-10 px-3 text-sm font-medium border rounded-lg shadow-sm outline-none bg-white ${errors.reference ? 'border-red-500' : 'border-gray-300'}`}
                  required
                >
                  <option value="">Select Reference</option>
                  <option value="Website">Website</option>
                  <option value="Play Store">Play Store</option>
                  <option value="Previous Client">Previous Client</option>
                  <option value="Facebook">Facebook</option>
                  <option value="YouTube">YouTube</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="SMS">SMS</option>
                  <option value="Instagram">Instagram</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Justdial">Justdial</option>
                  <option value="Poster">Poster</option>
                  <option value="Friend Reference">Friend Reference</option>
                  <option value="No Parking Board">No Parking Board</option>
                  <option value="Holding">Holding</option>
                  <option value="Other">Other</option>
                </select>
                {errors.reference && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.reference}</p>}
              </div>
            </div>
          </div>

          {/* Section: Reminders */}
          <div className="bg-white p-5 rounded-xl border border-orange-200 shadow-sm bg-orange-50/10">
            <h4 className="text-[13px] font-extrabold text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-orange-100 pb-2">
              <Calendar className="h-4 w-4" /> Set Follow-up Reminder
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Reminder Date</label>
                <Input
                  type="date"
                  value={formData.reminder_date || ''}
                  onChange={(e) => handleInputChange('reminder_date', e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium border-gray-300 rounded-lg shadow-sm"
                />
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Reminder Time</label>
                <Input
                  type="time"
                  value={formData.reminder_time || ''}
                  onChange={(e) => handleInputChange('reminder_time', e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium border-gray-300 rounded-lg shadow-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Reminder Note</label>
                <textarea
                  value={formData.reminder_note || ''}
                  onChange={(e) => handleInputChange('reminder_note', e.target.value)}
                  rows={1}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm font-medium outline-none focus:border-blue-500 shadow-sm"
                  placeholder="e.g., Call client for feedback..."
                />
              </div>
            </div>
          </div>

          {/* Section: Notes */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <label className="text-[13px] font-bold text-gray-700 mb-2 block">Additional Internal Notes</label>
             <textarea
               value={formData.notes || ''}
               onChange={(e) => handleInputChange('notes', e.target.value)}
               rows={2}
               placeholder="Optional notes or context..."
               className="w-full border border-gray-300 rounded-lg p-3 text-sm font-medium outline-none focus:border-blue-500 shadow-sm"
             />
          </div>

          {/* Action Footer (Non-Sticky) */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mt-8 flex flex-col sm:flex-row items-center justify-end gap-3">
             <Button type="button" variant="outline" onClick={() => navigate(-1)} className="h-10 px-6 text-[13px] font-bold text-gray-600 hover:bg-gray-50 border-gray-300">Discard Changes</Button>
             <Button type="submit" disabled={submitting} className="h-10 px-8 text-[13px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
               {submitting ? 'Saving...' : 'Update Booking'}
             </Button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditJobCard;

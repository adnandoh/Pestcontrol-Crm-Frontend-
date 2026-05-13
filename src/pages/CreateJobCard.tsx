import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  IndianRupee,
  Calendar,
  MessageCircle
} from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

import {
  Input,
  ClockTimePicker,
} from '../components/ui';

import { useFormValidation, jobCardValidationRules } from '../hooks/useFormValidation';
import { enhancedApiService } from '../services/api.enhanced';
import type { JobCardFormData, State, City, Location as MasterLocation } from '../types';

import { PRICING_DATA, PROPERTY_LOCATIONS, SERVICE_TYPES } from '../constants/pricing';

const CreateJobCard: React.FC = () => {
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [savingInquiry, setSavingInquiry] = useState(false);
  
  // Pricing selector states
  const [pricingService, setPricingService] = useState('');
  const [pricingArea, setPricingArea] = useState('');
  const [pricingType, setPricingType] = useState('');

  // Initial form state
  const getInitialFormData = (): JobCardFormData => {
    return {
      client_name: '',
      client_mobile: '',
      client_email: '',
      client_state: '',
      client_city: '',
      client_address: '',
      client_notes: '',
      job_type: 'Customer',
      commercial_type: 'home',
      is_price_estimated: false,
      service_category: 'One-Time Service',
      property_type: 'Home / Flat',
      bhk_size: '',
      is_paused: false,
      service_type: '',
      schedule_datetime: '',
      time_slot: '',
      state: 'Maharashtra',
      city: 'Mumbai',
      status: 'Pending',
      payment_status: 'Unpaid',
      assigned_to: '',
      technician: undefined,
      price: '0.00',
      next_service_date: '',
      reference: '',
      contract_duration: '',
      notes: '',
      extra_notes: '',
      reminder_date: '',
      reminder_time: '',
      reminder_note: '',
      is_amc_main_booking: false,
      is_followup_visit: false,
      included_in_amc: false,
      is_complaint_call: false
    };
  };

  const [formData, setFormData] = useState<JobCardFormData>(getInitialFormData());

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



  // Reference options
  const referenceOptions = [
    'Website',
    'Play Store',
    'Previous Client',
    'Facebook',
    'YouTube',
    'LinkedIn',
    'SMS',
    'Instagram',
    'WhatsApp',
    'Justdial',
    'Poster',
    'Friend Reference',
    'No Parking Board',
    'Holding',
    'Other'
  ];

  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Client check state
  const [clientCheckStatus, setClientCheckStatus] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle');
  const [foundClientName, setFoundClientName] = useState<string>('');
  const [lastCheckedMobile, setLastCheckedMobile] = useState<string>('');

  // Locations data (legacy)
  const [locations, setLocations] = useState<Record<string, string[]>>({});

  // Master Location States
  const [masterStates, setMasterStates] = useState<State[]>([]);
  const [masterCities, setMasterCities] = useState<City[]>([]);
  const [masterLocations, setMasterLocations] = useState<MasterLocation[]>([]);

  const [isNextDateManual, setIsNextDateManual] = useState(false);

  // Fetch legacy locations and master countries/states
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [locData, statesRes] = await Promise.all([
          enhancedApiService.getLocations(),
          enhancedApiService.getStates()
        ]);
        setLocations(locData);
        setMasterStates(statesRes.results);
        const maharashtra = statesRes.results.find(s => s.name === 'Maharashtra');
        
        if (maharashtra) {
          setFormData(prev => ({
            ...prev,
            master_state: maharashtra.id
          }));
        }
      } catch (err) {
        console.error('Failed to fetch initial location data:', err);
      }
    };
    
    fetchInitialData();
  }, []);

  // Fetch cities when state changes
  useEffect(() => {
    if (formData.master_state) {
      enhancedApiService.getCities({ state: formData.master_state })
        .then(res => setMasterCities(res.results))
        .catch(err => console.error('Error fetching cities:', err));
    } else {
      setMasterCities([]);
    }
    // Reset city and location when state changes
    setFormData(prev => ({ ...prev, master_city: undefined, master_location: undefined }));
  }, [formData.master_state]);

  // Fetch locations when city changes
  useEffect(() => {
    if (formData.master_city) {
      enhancedApiService.getMasterLocations({ city: formData.master_city })
        .then(res => setMasterLocations(res.results))
        .catch(err => console.error('Error fetching locations:', err));
    } else {
      setMasterLocations([]);
    }
    // Reset location when city changes
    setFormData(prev => ({ ...prev, master_location: undefined }));
  }, [formData.master_city]);

  // Handle Next Service Date Auto-calculation
  useEffect(() => {
    const service = pricingService.toLowerCase();
    const isCockroachAMC = service.includes('cockroach') && formData.service_category === 'AMC';
    const isBedBug = service.includes('bedbug') || service.includes('bed bug');

    if (isCockroachAMC || isBedBug) {
      // Auto-calculate only if not manually edited and schedule_date exists
      if (!isNextDateManual && formData.schedule_datetime) {
        const scheduleDate = new Date(formData.schedule_datetime);
        if (isNaN(scheduleDate.getTime())) return;

        let nextDate = new Date(scheduleDate);
        
        if (isCockroachAMC) {
          nextDate.setMonth(nextDate.getMonth() + 4);
        } else if (isBedBug) {
          nextDate.setDate(nextDate.getDate() + 15);
        }
        
        const nextDateStr = nextDate.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, next_service_date: nextDateStr }));
      }
    } else {
      if (!isNextDateManual) {
        setFormData(prev => ({ ...prev, next_service_date: '' }));
      }
    }
  }, [pricingService, formData.service_category, formData.schedule_datetime, isNextDateManual]);








  // Form validation
  const {
    errors,
    validateField,
    validateForm,
    clearError,
    scrollToFirstError,
  } = useFormValidation(jobCardValidationRules);

  // Payment status options
  const paymentStatusOptions = [
    'Paid',
    'Unpaid'
  ];


  // Handle input changes with localStorage persistence and validation
  const handleInputChange = (field: keyof JobCardFormData, value: any) => {
    let updatedFormData = {
      ...formData,
      [field]: value
    };

    setFormData(updatedFormData);
    clearError(field);
    
    return updatedFormData;
  };


  // Update service_type field when selections change
  useEffect(() => {
    const updatedServiceType = selectedServices.join(', ');
    handleInputChange('service_type', updatedServiceType);
    validateField('service_type', updatedServiceType);
  }, [selectedServices]);

  // Check if client exists by mobile number
  const checkClientExists = async (mobile: string) => {
    if (mobile.length !== 10) return;
    setClientCheckStatus('loading');
    try {
      const response = await enhancedApiService.checkClientExists(mobile);
      if (response.exists && response.client) {
        const client = response.client;
        setClientCheckFound(client.full_name || 'Unknown Client');
        setFormData(prev => ({
          ...prev,
          client_name: client.full_name || '',
          client_email: client.email || '',
          client_state: client.state || '',
          client_city: client.city || '',
          client_address: client.address || '',
          client_notes: client.notes || ''
        }));
      } else {
        setClientCheckNotFound();
      }
    } catch (error: any) {
      console.error('Error checking client:', error);
    }
  };

  const setClientCheckFound = (clientName: string) => {
    setClientCheckStatus('found');
    setFoundClientName(clientName);
  };

  const setClientCheckNotFound = () => {
    setClientCheckStatus('not-found');
  };

  const resetClientCheckState = () => {
    setClientCheckStatus('idle');
  };

  // Handle mobile number change
  const handleMobileChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 10);
    if (numericValue !== lastCheckedMobile) {
      resetClientCheckState();
    }
    handleInputChange('client_mobile', numericValue);
    if (numericValue.length === 10 && numericValue !== lastCheckedMobile) {
      setLastCheckedMobile(numericValue);
      checkClientExists(numericValue);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        // Create a dayjs object from the date part (local time)
        let combined = dayjs(submitData.schedule_datetime);
        
        if (submitData.time_slot) {
          // Robust regex to find the first time (HH:MM) and AM/PM anywhere in the slot
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
        }
        submitData.schedule_datetime = combined.toISOString();
      }
      await enhancedApiService.createJobCard(submitData, clientCheckStatus === 'found');
      navigate('/jobcards');
    } catch (err: any) {
      console.error('Submission error:', err);
      alert(err.message || 'Failed to create booking. Please check all fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10 h-full pb-10 relative">
      {/* Page Title Area (Simplified) */}
      <div className="flex items-center gap-3 px-4 py-4 -mx-4 sm:mx-0 mb-2">
        <button type="button" onClick={() => navigate('/jobcards')} className="p-1.5 hover:bg-white rounded border border-gray-200 transition-colors shadow-sm bg-white/50">
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none">New Booking</h1>
          <span className="text-[11px] font-bold text-gray-500 mt-1">Fill out the details below</span>
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
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    name="client_mobile"
                    type="tel"
                    value={formData.client_mobile}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    placeholder="9999999999"
                    className="pl-10 h-10 text-sm font-medium border-gray-300 rounded-lg shadow-sm focus:border-blue-500"
                    required
                  />
                </div>
                {errors.client_mobile && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.client_mobile}</p>}
                {clientCheckStatus === 'found' && <p className="text-[10px] text-green-600 font-bold mt-1 uppercase">Found: {foundClientName}</p>}
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Client Name *</label>
                <Input
                  name="client_name"
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => handleInputChange('client_name', e.target.value)}
                  placeholder="Enter Full Name"
                  className="h-10 text-sm font-medium border-gray-300 rounded-lg shadow-sm disabled:bg-gray-50 disabled:text-gray-500 uppercase"
                  disabled={clientCheckStatus === 'found'}
                  required
                />
                {errors.client_name && <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.client_name}</p>}
              </div>

              <div className="lg:col-span-2">
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Email Address</label>
                <Input
                  name="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => handleInputChange('client_email', e.target.value)}
                  placeholder="example@mail.com"
                  className="h-10 text-sm font-medium border-gray-300 rounded-lg shadow-sm bg-white"
                />
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Service State *</label>
                <select
                  value={formData.master_state || ''}
                  onChange={(e) => handleInputChange('master_state', Number(e.target.value))}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                  required
                >
                  <option value="">Select State</option>
                  {masterStates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Service City *</label>
                <select
                  value={formData.master_city || ''}
                  onChange={(e) => handleInputChange('master_city', Number(e.target.value))}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                  disabled={!formData.master_state}
                  required
                >
                  <option value="">Select City</option>
                  {masterCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Service Location *</label>
                <select
                  value={formData.master_location || ''}
                  onChange={(e) => handleInputChange('master_location', Number(e.target.value))}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                  disabled={!formData.master_city}
                  required
                >
                  <option value="">Select Location</option>
                  {masterLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
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
                  }}
                  className="w-full h-10 px-3 text-sm font-bold border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="home">Home (Residential)</option>
                  <option value="hotel">Hotel</option>
                  <option value="society">Society</option>
                  <option value="villa">Villa</option>
                  <option value="office">Office</option>
                  <option value="other">Other Commercial</option>
                </select>
              </div>

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
                          } else {
                            setSelectedServices([]);
                          }
                        }}
                        className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
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
                        className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
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
                        className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white disabled:bg-gray-50"
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
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Booking Type *</label>
                <select
                  value={formData.is_amc_main_booking ? 'amc_main' : formData.is_followup_visit ? 'amc_followup' : formData.is_complaint_call ? 'complaint' : 'new'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'amc_main') {
                      setFormData(prev => ({ 
                        ...prev, 
                        is_amc_main_booking: true, 
                        is_followup_visit: false, 
                        included_in_amc: false,
                        is_complaint_call: false,
                        service_category: 'AMC'
                      }));
                    } else if (val === 'amc_followup') {
                      setFormData(prev => ({ 
                        ...prev, 
                        is_amc_main_booking: false, 
                        is_followup_visit: true, 
                        included_in_amc: true,
                        is_complaint_call: false,
                        price: '0',
                        payment_status: 'Paid',
                        service_category: 'AMC'
                      }));
                    } else if (val === 'complaint') {
                      setFormData(prev => ({ 
                        ...prev, 
                        is_amc_main_booking: false, 
                        is_followup_visit: false, 
                        included_in_amc: false,
                        is_complaint_call: true,
                        price: '0',
                        payment_status: 'Paid'
                      }));
                    } else {
                      setFormData(prev => ({ 
                        ...prev, 
                        is_amc_main_booking: false, 
                        is_followup_visit: false, 
                        included_in_amc: false,
                        is_complaint_call: false
                      }));
                    }
                  }}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                  required
                >
                  <option value="new">New Booking</option>
                  <option value="amc_main">AMC Main Booking</option>
                  <option value="amc_followup">AMC Follow-up</option>
                  <option value="complaint">Complaint Call</option>
                </select>
              </div>
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
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-sm font-bold border-gray-300 rounded-lg outline-none text-blue-700 bg-white shadow-sm"
                    placeholder="0.00"
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
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Payment Status</label>
                <select
                  value={formData.payment_status}
                  onChange={(e) => handleInputChange('payment_status', e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none bg-white"
                >
                  {paymentStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Payment Mode</label>
                <select
                  value={formData.payment_mode || ''}
                  onChange={(e) => handleInputChange('payment_mode', e.target.value)}
                  className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none bg-white"
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
                  {referenceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
               className="w-full border border-gray-300 rounded-lg p-3 text-sm font-medium outline-none focus:border-blue-500 shadow-sm"
               placeholder="Enter any special instructions or customer preferences here..."
             />
          </div>

          {/* Action Footer (Non-Sticky) */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
             <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest hidden sm:block">All fields marked with * are required.</p>
             <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
               <button type="button" onClick={() => navigate('/jobcards')} className="flex-1 sm:flex-none h-10 px-5 text-[13px] font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">Discard</button>
               
               <button
                  type="button"
                  disabled={savingInquiry || submitting}
                  onClick={async () => {
                    if (!formData.client_mobile || !formData.client_name) {
                      alert('Please fill in Client Name and Mobile Number before saving as inquiry.');
                      return;
                    }
                    try {
                      setSavingInquiry(true);
                      const today = new Date().toISOString().split('T')[0];
                      const now   = new Date().toTimeString().slice(0, 5);
                      await enhancedApiService.createCRMInquiry({
                        name:         formData.client_name,
                        mobile:       formData.client_mobile,
                        location:     formData.client_address || formData.city + ', ' + formData.state,
                        pest_type:    formData.service_type   || 'Other',
                        remark:       formData.notes          || formData.client_notes || '',
                        inquiry_date: today,
                        inquiry_time: now,
                        status:       'New',
                        reminder_date: formData.reminder_date || undefined,
                        reminder_time: formData.reminder_time || undefined,
                        reminder_note: formData.reminder_note || undefined
                      } as any);
                      navigate('/crm-inquiries');
                    } catch (err: any) {
                      alert(err.message || 'Failed to save inquiry. Please try again.');
                    } finally {
                      setSavingInquiry(false);
                    }
                  }}
                  className="flex-1 sm:flex-none h-10 px-5 text-[13px] font-bold bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {savingInquiry ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-700" /> : <MessageCircle className="h-4 w-4" />}
                  Save as Inquiry
                </button>

               <button type="submit" disabled={submitting} className="flex-1 sm:flex-none h-10 px-8 text-[13px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all">
                 {submitting ? 'Creating...' : 'Create Booking'}
               </button>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateJobCard;

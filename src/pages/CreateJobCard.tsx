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
import type { JobCardFormData, State, City } from '../types';

import {
  SERVICE_PACKAGE_OPTIONS,
  computeMultiServicePricing,
  getAreaOptions,
  getDefaultPricingType,
  getSharedPricingTypes,
  type ServicePriceLine,
} from '../utils/jobCardPricing';
import { BOOKING_REFERENCE_OPTIONS } from '../constants/references';
import LocationSearchSelect from '../components/forms/LocationSearchSelect';
import GooglePlacesAddressInput from '../components/forms/GooglePlacesAddressInput';
import { applyGooglePlaceToJobForm } from '../utils/applyGooglePlaceToJobForm';
import {
  computeNextServiceDate,
  nextServiceDateHint,
  shouldShowNextServiceField,
} from '../utils/amcNextServiceDate';

const CreateJobCard: React.FC = () => {
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [savingInquiry, setSavingInquiry] = useState(false);
  
  // Pricing selector states
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [pricingArea, setPricingArea] = useState('');
  const [pricingType, setPricingType] = useState('');
  const [priceBreakdown, setPriceBreakdown] = useState<ServicePriceLine[]>([]);

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
      master_location: undefined,
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

  const availablePricingTypes = getSharedPricingTypes(selectedPackages);
  const availableAreas = getAreaOptions(selectedPackages);

  // Sync service_type from selected packages
  useEffect(() => {
    const label = selectedPackages.join(', ');
    setFormData((prev) => ({ ...prev, service_type: label }));
    if (label) validateField('service_type', label);
  }, [selectedPackages]);

  // When services change: default plan type and reset invalid area
  useEffect(() => {
    if (selectedPackages.length === 0) {
      setPricingType('');
      setPricingArea('');
      return;
    }
    const types = getSharedPricingTypes(selectedPackages);
    if (!pricingType || !types.includes(pricingType)) {
      setPricingType(getDefaultPricingType(selectedPackages));
    }
    const areas = getAreaOptions(selectedPackages);
    if (pricingArea && areas.length > 0 && !areas.includes(pricingArea)) {
      setPricingArea('');
    }
  }, [selectedPackages.join('|')]);

  useEffect(() => {
    if (pricingType === 'AMC 3 Services') {
      setFormData((prev) => ({ ...prev, service_category: 'AMC' }));
    } else if (pricingType) {
      setFormData((prev) => ({ ...prev, service_category: 'One-Time Service' }));
    }
  }, [pricingType]);

  // Multi-service total price
  useEffect(() => {
    if (
      formData.commercial_type === 'home' &&
      selectedPackages.length > 0 &&
      pricingArea &&
      pricingType
    ) {
      const { total, lines } = computeMultiServicePricing(
        selectedPackages,
        pricingType,
        pricingArea,
      );
      setPriceBreakdown(lines);
      setFormData((prev) => ({ ...prev, price: total.toFixed(2) }));
    } else if (formData.commercial_type === 'home') {
      setPriceBreakdown([]);
      setFormData((prev) => ({ ...prev, price: '0.00' }));
    }
  }, [selectedPackages, pricingArea, pricingType, formData.commercial_type]);

  // Client check state
  const [clientCheckStatus, setClientCheckStatus] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle');
  const [foundClientName, setFoundClientName] = useState<string>('');
  const [lastCheckedMobile, setLastCheckedMobile] = useState<string>('');



  // Master Location States
  const [masterStates, setMasterStates] = useState<State[]>([]);
  const [masterCities, setMasterCities] = useState<City[]>([]);

  const [isNextDateManual, setIsNextDateManual] = useState(false);

  // 1. Initial State Fetch
  useEffect(() => {
    enhancedApiService.getStates()
      .then(res => {
        setMasterStates(res.results);
        const maharashtra = res.results.find(s => s.name.toLowerCase() === 'maharashtra');
        if (maharashtra && !formData.master_state) {
          setFormData(prev => ({ ...prev, master_state: maharashtra.id, state: maharashtra.name }));
        }
      })
      .catch(err => console.error('Error fetching states:', err));
  }, []);

  // 2. Fetch Cities when State changes + Auto-select Mumbai
  useEffect(() => {
    if (formData.master_state) {
      enhancedApiService.getCities({ state: formData.master_state, page_size: 1000 })
        .then(res => {
          setMasterCities(res.results);
          
          // Auto-select Mumbai if this is Maharashtra and no city is selected
          const state = masterStates.find(s => s.id === formData.master_state);
          if (state?.name.toLowerCase() === 'maharashtra' && !formData.master_city) {
            const mumbai = res.results.find(c => c.name.toLowerCase() === 'mumbai');
            if (mumbai) {
              setFormData(prev => ({ ...prev, master_city: mumbai.id, city: mumbai.name }));
            }
          }

          // Reset city if not in results (unless it was just set by auto-select)
          setFormData(prev => {
            if (prev.master_city && res.results.some(c => c.id === prev.master_city)) return prev;
            // If we just auto-selected Mumbai in the block above, the state update is pending,
            // but for safety, we only reset if it's truly invalid.
            return prev; 
          });
        })
        .catch(err => console.error('Error fetching cities:', err));
    } else {
      setMasterCities([]);
    }
  }, [formData.master_state, masterStates.length]); // Added masterStates.length to ensure it runs after states are loaded

  // Auto-calculate next service date (AMC +4 months, Bed Bug +15 days)
  useEffect(() => {
    if (isNextDateManual) return;

    const nextDateStr = computeNextServiceDate({
      scheduleDate: formData.schedule_datetime,
      selectedPackages,
      pricingType,
      serviceCategory: formData.service_category,
    });

    if (nextDateStr) {
      setFormData((prev) =>
        prev.next_service_date === nextDateStr
          ? prev
          : { ...prev, next_service_date: nextDateStr },
      );
    } else if (!shouldShowNextServiceField(selectedPackages, pricingType, formData.service_category)) {
      setFormData((prev) =>
        prev.next_service_date === '' ? prev : { ...prev, next_service_date: '' },
      );
    }
  }, [
    selectedPackages,
    pricingType,
    formData.service_category,
    formData.schedule_datetime,
    isNextDateManual,
  ]);








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

    // Sync legacy fields if master fields are updated
    if (field === 'master_state') {
      const state = masterStates.find(s => s.id === value);
      if (state) {
        updatedFormData.state = state.name;
      }
    } else if (field === 'master_city') {
      const city = masterCities.find(c => c.id === value);
      if (city) {
        updatedFormData.city = city.name;
      }
    }

    setFormData(updatedFormData);
    clearError(field);
    
    return updatedFormData;
  };


  const toggleServicePackage = (service: string) => {
    setSelectedPackages((prev) => {
      const next = prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service];
      if (next.length === 0) {
        setPricingType('');
        setPricingArea('');
      } else {
        const types = getSharedPricingTypes(next);
        const currentTypeValid = pricingType && types.includes(pricingType);
        if (!currentTypeValid) {
          setPricingType(getDefaultPricingType(next));
        }
      }
      return next;
    });
  };

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
    if (selectedPackages.length === 0) {
      alert('Please select at least one service.');
      return;
    }
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
      if (!submitData.next_service_date && submitData.schedule_datetime) {
        const computed = computeNextServiceDate({
          scheduleDate: submitData.schedule_datetime,
          selectedPackages,
          pricingType,
          serviceCategory: submitData.service_category,
        });
        if (computed) submitData.next_service_date = computed;
      }
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
    } catch (err: unknown) {
      console.error('Submission error:', err);
      const apiErr = err as { message?: string; details?: Record<string, string[] | string> };
      let msg = apiErr.message || 'Failed to create booking. Please check all fields.';
      if (apiErr.details && typeof apiErr.details === 'object') {
        const lines = Object.entries(apiErr.details).map(([k, v]) => {
          const text = Array.isArray(v) ? v[0] : String(v);
          return `${k.replace(/_/g, ' ')}: ${text}`;
        });
        if (lines.length) msg = lines.join('\n');
      }
      alert(msg);
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
                <LocationSearchSelect
                  value={formData.master_location}
                  error={errors.master_location}
                  onChange={(locationId, cityId, stateId) => {
                    setFormData(prev => ({
                      ...prev,
                      master_location: locationId,
                      master_city: cityId || prev.master_city,
                      master_state: stateId || prev.master_state,
                    }));
                    clearError('master_location');
                    validateField('master_location', locationId);
                  }}
                />
                {errors.master_location && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.master_location}</p>
                )}
              </div>


              <div className="lg:col-span-4">
                <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Detailed Address *</label>
                <GooglePlacesAddressInput
                  id="client_address"
                  name="client_address"
                  value={formData.client_address}
                  onChange={(v) => handleInputChange('client_address', v)}
                  onPlaceSelect={async (place) => {
                    const { updates, cities } = await applyGooglePlaceToJobForm(
                      place,
                      masterStates,
                      (stateId) =>
                        enhancedApiService
                          .getCities({ state: stateId, page_size: 1000 })
                          .then((r) => r.results),
                    );
                    if (cities.length > 0) setMasterCities(cities);
                    setFormData((prev) => ({ ...prev, ...updates }));
                    clearError('client_address');
                  }}
                  error={errors.client_address}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section: Service Configuration & Pricing */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
             <div className="absolute inset-0 bg-blue-50/30 pointer-events-none" />
             <div className="relative z-10 flex flex-col lg:flex-row lg:items-start gap-6">
                <div className="flex-1 flex flex-col gap-4">
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
                        className="w-full max-w-xs h-10 px-3 text-sm font-bold border border-gray-200 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="home">Home (Residential)</option>
                        <option value="hotel">Hotel</option>
                        <option value="society">Society</option>
                        <option value="villa">Villa</option>
                        <option value="office">Office</option>
                        <option value="other">Other Commercial</option>
                      </select>
                   </div>

                  <div>
                    <label className="text-[13px] font-bold text-gray-700 mb-2 block">
                      Select Service * <span className="font-normal text-gray-500">(multi-select)</span>
                    </label>
                    <div className="rounded-lg border border-gray-200 bg-white p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SERVICE_PACKAGE_OPTIONS.map((service) => {
                        const checked = selectedPackages.includes(service);
                        return (
                          <label
                            key={service}
                            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                              checked
                                ? 'border-blue-500 bg-blue-50/80 ring-1 ring-blue-200'
                                : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={checked}
                              onChange={() => toggleServicePackage(service)}
                            />
                            <span className="text-sm font-semibold text-gray-800">{service}</span>
                          </label>
                        );
                      })}
                    </div>
                    {selectedPackages.length > 0 && (
                      <p className="text-[11px] font-bold text-blue-700 mt-2">
                        Selected: {selectedPackages.join(' + ')}
                      </p>
                    )}
                    {errors.service_type && (
                      <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">{errors.service_type}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Select Type *</label>
                      <select
                        value={pricingType}
                        onChange={(e) => setPricingType(e.target.value)}
                        className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white disabled:bg-gray-50"
                        required
                        disabled={selectedPackages.length === 0}
                      >
                        <option value="">Select Type</option>
                        {availablePricingTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                   </div>
                   <div>
                      <label className="text-[13px] font-bold text-gray-700 mb-1.5 block">Select Area *</label>
                      <select
                        value={pricingArea}
                        onChange={(e) => {
                          setPricingArea(e.target.value);
                          if (['1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK'].includes(e.target.value)) {
                            handleInputChange('bhk_size', e.target.value);
                          } else {
                            handleInputChange('bhk_size', '');
                          }
                        }}
                        className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg shadow-sm outline-none focus:border-blue-500 bg-white disabled:bg-gray-50"
                        required
                        disabled={selectedPackages.length === 0}
                      >
                        <option value="">Select Area</option>
                        {availableAreas.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                   </div>
                  </div>
                </div>

                <div className="flex flex-col items-start lg:items-end justify-start min-w-[200px] lg:max-w-[240px] pl-0 lg:pl-4 lg:border-l border-gray-200">
                   <span className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                     {formData.commercial_type === 'home' ? 'Total Price' : 'Estimated Price'}
                   </span>
                   {formData.commercial_type === 'home' ? (
                     <>
                     <div className="text-4xl font-black text-gray-900 flex items-center">
                        <span className="text-2xl mr-1 text-gray-400">₹</span>
                        {formData.price}
                     </div>
                     {priceBreakdown.length > 0 && (
                       <div className="mt-3 w-full rounded-lg border border-blue-100 bg-white/90 p-3 text-left">
                         <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider mb-2">
                           Add-on services in this price
                         </p>
                         <ul className="space-y-1.5">
                           {priceBreakdown.map((line) => (
                             <li key={line.service} className="flex justify-between gap-2 text-xs">
                               <span className="font-semibold text-gray-700 shrink min-w-0">
                                 {line.service}
                                 {line.note && (
                                   <span className="block text-[10px] font-normal text-amber-700">{line.note}</span>
                                 )}
                               </span>
                               <span className="font-bold text-gray-900 tabular-nums shrink-0">
                                 {line.price > 0 ? `₹${line.price}` : '—'}
                               </span>
                             </li>
                           ))}
                         </ul>
                         <div className="mt-2 pt-2 border-t border-blue-100 flex justify-between text-xs font-black text-blue-900">
                           <span>Total</span>
                           <span>₹{formData.price}</span>
                         </div>
                       </div>
                     )}
                     </>
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
              {shouldShowNextServiceField(
                selectedPackages,
                pricingType,
                formData.service_category,
              ) && (
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
                    {nextServiceDateHint(selectedPackages, pricingType, formData.service_category)}
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
                  name="reference"
                  value={formData.reference}
                  onChange={(e) => {
                    const value = e.target.value;
                    handleInputChange('reference', value);
                    validateField('reference', value);
                  }}
                  className={`w-full h-10 px-3 text-sm font-medium border rounded-lg shadow-sm outline-none bg-white ${errors.reference ? 'border-red-500' : 'border-gray-300'}`}
                  required
                >
                  <option value="">Select Reference</option>
                  {BOOKING_REFERENCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
                      const bhkLabel = formData.bhk_size || pricingArea || '';
                      const addressBase = formData.client_address || `${formData.city}, ${formData.state}`;
                      await enhancedApiService.createCRMInquiry({
                        name:         formData.client_name,
                        mobile:       formData.client_mobile,
                        location:     bhkLabel
                          ? `${addressBase} · ${bhkLabel}`
                          : addressBase,
                        pest_type:    formData.service_type   || selectedPackages.join(', ') || 'Other',
                        service_frequency: formData.service_category === 'AMC' ? 'amc' : 'one-time',
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

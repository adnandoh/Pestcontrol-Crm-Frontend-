import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  IndianRupee,
  Calendar,
  MessageCircle
} from 'lucide-react';

import {
  Card,
  Input,
  ClockTimePicker,
} from '../components/ui';

import { useFormValidation, jobCardValidationRules } from '../hooks/useFormValidation';
import { enhancedApiService } from '../services/api.enhanced';
import type { JobCardFormData, Technician } from '../types';

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
      service_category: 'One-Time Service',
      property_type: 'Home / Flat',
      bhk_size: '',
      is_paused: false,
      service_type: '',
      schedule_date: '',
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
      extra_notes: ''
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

  // Grouped service type options
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

  // Locations data
  const [locations, setLocations] = useState<Record<string, string[]>>({});

  // Technician data
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const data = await enhancedApiService.getLocations();
        setLocations(data);
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      }
    };
    
    const fetchTechs = async () => {
       try {
         const data = await enhancedApiService.getActiveTechnicians();
         setTechnicians(data || []);
       } catch (err) {
         console.error('Failed to fetch techs:', err);
       }
    };

    fetchLocations();
    fetchTechs();
  }, []);

  const stateOptions = Object.keys(locations).map(state => ({ value: state, label: state }));
  const jobCityOptions = formData.state ? locations[formData.state]?.map(city => ({ value: city, label: city })) || [] : [];




  // Job status options
  const jobStatusOptions = [
    'Pending',
    'On Process',
    'Done'
  ];

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
      setTimeout(() => { scrollToFirstError(); }, 100);
      return;
    }
    try {
      setSubmitting(true);
      await enhancedApiService.createJobCard(formData, clientCheckStatus === 'found');
      navigate('/jobcards');
    } catch (err: any) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10 h-full">
      {/* Header Area */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/jobcards')} className="p-1.5 hover:bg-white rounded border border-gray-200 transition-colors shadow-sm">
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </button>
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight uppercase italic">Booking Form</h1>
        </div>
      </div>

      {/* Main Form Area */}
      <Card className="border-gray-200 shadow-xs overflow-hidden">
        <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
          
          {/* Section: Client & Location */}
          <div className="p-4 bg-white/50">
            <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User className="h-3 w-3" /> Client & Service Location
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input
                    name="client_mobile"
                    type="tel"
                    value={formData.client_mobile}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    placeholder="9999999999"
                    className="pl-8 h-8 text-xs font-bold border-gray-300 rounded focus:border-blue-500"
                    required
                  />
                </div>
                {errors.client_mobile && <p className="text-[9px] text-red-500 font-bold mt-0.5 uppercase">{errors.client_mobile}</p>}
                {clientCheckStatus === 'found' && <p className="text-[9px] text-green-600 font-bold mt-0.5 uppercase">Found: {foundClientName}</p>}
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Client Name *</label>
                <Input
                  name="client_name"
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => handleInputChange('client_name', e.target.value)}
                  placeholder="Enter Full Name"
                  className="h-8 text-xs font-bold border-gray-300 rounded disabled:bg-gray-50 uppercase"
                  disabled={clientCheckStatus === 'found'}
                  required
                />
                {errors.client_name && <p className="text-[9px] text-red-500 font-bold mt-0.5 uppercase">{errors.client_name}</p>}
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Email Address</label>
                <Input
                  name="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => handleInputChange('client_email', e.target.value)}
                  placeholder="example@mail.com"
                  className="h-8 text-xs font-bold border-gray-300 rounded bg-white"
                />
              </div>


              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Service State *</label>
                <select
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full h-8 px-2 text-xs font-bold border border-gray-300 rounded outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select State</option>
                  {stateOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Service City *</label>
                <select
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full h-8 px-2 text-xs font-bold border border-gray-300 rounded outline-none focus:border-blue-500 bg-white"
                  disabled={!formData.state}
                >
                  <option value="">Select City</option>
                  {jobCityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Detailed Address *</label>
                <Input
                  name="client_address"
                  value={formData.client_address}
                  onChange={(e) => handleInputChange('client_address', e.target.value)}
                  placeholder="Flat No, Building Name, Landmark, Area..."
                  className="h-8 text-xs font-medium border-gray-300 rounded"
                  required
                />
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
                          } else {
                            setSelectedServices([]);
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


          {/* Section: Schedule & Assignment */}
          <div className="p-5 bg-gray-50/30">
            <h4 className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" /> Schedule & Assignment
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1.5 block uppercase tracking-tight">Schedule Date *</label>
                <Input
                  type="date"
                  value={formData.schedule_date}
                  onChange={(e) => handleInputChange('schedule_date', e.target.value)}
                  className="w-full h-10 px-3 text-xs font-bold border-gray-200 rounded-lg shadow-sm"
                  required
                />
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
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-sm font-black border border-gray-200 rounded-lg outline-none text-blue-700 bg-white shadow-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1.5 block uppercase">Assigned Technician</label>
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
            </div>
          </div>
          {/* Section: Additional Details */}
          <div className="p-5 bg-white border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">Payment Status</label>
                <select
                  value={formData.payment_status}
                  onChange={(e) => handleInputChange('payment_status', e.target.value)}
                  className="w-full h-8 px-2 text-xs font-bold border border-gray-300 rounded outline-none bg-white"
                >
                  {paymentStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Reference</label>
                <select
                  value={formData.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  className="w-full h-8 px-2 text-xs font-bold border border-gray-300 rounded outline-none bg-white"
                >
                  <option value="">None</option>
                  {referenceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase text-rose-500">Booking Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full h-8 px-2 text-xs font-extrabold border border-gray-300 rounded outline-none bg-white text-rose-600 uppercase"
                >
                  {jobStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Section: Notes */}
          <div className="p-4">
             <label className="text-[10px] font-extrabold text-gray-400 mb-2 block uppercase">Additional Internal Notes</label>
             <textarea
               value={formData.notes || ''}
               onChange={(e) => handleInputChange('notes', e.target.value)}
               rows={2}
               className="w-full border border-gray-300 rounded p-2 text-xs font-medium outline-none focus:border-blue-500"
               placeholder="Enter any special instructions or customer preferences here..."
             />
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-gray-50 flex items-center justify-between">
             <div className="hidden sm:block">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic">All Starred (*) fields are mandatory. Data auto-saves.</p>
             </div>
             <div className="flex gap-2 w-full sm:w-auto">
                <button type="button" onClick={() => navigate('/jobcards')} className="flex-1 sm:flex-none px-6 h-8 text-[11px] font-extrabold bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-100 transition-all uppercase">Discard</button>
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
                        status:       'New'
                      } as any);
                      navigate('/crm-inquiries');
                    } catch (err: any) {
                      alert(err.message || 'Failed to save inquiry. Please try again.');
                    } finally {
                      setSavingInquiry(false);
                    }
                  }}
                  className="flex-1 sm:flex-none px-5 h-8 text-[11px] font-extrabold bg-amber-500 text-white rounded hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all uppercase flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {savingInquiry ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <MessageCircle className="h-3 w-3" />}
                  Inquiry
                </button>
                 <button type="submit" disabled={submitting} className="flex-1 sm:flex-none px-8 h-8 text-[11px] font-extrabold bg-blue-700 text-white rounded hover:bg-blue-800 shadow-lg shadow-blue-200 transition-all uppercase flex items-center justify-center gap-2">
                  {submitting ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <Save className="h-3 w-3" />}
                  CREATE BOOKING
                </button>
             </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateJobCard;

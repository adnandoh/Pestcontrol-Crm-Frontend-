import { cn as utils_cn } from '../utils/cn';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  Settings,
  IndianRupee,
  Calendar,
  ShieldCheck,
  Zap,
  Target,
  Users
} from 'lucide-react';
import {
  Button,
  Card,
  Input,
} from '../components/ui';
import { useFormValidation, jobCardValidationRules } from '../hooks/useFormValidation';
import { enhancedApiService } from '../services/api.enhanced';
import type { JobCardFormData, Technician } from '../types';

const CreateJobCard: React.FC = () => {
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      contract_duration: '',
      notes: '',
      extra_notes: ''
    };
  };

  const [formData, setFormData] = useState<JobCardFormData>(getInitialFormData());

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
  const [selectAll, setSelectAll] = useState(false);

  // Client check state
  const [clientCheckStatus, setClientCheckStatus] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle');
  const [clientCheckError, setClientCheckError] = useState<string | null>(null);
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

  // Service Category options
  const serviceCategoryOptions = [
    { value: 'One-Time Service', label: 'One-Time Service' },
    { value: 'AMC', label: 'AMC (Annual Maintenance Contract)' }
  ];

  // Property Type options
  const propertyTypeOptions = [
    { value: 'Home / Flat', label: 'Home / Flat' },
    { value: 'Bungalow', label: 'Bungalow' },
    { value: 'Hotel', label: 'Hotel' },
    { value: 'Office', label: 'Office' },
    { value: 'Commercial Space', label: 'Commercial Space' }
  ];

  // BHK Size options and prices
  const bhkOptions = [
    { value: '1 RK', label: '1 RK - ₹1800', price: '1800' },
    { value: '1 BHK', label: '1 BHK - ₹2200', price: '2200' },
    { value: '2 BHK', label: '2 BHK - ₹2500', price: '2500' },
    { value: '3 BHK', label: '3 BHK - ₹3000', price: '3000' },
    { value: '4 BHK', label: '4 BHK - ₹3500', price: '3500' }
  ];

  // Time Slot options
  const timeSlotOptions = [
    '8am–10am',
    '10am–12pm',
    '12pm–2pm',
    '2pm–4pm',
    '4pm–6pm',
    '6pm–8pm'
  ];

  // Job status options
  const jobStatusOptions = [
    'Pending',
    'Confirmed',
    'Completed',
    'Cancelled',
    'Hold',
    'Inactive'
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

  // Contract duration options
  const contractDurationOptions = [
    { value: '3', label: '3 Months' },
    { value: '6', label: '6 Months' },
    { value: '12', label: '1 Year' }
  ];

  // Handle input changes with localStorage persistence and validation
  const handleInputChange = (field: keyof JobCardFormData, value: any) => {
    let updatedFormData = {
      ...formData,
      [field]: value
    };

    // Auto-fill price if BHK size is selected
    if (field === 'bhk_size' && value) {
      const selectedBhk = bhkOptions.find(opt => opt.value === value);
      if (selectedBhk) {
        updatedFormData.price = selectedBhk.price;
      }
    }

    // Clear BHK size if property type changes from Home / Flat
    if (field === 'property_type' && value !== 'Home / Flat') {
      updatedFormData.bhk_size = '';
    }

    setFormData(updatedFormData);
    clearError(field);
    
    return updatedFormData;
  };

  // Handle field validation on blur
  const handleFieldValidation = (field: keyof JobCardFormData, value: any) => {
    validateField(field, value);
  };

  // Handle service type selection
  const handleServiceTypeChange = (service: string, checked: boolean) => {
    if (checked) {
      setSelectedServices(prev => [...prev, service]);
    } else {
      setSelectedServices(prev => prev.filter(s => s !== service));
      setSelectAll(false);
    }
  };

  // Handle select all services
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedServices([...serviceTypeOptions]);
    } else {
      setSelectedServices([]);
    }
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
      setClientCheckErrorState('Unable to check client.');
    }
  };

  const setClientCheckFound = (clientName: string) => {
    setClientCheckStatus('found');
    setFoundClientName(clientName);
  };

  const setClientCheckNotFound = () => {
    setClientCheckStatus('not-found');
  };

  const setClientCheckErrorState = (err: string) => {
    setClientCheckStatus('error');
    setClientCheckError(err);
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
      setError(null);
      await enhancedApiService.createJobCard(formData, clientCheckStatus === 'found');
      navigate('/jobcards');
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
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
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">City *</label>
                <Input
                   name="client_city"
                   value={formData.client_city}
                   onChange={(e) => handleInputChange('client_city', e.target.value)}
                   placeholder="Client City"
                   className="h-8 text-xs font-bold border-gray-300 rounded uppercase"
                   required
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

          {/* Section: Service Configuration */}
          <div className="p-4 bg-[#fcfcfc]">
            <h4 className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings className="h-3 w-3" /> Service Configuration
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Job Class</label>
                <select
                  value={formData.job_type}
                  onChange={(e) => handleInputChange('job_type', e.target.value)}
                  className="w-full h-8 px-2 text-xs font-bold border border-gray-300 rounded outline-none bg-white"
                >
                  <option value="Customer">Regular Customer</option>
                  <option value="Society">Building / Society</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Service Category</label>
                <select
                  value={formData.service_category}
                  onChange={(e) => handleInputChange('service_category', e.target.value)}
                  className="w-full h-8 px-2 text-xs font-bold border border-gray-300 rounded outline-none bg-white"
                >
                  {serviceCategoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Property Type</label>
                <select
                  value={formData.property_type}
                  onChange={(e) => handleInputChange('property_type', e.target.value)}
                  className="w-full h-8 px-2 text-xs font-bold border border-gray-300 rounded outline-none bg-white"
                >
                   <option value="">Select Type</option>
                   {propertyTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              {formData.property_type === 'Home / Flat' && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">BHK Size</label>
                  <select
                    value={formData.bhk_size}
                    onChange={(e) => handleInputChange('bhk_size', e.target.value)}
                    className="w-full h-8 px-2 text-xs font-bold border border-gray-300 rounded outline-none bg-white"
                  >
                    <option value="">Select Size</option>
                    {bhkOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              )}

              {formData.job_type === 'Society' && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Contract Duration</label>
                  <select
                    value={formData.contract_duration}
                    onChange={(e) => handleInputChange('contract_duration', e.target.value)}
                    className="w-full h-8 px-2 text-xs font-bold border border-gray-300 rounded outline-none bg-white"
                  >
                    <option value="">Select Duration</option>
                    {contractDurationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section: Service Pest Types */}
          <div className="p-5 bg-white">
            <div className="flex items-center justify-between mb-5">
                <h4 className="text-xs font-extrabold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Select Service Pest Types *
                </h4>
                <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="selectAll" 
                      checked={selectAll}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-3.5 w-3.5 text-blue-600 rounded cursor-pointer"
                    />
                    <label htmlFor="selectAll" className="text-[11px] font-extrabold text-gray-500 uppercase cursor-pointer">Select All Pests</label>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {serviceTypeCategories.map((category, idx) => (
                  <div key={category.name} className={utils_cn("rounded-xl p-4 border", idx === 0 ? "bg-emerald-50/30 border-emerald-100" : "bg-indigo-50/30 border-indigo-100")}>
                    <h5 className={utils_cn("text-[11px] font-extrabold uppercase tracking-wide mb-3 pb-2 border-b flex items-center gap-1.5", idx === 0 ? "text-emerald-700 border-emerald-100" : "text-indigo-700 border-indigo-100")}>
                       {idx === 0 ? <Zap className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />} {category.name} Range
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2.5">
                       {category.options.map(pest => (
                         <div key={pest} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`pest-${pest}`}
                              checked={selectedServices.includes(pest)}
                              onChange={(e) => handleServiceTypeChange(pest, e.target.checked)}
                              className={utils_cn("h-4 w-4 rounded cursor-pointer", idx === 0 ? "text-emerald-600" : "text-indigo-600")}
                            />
                            <label htmlFor={`pest-${pest}`} className="text-xs font-bold text-gray-700 cursor-pointer truncate uppercase tracking-tight">{pest}</label>
                         </div>
                       ))}
                    </div>
                  </div>
                ))}
            </div>
            {errors.service_type && <p className="text-[9px] text-red-500 font-bold mt-2 uppercase">{errors.service_type}</p>}
          </div>

          {/* Section: Schedule & Assignment */}
          <div className="p-4 bg-gray-50/50">
            <h4 className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Calendar className="h-3 w-3" /> Schedule & Assignment
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Schedule Date *</label>
                <Input
                  type="date"
                  value={formData.schedule_date}
                  onChange={(e) => handleInputChange('schedule_date', e.target.value)}
                  className="w-full h-8 px-2 text-xs font-bold border border-gray-300 rounded outline-none"
                  required
                />
                {errors.schedule_date && <p className="text-[9px] text-red-500 font-bold mt-0.5 uppercase">{errors.schedule_date}</p>}
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase tracking-tighter">Available Time Slot</label>
                <select
                  value={formData.time_slot}
                  onChange={(e) => handleInputChange('time_slot', e.target.value)}
                  className="w-full h-8 px-2 text-xs font-bold border border-gray-300 rounded outline-none bg-white"
                >
                  <option value="">Select Slot</option>
                  {timeSlotOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Service Price *</label>
                <div className="relative">
                  <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    className="w-full h-8 pl-6 pr-2 text-xs font-extrabold border border-gray-300 rounded outline-none text-blue-800"
                    placeholder="0.00"
                    required
                  />
                </div>
                {errors.price && <p className="text-[9px] text-red-500 font-bold mt-0.5 uppercase">{errors.price}</p>}
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Assigned Technician</label>
                <div className="relative">
                  <Users className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <select
                    value={formData.technician || ''}
                    onChange={(e) => {
                      const techId = e.target.value;
                      const tech = technicians.find(t => t.id.toString() === techId);
                      handleInputChange('technician', techId ? parseInt(techId) : null);
                      handleInputChange('assigned_to', tech ? tech.name : '');
                    }}
                    className="w-full h-8 pl-8 pr-2 text-xs font-bold border border-gray-300 rounded outline-none bg-white"
                  >
                    <option value="">Select Technician</option>
                    {technicians.map(tech => (
                      <option key={tech.id} value={tech.id}>{tech.name}</option>
                    ))}
                  </select>
                </div>
              </div>

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

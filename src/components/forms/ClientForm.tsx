import React, { useState, useEffect } from 'react';
import { Save, X, Users } from 'lucide-react';
import { Button, Input } from '../ui';
import { enhancedApiService } from '../../services/api.enhanced';
import { cn } from '../../utils/cn';
import type { Client, ClientFormData } from '../../types';

interface ClientFormProps {
  client?: Client;
  onSave: (client: Client) => void;
  onCancel: () => void;
  isOpen: boolean;
}

interface FormErrors {
  full_name?: string;
  mobile?: string;
  email?: string;
  city?: string;
  address?: string;
  flat_number?: string;
  building_name?: string;
  landmark?: string;
  area?: string;
  notes?: string;
}

const ClientForm: React.FC<ClientFormProps> = ({
  client,
  onSave,
  onCancel,
  isOpen
}) => {
  const [formData, setFormData] = useState<ClientFormData>({
    full_name: '',
    mobile: '',
    email: '',
    city: '',
    address: '',
    flat_number: '',
    building_name: '',
    landmark: '',
    area: '',
    notes: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [mobileExists, setMobileExists] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (client) {
      setFormData({
        full_name: client.full_name,
        mobile: client.mobile,
        email: client.email || '',
        city: client.city || '',
        address: client.address || '',
        flat_number: client.flat_number || '',
        building_name: client.building_name || '',
        landmark: client.landmark || '',
        area: client.area || '',
        notes: client.notes || ''
      });
    } else {
      setFormData({
        full_name: '',
        mobile: '',
        email: '',
        city: '',
        address: '',
        flat_number: '',
        building_name: '',
        landmark: '',
        area: '',
        notes: ''
      });
    }
    setErrors({});
    setMobileExists(false);
  }, [client, isOpen]);

  // Handle input change
  const handleChange = (field: keyof ClientFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Check mobile uniqueness (debounced)
    if (field === 'mobile' && value.length === 10 && (!client || client.mobile !== value)) {
      checkMobileExists(value);
    }
  };

  // Check if mobile number already exists
  const checkMobileExists = async (mobile: string) => {
    try {
      const response = await enhancedApiService.checkClientExists(mobile);
      setMobileExists(response.exists);
    } catch (error) {
      console.error('Error checking mobile:', error);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Full name validation
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters';
    }

    // Mobile validation
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(formData.mobile.trim())) {
      newErrors.mobile = 'Mobile number must be exactly 10 digits';
    } else if (mobileExists) {
      newErrors.mobile = 'This mobile number is already registered';
    }

    // Email validation (optional)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let savedClient: Client;
      
      if (client) {
        // Update existing client
        savedClient = await enhancedApiService.updateClient(client.id, formData);
      } else {
        // Create new client
        savedClient = await enhancedApiService.createClient(formData);
      }

      onSave(savedClient);
    } catch (error: any) {
      console.error('Error saving client:', error);
      
      // Handle validation errors from server
      if (error.details && typeof error.details === 'object') {
        const serverErrors: FormErrors = {};
        Object.keys(error.details).forEach(key => {
          if (error.details[key] && Array.isArray(error.details[key])) {
            serverErrors[key as keyof FormErrors] = error.details[key][0];
          }
        });
        setErrors(serverErrors);
      } else {
        alert('Failed to save client: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 font-roboto">
        {/* Header Area */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur sticky top-0 z-10">
          <div className="flex flex-col">
            <h2 className="text-xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2 uppercase italic leading-none">
               <Users className="h-5 w-5 text-blue-600" />
              {client ? 'Edit Client Profile' : 'Initialize New Client'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest italic opacity-70">
              Database Entry Module // Standard CRM Protocol
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors group"
          >
            <X className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50/5">
          <form id="client-form" onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Core Profile Identity */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                 <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2 whitespace-nowrap">
                   Identity & Contact
                 </h4>
                 <div className="h-[1px] w-full bg-blue-100" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight block ml-0.5">
                    Full Entity Name *
                  </label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="ENTER FULL NAME"
                    className={cn("h-9 text-xs font-bold uppercase border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-lg", errors.full_name && "border-red-500")}
                    required
                  />
                  {errors.full_name && (
                    <p className="text-red-600 text-[9px] font-bold mt-0.5 uppercase italic">{errors.full_name}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight block ml-0.5">
                    Direct Mobile *
                  </label>
                  <div className="relative">
                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">+91</span>
                     <Input
                        value={formData.mobile}
                        onChange={(e) => handleChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-DIGIT NUMBER"
                        className={cn("h-9 pl-10 text-xs font-bold border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-lg", errors.mobile && "border-red-500")}
                        required
                     />
                  </div>
                  {errors.mobile ? (
                    <p className="text-red-600 text-[9px] font-bold mt-0.5 uppercase italic">{errors.mobile}</p>
                  ) : mobileExists ? (
                    <p className="text-orange-600 text-[9px] font-bold mt-0.5 uppercase italic">
                      Duplicate Record Detected
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight block ml-0.5">
                    Electronic Mail repository
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="CUSTOMER@DOMAIN.COM"
                    className="h-9 text-xs font-bold border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 rounded-lg lowercase italic"
                  />
                  {errors.email && (
                    <p className="text-red-600 text-[9px] font-bold mt-0.5 uppercase italic">{errors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Service Area Logistics */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                 <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 whitespace-nowrap">
                   Field Logistics
                 </h4>
                 <div className="h-[1px] w-full bg-indigo-100" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight block ml-0.5">
                    Unit / Shop No.
                  </label>
                  <Input
                    value={formData.flat_number}
                    onChange={(e) => handleChange('flat_number', e.target.value)}
                    placeholder="E.G. B-402"
                    className="h-9 text-xs font-bold border-gray-300 uppercase italic rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight block ml-0.5">
                    Building / Premise
                  </label>
                  <Input
                    value={formData.building_name}
                    onChange={(e) => handleChange('building_name', e.target.value)}
                    placeholder="E.G. STERLING HEIGHTS"
                    className="h-9 text-xs font-bold border-gray-300 uppercase italic rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight block ml-0.5">
                    Sector / Area
                  </label>
                  <Input
                    value={formData.area}
                    onChange={(e) => handleChange('area', e.target.value)}
                    placeholder="E.G. MIRA ROAD EAST"
                    className="h-9 text-xs font-bold border-gray-300 uppercase italic rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight block ml-0.5">
                    City Jurisdiction
                  </label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="E.G. MUMBAI"
                    className="h-9 text-xs font-black border-gray-300 uppercase rounded-lg bg-gray-50/50"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight block ml-0.5">
                    Key Landmark Ref.
                  </label>
                  <Input
                    value={formData.landmark}
                    onChange={(e) => handleChange('landmark', e.target.value)}
                    placeholder="E.G. NEXT TO METRO STATION"
                    className="h-9 text-xs font-bold border-gray-300 uppercase italic rounded-lg"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight block ml-0.5">
                    Detailed Master Address
                  </label>
                  <Input
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="FULL OVERFLOW ADDRESS DATA..."
                    className="h-9 text-[11px] font-bold border-gray-300 uppercase italic rounded-lg shadow-inner bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 3. Internal Intelligence */}
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                 <h4 className="text-[11px] font-black text-amber-600 uppercase tracking-[0.2em] flex items-center gap-2 whitespace-nowrap">
                   Internal Intel
                 </h4>
                 <div className="h-[1px] w-full bg-amber-100" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-tight block ml-0.5">
                  Strategic Client Preferences & Remarks
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="ADD CRITICAL NOTES FOR OPERATIONS..."
                  rows={2}
                  className="w-full px-4 py-2.5 text-[11px] font-bold border border-gray-200 rounded-xl uppercase italic focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:italic bg-white shadow-sm"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between sticky bottom-0 z-10">
           <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest hidden sm:block">
              All interactions are logged in standard security protocol
           </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 sm:flex-none h-9 text-[11px] font-black uppercase px-8 border-gray-200 rounded-full hover:bg-gray-50 transition-all text-gray-500"
            >
              Discard
            </Button>
            <Button
              form="client-form"
              type="submit"
              disabled={loading || mobileExists}
              className="flex-1 sm:flex-none h-9 text-[11px] font-black bg-blue-700 hover:bg-blue-800 shadow-xl shadow-blue-200 px-10 rounded-full uppercase tracking-widest flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {client ? 'CONFIRM UPDATE' : 'INITIALIZE PROFILE'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientForm;
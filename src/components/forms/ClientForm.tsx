import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Button, Input } from '../ui';
import { enhancedApiService } from '../../services/api.enhanced';
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
    if (errors[field]) {
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
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 font-roboto">
        {/* Header Area */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex flex-col">
            <h2 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase leading-none">
              {client ? 'Edit Client Profile' : 'Initialize New Client'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
              Standard CRM Profile Protocol
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors group"
          >
            <X className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-gray-50/10">
          <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Core Profile Identity */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-1 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                Core Identity & Contact
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tight block ml-0.5">
                    Full Entity Name *
                  </label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="ENTER FULL NAME"
                    className={cn("h-8 text-xs font-bold uppercase border-gray-300 focus:border-blue-500 rounded", errors.full_name && "border-red-500")}
                    required
                  />
                  {errors.full_name && (
                    <p className="text-red-600 text-[9px] font-bold mt-0.5 uppercase italic">{errors.full_name}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tight block ml-0.5">
                    Direct Mobile *
                  </label>
                  <Input
                    value={formData.mobile}
                    onChange={(e) => handleChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-DIGIT NUMBER"
                    className={cn("h-8 text-xs font-bold border-gray-300 focus:border-blue-500 rounded", errors.mobile && "border-red-500")}
                    required
                  />
                  {errors.mobile ? (
                    <p className="text-red-600 text-[9px] font-bold mt-0.5 uppercase italic">{errors.mobile}</p>
                  ) : mobileExists ? (
                    <p className="text-orange-600 text-[9px] font-bold mt-0.5 uppercase italic">
                      Duplicate Record Detected
                    </p>
                  ) : null}
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tight block ml-0.5">
                    Electronic Mail Repository
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="CUSTOMER@DOMAIN.COM"
                    className="h-8 text-xs font-bold border-gray-300 focus:border-blue-500 rounded lowercase"
                  />
                  {errors.email && (
                    <p className="text-red-600 text-[9px] font-bold mt-0.5 uppercase italic">{errors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Service Area Logistics */}
            <div className="space-y-4 pt-2">
              <h4 className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest border-b border-indigo-50 pb-1 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                Logistics & Service Location
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tight block ml-0.5">
                    Unit / Shop No.
                  </label>
                  <Input
                    value={formData.flat_number}
                    onChange={(e) => handleChange('flat_number', e.target.value)}
                    placeholder="E.G. B-402"
                    className="h-8 text-xs font-bold border-gray-300 uppercase italic rounded"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tight block ml-0.5">
                    Building / Premise
                  </label>
                  <Input
                    value={formData.building_name}
                    onChange={(e) => handleChange('building_name', e.target.value)}
                    placeholder="E.G. STERLING HEIGHTS"
                    className="h-8 text-xs font-bold border-gray-300 uppercase italic rounded"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tight block ml-0.5">
                    Key Landmark
                  </label>
                  <Input
                    value={formData.landmark}
                    onChange={(e) => handleChange('landmark', e.target.value)}
                    placeholder="E.G. NEAR HDFC BANK"
                    className="h-8 text-xs font-bold border-gray-300 uppercase italic rounded"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tight block ml-0.5">
                    Sector / Area
                  </label>
                  <Input
                    value={formData.area}
                    onChange={(e) => handleChange('area', e.target.value)}
                    placeholder="E.G. MIRA ROAD EAST"
                    className="h-8 text-xs font-bold border-gray-300 uppercase italic rounded"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tight block ml-0.5">
                    Main City Jurisdiction
                  </label>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="E.G. THANE"
                    className="h-8 text-xs font-black border-gray-300 uppercase rounded bg-gray-50/30"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tight block ml-0.5">
                    Legacy Address Data (Overflow)
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="FULL OVERFLOW ADDRESS..."
                    rows={2}
                    className="w-full px-3 py-1.5 text-[11px] font-bold border border-gray-300 rounded uppercase focus:border-blue-500 outline-none transition-all bg-white shadow-inner"
                  />
                </div>
              </div>
            </div>

            {/* 3. Internal Intelligence */}
            <div className="space-y-4 pt-2">
              <h4 className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest border-b border-amber-50 pb-1 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-600 rounded-full"></span>
                Internal Remarks & Intelligence
              </h4>
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-tight block ml-0.5">
                  Strategic Client Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="ADD CRITICAL CLIENT PREFERENCES..."
                  rows={2}
                  className="w-full px-3 py-1.5 text-[11px] font-medium border border-gray-300 rounded uppercase italic focus:border-blue-500 outline-none transition-all placeholder:italic bg-white shadow-inner"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 sticky bottom-0 z-10">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="h-8 text-[11px] font-extrabold uppercase px-6 border-gray-300 hover:bg-white"
          >
            Cancel
          </Button>
          <Button
            form="client-form"
            type="submit"
            disabled={loading || mobileExists}
            className="h-8 text-[11px] font-extrabold bg-blue-700 hover:bg-blue-800 shadow-lg px-8 uppercase tracking-wider flex items-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {client ? 'Update Record' : 'Save Profile'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientForm;
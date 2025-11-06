import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../ui';
import { enhancedApiService } from '../../services/api.enhanced';
import { Client, ClientFormData } from '../../types';

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
        notes: client.notes || ''
      });
    } else {
      setFormData({
        full_name: '',
        mobile: '',
        email: '',
        city: '',
        address: '',
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {client ? 'Edit Client' : 'Add New Client'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <Input
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                placeholder="Enter client's full name"
                error={errors.full_name}
                required
              />
              {errors.full_name && (
                <p className="text-red-600 text-sm mt-1">{errors.full_name}</p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number *
              </label>
              <Input
                value={formData.mobile}
                onChange={(e) => handleChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit mobile number"
                error={errors.mobile}
                required
              />
              {errors.mobile && (
                <p className="text-red-600 text-sm mt-1">{errors.mobile}</p>
              )}
              {mobileExists && !errors.mobile && (
                <p className="text-orange-600 text-sm mt-1">
                  This mobile number is already registered
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Enter email address (optional)"
                error={errors.email}
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <Input
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Enter city"
                error={errors.city}
              />
              {errors.city && (
                <p className="text-red-600 text-sm mt-1">{errors.city}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Enter full address"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors.address && (
                <p className="text-red-600 text-sm mt-1">{errors.address}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add any additional notes about the client"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors.notes && (
                <p className="text-red-600 text-sm mt-1">{errors.notes}</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || mobileExists}
                loading={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {client ? 'Update Client' : 'Create Client'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientForm;
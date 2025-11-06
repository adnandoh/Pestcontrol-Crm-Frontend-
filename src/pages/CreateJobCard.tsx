import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  Mail,
  MapPin,
  Settings,
  IndianRupee,
  Calendar
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Checkbox,
  ClientCheckStatus,
  Select,
  Input,
  DatePicker,
  FieldError,
} from '../components/ui';
import {
  ValidatedInput,
  ValidatedTextarea,
  ValidatedSelect,
  ValidatedDatePicker
} from '../components/forms';
import { useFormValidation, jobCardValidationRules } from '../hooks/useFormValidation';
import { enhancedApiService } from '../services/api.enhanced';
import type { JobCardFormData } from '../types';

const CreateJobCard: React.FC = () => {
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state with localStorage persistence
  const getInitialFormData = (): JobCardFormData => {
    try {
      const savedData = localStorage.getItem('createJobCardFormData');
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Error loading saved form data:', error);
    }
    
    return {
      client_name: '',
      client_mobile: '',
      client_email: '',
      client_city: '',
      client_address: '',
      client_notes: '',
      job_type: 'Customer',
      is_paused: false,
      service_type: '',
      schedule_date: '',
      status: 'Enquiry',
      payment_status: 'Unpaid',
      price: '',
      next_service_date: '',
      reference: '',
      contract_duration: ''
    };
  };

  const [formData, setFormData] = useState<JobCardFormData>(getInitialFormData());

  // Service type options
  const serviceTypeOptions = [
    'Ants',
    'Cockroaches',
    'Rodents (Mice/Rats)',
    'Spiders',
    'Wasps/Bees',
    'Bed Bugs',
    'Termites',
    'Fleas',
    'Mosquitoes',
    'Flies',
    'Silverfish',
    'Moths',
    'Beetles',
    'Centipedes/Millipedes',
    'Earwigs',
    'Crickets',
    'Ticks',
    'Mites',
    'Aphids',
    'Thrips',
    'Scale Insects',
    'Whiteflies',
    'Caterpillars',
    'Slugs/Snails',
    'Other'
  ];

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
  const [customService, setCustomService] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  // Client check state
  const [clientCheckStatus, setClientCheckStatus] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle');
  const [clientCheckError, setClientCheckError] = useState<string>('');
  const [foundClientName, setFoundClientName] = useState<string>('');
  const [lastCheckedMobile, setLastCheckedMobile] = useState<string>('');
  const [autoPopulatedFields, setAutoPopulatedFields] = useState<Set<string>>(new Set());

  // Form validation
  const {
    errors,
    validateField,
    validateForm,
    clearError,
    scrollToFirstError,
    hasErrors
  } = useFormValidation(jobCardValidationRules);



  // Job status options
  const jobStatusOptions = [
    'Enquiry',
    'WIP',
    'Done',
    'Hold',
    'Cancel',
    'Inactive'
  ];

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
    const updatedFormData = {
      ...formData,
      [field]: value
    };
    setFormData(updatedFormData);
    
    // Clear validation error for this field
    clearError(field);
    
    // Remove field from auto-populated set if user modifies it
    if (autoPopulatedFields.has(field)) {
      const newAutoPopulatedFields = new Set(autoPopulatedFields);
      newAutoPopulatedFields.delete(field);
      setAutoPopulatedFields(newAutoPopulatedFields);
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('createJobCardFormData', JSON.stringify(updatedFormData));
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  };

  // Handle field validation on blur
  const handleFieldValidation = (field: keyof JobCardFormData, value: any) => {
    const error = validateField(field, value);
    // Error is automatically set by the validation hook
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
      setSelectedServices([...serviceTypeOptions.filter(s => s !== 'Other')]);
    } else {
      setSelectedServices([]);
    }
  };

  // Client check helper functions
  const resetClientCheckState = () => {
    setClientCheckStatus('idle');
    setClientCheckError('');
    setFoundClientName('');
    setLastCheckedMobile('');
    setAutoPopulatedFields(new Set());
  };

  const setClientCheckLoading = () => {
    setClientCheckStatus('loading');
    setClientCheckError('');
    setFoundClientName('');
  };

  const setClientCheckFound = (clientName: string) => {
    setClientCheckStatus('found');
    setFoundClientName(clientName);
    setClientCheckError('');
  };

  const setClientCheckNotFound = () => {
    setClientCheckStatus('not-found');
    setFoundClientName('');
    setClientCheckError('');
  };

  const setClientCheckErrorState = (error: string) => {
    setClientCheckStatus('error');
    setClientCheckError(error);
    setFoundClientName('');
  };

  // Helper function to check if field is auto-populated
  const isFieldAutoPopulated = (field: string) => {
    return autoPopulatedFields.has(field);
  };

  // Update service_type field when selections change
  useEffect(() => {
    let services = [...selectedServices];
    if (customService && selectedServices.includes('Other')) {
      services = services.filter(s => s !== 'Other');
      services.push(customService);
    }
    const updatedServiceType = services.join(', ');
    handleInputChange('service_type', updatedServiceType);
    // Trigger validation to provide immediate feedback on change
    validateField('service_type', updatedServiceType);
  }, [selectedServices, customService]);

  // Initialize service selections from saved data
  useEffect(() => {
    if (formData.service_type) {
      const services = formData.service_type.split(',').map(s => s.trim());
      const validServices = services.filter(s => serviceTypeOptions.includes(s));
      const customServices = services.filter(s => !serviceTypeOptions.includes(s));
      
      setSelectedServices(validServices);
      if (customServices.length > 0) {
        setSelectedServices(prev => [...prev, 'Other']);
        setCustomService(customServices[0]);
      }
      
      if (validServices.length === serviceTypeOptions.length - 1) { // -1 for 'Other'
        setSelectAll(true);
      }
    }
  }, []); // Only run on mount

  // Clear form data on page refresh (when component unmounts and remounts)
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem('createJobCardFormData');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Check if client exists by mobile number
  const checkClientExists = async (mobile: string) => {
    if (mobile.length !== 10) return;

    // Set loading state
    setClientCheckLoading();

    try {
      const response = await enhancedApiService.checkClientExists(mobile);
      
      if (response.exists && response.client) {
        const client = response.client;
        
        // Set success state
        setClientCheckFound(client.full_name || 'Unknown Client');
        
        // Auto-populate fields and track them
        const fieldsToPopulate = new Set(['client_name', 'client_email', 'client_city', 'client_address']);
        setAutoPopulatedFields(fieldsToPopulate);
        
        setFormData(prev => ({
          ...prev,
          client_name: client.full_name || '',
          client_email: client.email || '',
          client_city: client.city || '',
          client_address: client.address || '',
          client_notes: client.notes || ''
        }));
        
        // Save to localStorage with auto-populated data
        try {
          const updatedFormData = {
            ...formData,
            client_name: client.full_name || '',
            client_email: client.email || '',
            client_city: client.city || '',
            client_address: client.address || '',
            client_notes: client.notes || ''
          };
          localStorage.setItem('createJobCardFormData', JSON.stringify(updatedFormData));
        } catch (storageError) {
          console.error('Error saving form data:', storageError);
        }
      } else {
        // Client not found
        setClientCheckNotFound();
      }
    } catch (error: any) {
      console.error('Error checking client:', error);
      
      // Set error state with user-friendly message
      let errorMessage = 'Unable to check client. Please continue with manual entry.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Client check was cancelled.';
      } else if (error.status === 0 || !navigator.onLine) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.status === 408) {
        errorMessage = 'Client check timed out. Please try again.';
      }
      
      setClientCheckErrorState(errorMessage);
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => {
        if (clientCheckStatus === 'error') {
          resetClientCheckState();
        }
      }, 5000);
    }
  };

  // Handle mobile number change
  const handleMobileChange = (value: string) => {
    // Only allow numbers and limit to 10 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 10);
    
    // Clear client check state if mobile number changed
    if (numericValue !== lastCheckedMobile) {
      resetClientCheckState();
      
      // Clear auto-populated fields if mobile number changed after a successful check
      if (lastCheckedMobile && autoPopulatedFields.size > 0) {
        const updatedFormData = { ...formData };
        autoPopulatedFields.forEach(field => {
          if (field !== 'client_mobile') {
            switch (field) {
              case 'client_name':
              case 'client_email':
              case 'client_city':
              case 'client_address':
                updatedFormData[field] = '';
                break;
            }
          }
        });
        setFormData(updatedFormData);
      }
    }
    
    handleInputChange('client_mobile', numericValue);

    // Check if client exists when 10 digits are entered
    if (numericValue.length === 10 && numericValue !== lastCheckedMobile) {
      setLastCheckedMobile(numericValue);
      checkClientExists(numericValue);
    } else if (numericValue.length < 10) {
      setLastCheckedMobile('');
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate entire form
    const validationErrors = validateForm(formData);
    
    if (Object.keys(validationErrors).length > 0) {
      // Scroll to first error field
      setTimeout(() => {
        scrollToFirstError();
      }, 100);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Pass client existence status to prevent sending full_name for existing clients
      await enhancedApiService.createJobCard(formData, clientCheckStatus === 'found');

      // Success - clear saved data and redirect
      localStorage.removeItem('createJobCardFormData');
      navigate('/jobcards');
    } catch (err: any) {
      setError(err.message || 'Failed to create job card');
      // Form data is preserved in state and localStorage
    } finally {
      setSubmitting(false);
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/jobcards')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Job Cards
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="text-red-600 text-center">{error}</div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <ValidatedInput
                  name="client_name"
                  label="Client Name"
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => handleInputChange('client_name', e.target.value)}
                  onValidate={(value) => handleFieldValidation('client_name', value)}
                  placeholder="Enter client name"
                  className={isFieldAutoPopulated('client_name') ? 'bg-green-50 border-green-200' : ''}
                  error={errors.client_name}
                  required
                  disabled={clientCheckStatus === 'found'}
                  readOnly={clientCheckStatus === 'found'}
                />
                {isFieldAutoPopulated('client_name') && (
                  <span className="text-xs text-green-600 font-normal mt-1 block">
                    {clientCheckStatus === 'found' ? '(Auto-filled - Cannot edit existing client name)' : '(Auto-filled)'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                    <ValidatedInput
                      name="client_mobile"
                      type="tel"
                      value={formData.client_mobile}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      onValidate={(value) => handleFieldValidation('client_mobile', value)}
                      placeholder="10-digit mobile number"
                      className="pl-10"
                      maxLength={10}
                      error={errors.client_mobile}
                      showError={false}
                      required
                    />
                  </div>
                  {errors.client_mobile && (
                    <div className="text-sm text-red-600 flex items-center space-x-1">
                      <span>{errors.client_mobile}</span>
                    </div>
                  )}
                  <ClientCheckStatus
                    status={clientCheckStatus}
                    clientName={foundClientName}
                    error={clientCheckError}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="client_email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                    <ValidatedInput
                      name="client_email"
                      type="email"
                      value={formData.client_email || ''}
                      onChange={(e) => handleInputChange('client_email', e.target.value)}
                      onValidate={(value) => handleFieldValidation('client_email', value)}
                      placeholder="Enter email address"
                      className={`pl-10 ${isFieldAutoPopulated('client_email') ? 'bg-green-50 border-green-200' : ''}`}
                      error={errors.client_email}
                      showError={true}
                      containerClassName="mb-0"
                    />
                  </div>
                </div>
                {isFieldAutoPopulated('client_email') && (
                  <span className="text-xs text-green-600 font-normal mt-1 block">
                    (Auto-filled)
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="client_city" className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                    <ValidatedInput
                      name="client_city"
                      type="text"
                      value={formData.client_city}
                      onChange={(e) => handleInputChange('client_city', e.target.value)}
                      onValidate={(value) => handleFieldValidation('client_city', value)}
                      placeholder="Enter city"
                      className={`pl-10 ${isFieldAutoPopulated('client_city') ? 'bg-green-50 border-green-200' : ''}`}
                      error={errors.client_city}
                      showError={true}
                      containerClassName="mb-0"
                      required
                    />
                  </div>
                </div>
                {isFieldAutoPopulated('client_city') && (
                  <span className="text-xs text-green-600 font-normal mt-1 block">
                    (Auto-filled)
                  </span>
                )}
              </div>
            </div>

            <ValidatedTextarea
              name="client_address"
              label="Address"
              value={formData.client_address}
              onChange={(e) => handleInputChange('client_address', e.target.value)}
              onValidate={(value) => handleFieldValidation('client_address', value)}
              placeholder="Enter complete address"
              className={isFieldAutoPopulated('client_address') ? 'bg-green-50 border-green-200' : ''}
              rows={3}
              error={errors.client_address}
              required
            />
            {isFieldAutoPopulated('client_address') && (
              <span className="text-xs text-green-600 font-normal">
                (Auto-filled)
              </span>
            )}

            <ValidatedTextarea
              name="client_notes"
              label="Notes"
              value={formData.client_notes || ''}
              onChange={(e) => handleInputChange('client_notes', e.target.value)}
              onValidate={(value) => handleFieldValidation('client_notes', value)}
              placeholder="Enter client notes (optional)"
              rows={3}
              error={errors.client_notes}
            />
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Service Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <ValidatedSelect
                name="job_type"
                label="Job Type"
                value={formData.job_type}
                onChange={(value) => handleInputChange('job_type', value as 'Customer' | 'Society')}
                onValidate={(value) => validateField('job_type', value)}
                options={[
                  { value: 'Customer', label: 'Customer' },
                  { value: 'Society', label: 'Society' }
                ]}
                placeholder="Select job type"
                error={errors.job_type}
                required
              />
            </div>

            <div>
              <ValidatedSelect
                name="contract_duration"
                label="Contract Duration"
                value={formData.contract_duration}
                onChange={(value) => handleInputChange('contract_duration', value)}
                options={contractDurationOptions}
                placeholder="Select contract duration"
                error={errors.contract_duration}
                required={formData.job_type === 'Society'}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${errors.service_type ? 'text-red-700' : 'text-gray-700'}`}>
                Service Type <span className="text-red-500">*</span>
              </label>
              <div className={`space-y-2 ${errors.service_type ? 'border border-red-500 rounded-md p-3 bg-red-50' : ''}`} data-field="service_type" id="service_type">
                <div className="flex items-center">
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAll}
                    label="Select All"
                    className="font-medium"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {serviceTypeOptions.map((service) => (
                    <div key={service} className="flex items-center">
                      <Checkbox
                        checked={selectedServices.includes(service)}
                        onChange={(checked) => handleServiceTypeChange(service, checked)}
                        label={service}
                      />
                    </div>
                  ))}
                </div>
                {selectedServices.includes('Other') && (
                  <div className="mt-2">
                    <Input
                      type="text"
                      value={customService}
                      onChange={(e) => setCustomService(e.target.value)}
                      placeholder="Specify other pest type"
                    />
                  </div>
                )}
                {errors.service_type && (
                  <FieldError error={errors.service_type} fieldId="service_type" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ValidatedDatePicker
                name="schedule_date"
                label="Schedule Date"
                value={formData.schedule_date}
                onChange={(date) => handleInputChange('schedule_date', date)}
                onValidate={(value) => handleFieldValidation('schedule_date', value)}
                placeholder="Select schedule date"
                error={errors.schedule_date}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference
                </label>
                <Select
                  value={formData.reference}
                  onChange={(value) => handleInputChange('reference', value)}
                  options={referenceOptions.map(option => ({ value: option, label: option }))}
                  placeholder="Select reference"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Status
                </label>
                <Select
                  value={formData.status}
                  onChange={(value) => handleInputChange('status', value)}
                  options={jobStatusOptions.map(option => ({ value: option, label: option }))}
                  placeholder="Select job status"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                <Select
                  value={formData.payment_status}
                  onChange={(value) => handleInputChange('payment_status', value)}
                  options={paymentStatusOptions.map(option => ({ value: option, label: option }))}
                  placeholder="Select payment status"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <IndianRupee className="h-5 w-5 mr-2" />
              Pricing Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <ValidatedInput
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  onValidate={(value) => validateField('price', value)}
                  placeholder="Enter service price"
                  className="pl-8"
                  required
                  error={errors.price}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Additional Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next Service Date
              </label>
              <DatePicker
                value={formData.next_service_date || ''}
                onChange={(date) => handleInputChange('next_service_date', date)}
                placeholder="Select next service date"
              />
            </div>


          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/jobcards')}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default CreateJobCard;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  User,
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
  Toggle,
  PageLoading,
  ConfirmationModal,
  DatePicker,
  Input,
  Select,
  Textarea
} from '../components/ui';
import {
  ValidatedInput,
  ValidatedTextarea,
  ValidatedDatePicker
} from '../components/forms';
import { useFormValidation, jobCardValidationRules } from '../hooks/useFormValidation';
import { enhancedApiService } from '../services/api.enhanced';
import type { JobCardFormData, JobCard } from '../types';

const EditJobCard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [showPauseConfirmation, setShowPauseConfirmation] = useState(false);
  const [pendingPauseState, setPendingPauseState] = useState<boolean | null>(null);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [_originalFormData, setOriginalFormData] = useState<JobCardFormData | null>(null);

  // Form state with localStorage persistence
  const getStorageKey = () => `editJobCardFormData_${id}`;

  const getInitialFormData = (): JobCardFormData => {
    try {
      const savedData = localStorage.getItem(getStorageKey());
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
      extra_notes: '',
      contract_duration: ''
    };
  };

  const [formData, setFormData] = useState<JobCardFormData>(getInitialFormData());

  // Form validation
  const {
    errors,
    validateField,
    validateForm,
    clearError,
    scrollToFirstError,
    hasErrors: _hasErrors
  } = useFormValidation(jobCardValidationRules);

  // Helper function to convert JobCard data to form data
  const getFormDataFromJobCard = (jobCardData: JobCard): JobCardFormData => {
    return {
      client_name: jobCardData.client_name || '',
      client_mobile: jobCardData.client_mobile || '',
      client_email: jobCardData.client_email || '',
      client_city: jobCardData.client_city || '',
      client_address: jobCardData.client_address || '',
      client_notes: jobCardData.client_notes || '',
      job_type: jobCardData.job_type || 'Customer',
      is_paused: jobCardData.is_paused || false,
      service_type: jobCardData.service_type || '',
      schedule_date: jobCardData.schedule_date || '',
      status: jobCardData.status || 'Enquiry',
      payment_status: jobCardData.payment_status || 'Unpaid',
      price: jobCardData.price || '0',
      next_service_date: jobCardData.next_service_date || '',
      reference: jobCardData.reference || '',
      extra_notes: jobCardData.extra_notes || '',
      contract_duration: jobCardData.contract_duration || ''
    };
  };

  // Service type options
  const serviceTypeOptions = [
    'Ants',
    'Cockroaches',
    'Rodents (Mice/Rats)',
    'Spiders',
    'Wasps/Bees',
    'Bed Bugs',
    'Fleas',
    'Mosquitoes',
    'House Flies',
    'Termites',
    'Other'
  ];

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customService, setCustomService] = useState('');
  const [selectAll, setSelectAll] = useState(false);

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

  // Load job card data
  useEffect(() => {
    const loadJobCard = async () => {
      if (!id) {
        setError('Job card ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const jobCardData = await enhancedApiService.getJobCard(parseInt(id));
        setJobCard(jobCardData);

        // Parse service types
        const services = jobCardData.service_type ? jobCardData.service_type.split(', ') : [];
        const knownServices = services.filter(s => serviceTypeOptions.includes(s));
        const customServices = services.filter(s => !serviceTypeOptions.includes(s));

        setSelectedServices(knownServices);
        if (customServices.length > 0) {
          setSelectedServices(prev => [...prev, 'Other']);
          setCustomService(customServices.join(', '));
        }

        // Set form data
        // Always use job card data for initial load, ignore localStorage for edit forms
        // This ensures we always show the latest data from the server
        const initialFormData = getFormDataFromJobCard(jobCardData);
        
        console.log('🔄 EditJobCard: Job card data loaded:', jobCardData);
        console.log('🔄 EditJobCard: Form data mapped:', initialFormData);
        
        setFormData(initialFormData);
        setOriginalFormData(initialFormData);
        
        // Clear any existing localStorage data to prevent confusion
        localStorage.removeItem(getStorageKey());
      } catch (err: any) {
        setError(err.message || 'Failed to load job card');
      } finally {
        setLoading(false);
      }
    };

    loadJobCard();
  }, [id]);

  // Handle input changes with localStorage persistence and validation
  const handleInputChange = (field: keyof JobCardFormData, value: any) => {
    const updatedFormData = {
      ...formData,
      [field]: value
    };
    setFormData(updatedFormData);
    
    // Clear validation error for this field
    clearError(field);
    
    // Save to localStorage
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(updatedFormData));
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  };

  // Handle field validation on blur
  const handleFieldValidation = (field: keyof JobCardFormData, value: any) => {
    validateField(field, value);
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

  // Update service_type field when selections change
  useEffect(() => {
    let services = [...selectedServices];
    if (customService && selectedServices.includes('Other')) {
      services = services.filter(s => s !== 'Other');
      services.push(customService);
    }
    handleInputChange('service_type', services.join(', '));
  }, [selectedServices, customService]);

  // Clear form data on page refresh (when component unmounts and remounts)
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem(getStorageKey());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [id]);

  // Handle mobile number change
  const handleMobileChange = (value: string) => {
    // Only allow numbers and limit to 10 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 10);
    handleInputChange('client_mobile', numericValue);
  };

  // Handle pause service toggle with confirmation
  const handlePauseToggle = (checked: boolean) => {
    setPendingPauseState(checked);
    setShowPauseConfirmation(true);
  };

  // Confirm pause service change
  const confirmPauseChange = async () => {
    if (!id || pendingPauseState === null) return;

    try {
      setPauseLoading(true);

      // Use dedicated toggle pause endpoint
      await enhancedApiService.toggleJobCardPause(parseInt(id), pendingPauseState);

      // Update local state
      handleInputChange('is_paused', pendingPauseState);

      // Refresh job card data to get latest state
      const updatedJobCard = await enhancedApiService.getJobCard(parseInt(id));
      setJobCard(updatedJobCard);
      
      // Update form data to reflect the change
      setFormData(prev => ({
        ...prev,
        is_paused: updatedJobCard.is_paused
      }));

      // Close modal
      setShowPauseConfirmation(false);
      setPendingPauseState(null);

    } catch (err: any) {
      setError(err.message || 'Failed to update pause status');
    } finally {
      setPauseLoading(false);
    }
  };

  // Cancel pause service change
  const cancelPauseChange = () => {
    setShowPauseConfirmation(false);
    setPendingPauseState(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) {
      setError('Job card ID is required');
      return;
    }

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

      await enhancedApiService.updateJobCard(parseInt(id), formData);

      // Success - clear saved data and cache, then redirect
      localStorage.removeItem(getStorageKey());
      
      // Clear API cache to ensure fresh data is fetched
      enhancedApiService.clearCache();
      
      // Redirect to appropriate page based on job type
      const redirectUrl = getBackUrl();
      navigate(redirectUrl);
    } catch (err: any) {
      
      let errorMessage = 'Failed to update job card';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      // Form data is preserved in state and localStorage
    } finally {
      setSubmitting(false);
    }
  };

  const getBackUrl = () => {
    if (jobCard?.job_type === 'Society') {
      return '/society-jobcards';
    }
    return '/jobcards';
  };

  if (loading) {
    return <PageLoading text="Loading job card..." />;
  }

  if (!jobCard) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-red-600 text-center">Job card not found</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(getBackUrl())}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {jobCard.job_type === 'Society' ? 'Society Job Cards' : 'Job Cards'}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Edit Job Card #{jobCard.code}
            </h1>
            <p className="text-sm text-gray-600 mt-1">Update job card details</p>
          </div>
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
              {jobCard.job_type === 'Society' ? 'Society Information' : 'Client Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ValidatedInput
                name="client_name"
                label={jobCard.job_type === 'Society' ? 'Society Name' : 'Client Name'}
                type="text"
                value={formData.client_name}
                onChange={(e) => handleInputChange('client_name', e.target.value)}
                onValidate={(value) => handleFieldValidation('client_name', value)}
                placeholder={`Enter ${jobCard.job_type === 'Society' ? 'society' : 'client'} name`}
                error={errors.client_name}
                required
                disabled={true}
                readOnly={true}
              />
              <span className="text-xs text-gray-500 font-normal mt-1 block">
                (Cannot edit existing client name)
              </span>

              <ValidatedInput
                name="client_mobile"
                label="Mobile Number"
                type="tel"
                value={formData.client_mobile}
                onChange={(e) => handleMobileChange(e.target.value)}
                onValidate={(value) => handleFieldValidation('client_mobile', value)}
                placeholder="10-digit mobile number"
                maxLength={10}
                error={errors.client_mobile}
                required
              />

              <ValidatedInput
                name="client_email"
                label="Email"
                type="email"
                value={formData.client_email || ''}
                onChange={(e) => handleInputChange('client_email', e.target.value)}
                onValidate={(value) => handleFieldValidation('client_email', value)}
                placeholder="Enter email address"
                error={errors.client_email}
              />

              <ValidatedInput
                name="client_city"
                label="City"
                type="text"
                value={formData.client_city}
                onChange={(e) => handleInputChange('client_city', e.target.value)}
                onValidate={(value) => handleFieldValidation('client_city', value)}
                placeholder="Enter city"
                error={errors.client_city}
                required
              />
            </div>

            <ValidatedTextarea
              name="client_address"
              label="Address"
              value={formData.client_address}
              onChange={(e) => handleInputChange('client_address', e.target.value)}
              onValidate={(value) => handleFieldValidation('client_address', value)}
              placeholder="Enter complete address"
              rows={3}
              error={errors.client_address}
              required
            />

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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pause Service
              </label>
              <div className="flex items-center space-x-3">
                <Toggle
                  checked={formData.is_paused}
                  onChange={handlePauseToggle}
                  label={formData.is_paused ? "Service is paused" : "Service is active"}
                  disabled={pauseLoading}
                />
                {pauseLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.is_paused
                  ? "This service is currently paused and will not be scheduled."
                  : "This service is active and can be scheduled normally."
                }
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.job_type}
                onChange={(value) => handleInputChange('job_type', value as 'Customer' | 'Society')}
                options={[
                  { value: 'Customer', label: 'Customer' },
                  { value: 'Society', label: 'Society' }
                ]}
                placeholder="Select job type"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contract Duration
              </label>
              <Select
                value={formData.contract_duration || ''}
                onChange={(value) => handleInputChange('contract_duration', value)}
                options={contractDurationOptions}
                placeholder="Select contract duration"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference
                </label>
                <Select
                  value={formData.reference || ''}
                  onChange={(value) => handleInputChange('reference', value)}
                  options={referenceOptions.map(option => ({ value: option, label: option }))}
                  placeholder="Select reference"
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
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="Enter service price"
                  className="pl-8"
                  min="0"
                  step="0.01"
                  required
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extra Notes
              </label>
              <Textarea
                value={formData.extra_notes || ''}
                onChange={(e) => handleInputChange('extra_notes', e.target.value)}
                placeholder="Example: Service: 1 year Gel & Spray"
                rows={3}
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
                onClick={() => navigate(getBackUrl())}
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
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Job Card
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Pause Service Confirmation Modal */}
      <ConfirmationModal
        isOpen={showPauseConfirmation}
        onClose={cancelPauseChange}
        onConfirm={confirmPauseChange}
        title={pendingPauseState ? "Pause Service" : "Resume Service"}
        message={
          pendingPauseState
            ? "Are you sure you want to pause this service? The service will be temporarily stopped and no new schedules will be created until resumed."
            : "Are you sure you want to resume this service? The service will become active again and can be scheduled normally."
        }
        confirmText={pendingPauseState ? "Yes, Pause Service" : "Yes, Resume Service"}
        cancelText="Cancel"
        type={pendingPauseState ? "warning" : "info"}
        isLoading={pauseLoading}
      />
    </div>
  );
};

export default EditJobCard;
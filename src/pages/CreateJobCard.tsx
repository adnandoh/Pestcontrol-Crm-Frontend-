import React, { useState } from 'react';
import {
  Typography,
  Paper,
  TextField,
  Button,
  MenuItem,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import FixedTextField from '../components/FixedTextField';
import ServiceTypeSelector from '../components/ServiceTypeSelector';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate, useLocation } from 'react-router-dom';
import { clientService, jobCardService, inquiryService } from '../services/api';
import { JobCard, Inquiry } from '../types/index';

const CreateJobCard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we're coming from an inquiry conversion
  const { fromInquiry, inquiryData } = location.state || {};
  
  // Removed isLoading state as we no longer fetch clients
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Always creating new client - no toggle needed


  // Form states - removed selectedClientId as we only create new clients
  const [newClient, setNewClient] = useState({
    full_name: fromInquiry && inquiryData ? inquiryData.name : '',
    mobile: fromInquiry && inquiryData ? inquiryData.mobile : '',
    email: fromInquiry && inquiryData ? inquiryData.email : '',
    city: fromInquiry && inquiryData ? inquiryData.city : '',
    address: fromInquiry && inquiryData ? inquiryData.address : '',
  });
  const [jobCard, setJobCard] = useState({
    service_type: fromInquiry && inquiryData ? [inquiryData.service_interest] : [] as string[], // Pre-fill from inquiry
    schedule_date: new Date(),
    price: '',
    payment_status: 'Unpaid' as 'Unpaid' | 'Paid',
    notes: fromInquiry && inquiryData ? `Converted from inquiry: ${inquiryData.message}` : '',
    next_service_date: null as Date | null,
    job_type: 'Customer' as 'Customer' | 'Society',
    contract_duration: undefined as undefined | '12' | '6' | '3',
    is_paused: false,
    reference: '', // New reference field
  });

  // Removed client fetching as we only create new clients

  // Removed handleClientChange as we only create new clients

  const handleNewClientChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setNewClient({
      ...newClient,
      [name]: value,
    });
  };

  const handleJobCardChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setJobCard({
      ...jobCard,
      [name]: type === 'checkbox' ? checked :
        name === 'payment_status' ? (value as 'Unpaid' | 'Paid') : 
        name === 'job_type' ? (value as 'Customer' | 'Society') : value,
      // Reset contract_duration when switching from Society to Customer
      ...(name === 'job_type' && value === 'Customer' ? { contract_duration: undefined } : {}),
    });
  };

  const handlePauseToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setJobCard({
      ...jobCard,
      is_paused: event.target.checked,
    });
  };

  const handleServiceTypeChange = (value: string[]) => {
    setJobCard({
      ...jobCard,
      service_type: value,
    });
  };



  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      setError(null);

      // Validate new client data
      if (!newClient.full_name || !newClient.mobile || !newClient.city) {
        setError('Please fill in all required client fields (Name, Mobile, City).');
        return;
      }

      // Clean mobile number (remove spaces, dashes, parentheses)
      const cleanedMobile = newClient.mobile.replace(/[\s\-\(\)]/g, '');
      
      if (cleanedMobile.length !== 10 || !/^\d{10}$/.test(cleanedMobile)) {
        setError('Mobile number must be exactly 10 digits (e.g., 9876543210).');
        return;
      }

      // Validate email if provided
      if (newClient.email && newClient.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newClient.email)) {
          setError('Please enter a valid email address.');
          return;
        }
      }

      // Validate job card data BEFORE creating client
      if (!jobCard.service_type || jobCard.service_type.length === 0) {
        setError('Please select at least one service type.');
        return;
      }

      // Validate schedule date
      if (!jobCard.schedule_date) {
        setError('Please select a schedule date.');
        return;
      }

      // Validate that price is provided
      if (!jobCard.price || jobCard.price.trim() === '') {
        setError('Service price is required.');
        return;
      }

      // Validate contract duration for Society type
      if (jobCard.job_type === 'Society' && !jobCard.contract_duration) {
         setError('Please select a contract duration for Society job type.');
         return;
       }

      // All validations passed - now create client and job card
      // Prepare client data with cleaned mobile number
      const clientData = {
        ...newClient,
        mobile: cleanedMobile,
        email: newClient.email?.trim() || undefined, // Send undefined if empty
        address: newClient.address?.trim() || undefined, // Send undefined if empty
      };

      // Create new client first
      console.log('Creating client with data:', clientData);
      const newClientResponse = await clientService.createClient(clientData);
      const clientId = newClientResponse.id;

      // Create job card with default technician values
      const jobCardData: Partial<JobCard> = {
        client: Number(clientId),
        service_type: jobCard.service_type.join(', '), // Join array to string
        technician_name: 'TBD', // Default value since technician field is removed
        schedule_date: jobCard.schedule_date.toISOString().split('T')[0],
        price: jobCard.price, // Store price as string exactly as entered
        payment_status: jobCard.payment_status,
        notes: jobCard.notes?.trim() || '',
        next_service_date: jobCard.next_service_date
          ? jobCard.next_service_date.toISOString().split('T')[0]
          : undefined,
        job_type: jobCard.job_type,
        contract_duration: jobCard.job_type === 'Society' ? jobCard.contract_duration : undefined,
        is_paused: jobCard.is_paused,
        reference: jobCard.reference,
      };

      console.log('Sending job card data:', jobCardData);
      await jobCardService.createJobCard(jobCardData);
      
      // If this was converted from an inquiry, delete the inquiry
      if (fromInquiry && inquiryData?.id) {
        try {
          await inquiryService.deleteInquiry(inquiryData.id);
          console.log(`Inquiry ${inquiryData.id} deleted successfully after conversion`);
        } catch (deleteError) {
          console.error('Error deleting inquiry after conversion:', deleteError);
          // Don't fail the entire operation if inquiry deletion fails
        }
      }
      
      setSuccess(fromInquiry 
        ? 'Inquiry converted to job card successfully and inquiry deleted!' 
        : 'Job card created successfully!'
      );

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/jobcards');
      }, 2000);
    } catch (err: any) {
      console.error('Error creating job card:', err);
      console.error('Error response data:', err.response?.data);

      // Try to extract more specific error message
      let errorMessage = 'Failed to create job card. Please check your inputs and try again.';
      
      if (err.response?.data) {
        const responseData = err.response.data;
        
        if (typeof responseData === 'string') {
          errorMessage = responseData;
        } else if (responseData.detail) {
          errorMessage = responseData.detail;
        } else if (responseData.error) {
          errorMessage = responseData.error;
          
          // If there are detailed validation errors, append them
          if (responseData.details) {
            if (typeof responseData.details === 'object') {
              const fieldErrors = Object.entries(responseData.details)
                .map(([field, messages]: [string, any]) => {
                  if (Array.isArray(messages)) {
                    return `${field}: ${messages.join(', ')}`;
                  }
                  return `${field}: ${messages}`;
                })
                .join('; ');
              if (fieldErrors) {
                errorMessage += ` - ${fieldErrors}`;
              }
            } else {
              errorMessage += ` - ${responseData.details}`;
            }
          }
        } else {
          // Handle field-specific errors
          const errors = Object.entries(responseData)
            .map(([field, messages]: [string, any]) => {
              if (field === 'mobile' && Array.isArray(messages)) {
                // Special handling for mobile number uniqueness error
                const mobileErrors = messages.filter(msg => 
                  typeof msg === 'string' && 
                  (msg.includes('already exists') || msg.includes('unique'))
                );
                if (mobileErrors.length > 0) {
                  return `A client with mobile number ${newClient.mobile} already exists. Please check if this client is already registered or use a different mobile number.`;
                }
                return `${field}: ${messages.join(', ')}`;
              }
              return `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
            })
            .join('; ');
          if (errors) {
            errorMessage = `Validation errors: ${errors}`;
          }
        }
      }

      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', mt: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          {fromInquiry ? 'Convert Inquiry to Job Card' : 'Create Job Card'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {fromInquiry 
            ? 'Review and complete the job card details from the inquiry below' 
            : 'Fill in the details below to create a new service job card'
          }
        </Typography>
        {fromInquiry && inquiryData && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #1976d2' }}>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
              📋 Converting Inquiry: {inquiryData.name} - {inquiryData.service_interest}
            </Typography>
          </Box>
        )}
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          pt: { xs: 4, md: 5 },
          border: '1px solid #e0e0e0',
          borderRadius: 0,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Client Details Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{
              fontWeight: 600,
              color: '#333',
              mb: 3,
              pb: 2,
              borderBottom: '2px solid #f0f0f0'
            }}>
              Add New Client
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'visible', paddingTop: '16px' }}>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, overflow: 'visible' }}>
                <FixedTextField
                  required
                  fullWidth
                  label="Client Name"
                  name="full_name"
                  value={newClient.full_name}
                  onChange={handleNewClientChange}
                />
                <FixedTextField
                  required
                  fullWidth
                  label="Mobile Number"
                  name="mobile"
                  value={newClient.mobile}
                  onChange={handleNewClientChange}
                  inputProps={{ maxLength: 10, pattern: '[0-9]{10}' }}
                  helperText="10-digit mobile number"
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, overflow: 'visible' }}>
                <FixedTextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={newClient.email}
                  onChange={handleNewClientChange}
                />
                <FixedTextField
                  required
                  fullWidth
                  label="City"
                  name="city"
                  value={newClient.city}
                  onChange={handleNewClientChange}
                />
              </Box>
              <FixedTextField
                fullWidth
                label="Address"
                name="address"
                multiline
                rows={3}
                value={newClient.address}
                onChange={handleNewClientChange}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    backgroundColor: '#fafafa',
                    '&:hover': {
                      backgroundColor: '#f5f5f5',
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#ffffff',
                    },
                  },
                }}
              />
            </Box>
          </Box>

          {/* Service Details Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{
              fontWeight: 600,
              color: '#333',
              mb: 3,
              pb: 2,
              borderBottom: '2px solid #f0f0f0'
            }}>
              Service Details
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'visible', paddingTop: '16px' }}>
              {/* Customer/Society Type and Contract Duration Row */}
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <FixedTextField
                  select
                  required
                  fullWidth
                  label="Customer Type"
                  name="job_type"
                  value={jobCard.job_type}
                  onChange={handleJobCardChange}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                      backgroundColor: '#fafafa',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#ffffff',
                      },
                    },
                  }}
                >
                  <MenuItem value="Customer">Customer</MenuItem>
                  <MenuItem value="Society">Society</MenuItem>
                </FixedTextField>
                {jobCard.job_type === 'Society' && (
                  <FixedTextField
                  select
                  required
                  fullWidth
                  label="Name of Contract"
                  name="contract_duration"
                  value={jobCard.contract_duration || ''}
                  onChange={handleJobCardChange}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                      backgroundColor: '#fafafa',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#ffffff',
                      },
                    },
                  }}
                >
                  <MenuItem value="">Select Duration</MenuItem>
                  <MenuItem value="12">12 Months</MenuItem>
                  <MenuItem value="6">6 Months</MenuItem>
                  <MenuItem value="3">3 Months</MenuItem>
                </FixedTextField>
                )}
              </Box>
              
              {/* Pause Service Toggle */}
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={jobCard.is_paused}
                      onChange={handlePauseToggle}
                      name="is_paused"
                      color="warning"
                    />
                  }
                  label="Pause Service"
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontWeight: 500,
                      color: jobCard.is_paused ? '#ed6c02' : '#666',
                    },
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <ServiceTypeSelector
                  value={jobCard.service_type}
                  onChange={handleServiceTypeChange}
                  required
                  label="Service Type"
                />
              </Box>
              
              {/* Reference Field */}
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <FixedTextField
                  select
                  fullWidth
                  label="Reference"
                  name="reference"
                  value={jobCard.reference}
                  onChange={handleJobCardChange}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                      backgroundColor: '#fafafa',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#ffffff',
                      },
                    },
                  }}
                >
                  <MenuItem value="">Select Reference Source</MenuItem>
                  <MenuItem value="Google">Google</MenuItem>
                  <MenuItem value="Facebook">Facebook</MenuItem>
                  <MenuItem value="YouTube">YouTube</MenuItem>
                  <MenuItem value="LinkedIn">LinkedIn</MenuItem>
                  <MenuItem value="SMS">SMS</MenuItem>
                  <MenuItem value="website">Website</MenuItem>
                  <MenuItem value="Play Store">Play Store</MenuItem>
                  <MenuItem value="Instagram">Instagram</MenuItem>
                  <MenuItem value="WhatsApp">WhatsApp</MenuItem>
                  <MenuItem value="Justdial">Justdial</MenuItem>
                  <MenuItem value="poster">Poster</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                  <MenuItem value="previous client">Previous Client</MenuItem>
                  <MenuItem value="friend reference">Friend Reference</MenuItem>
                  <MenuItem value="no parking board">No Parking Board</MenuItem>
                  <MenuItem value="holding">Holding</MenuItem>
                </FixedTextField>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Schedule Date"
                    value={jobCard.schedule_date}
                    onChange={(newValue: Date | null) =>
                      setJobCard({ ...jobCard, schedule_date: newValue || new Date() })
                    }
                    format="dd/MM/yy"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1,
                            backgroundColor: '#fafafa',
                            '&:hover': {
                              backgroundColor: '#f5f5f5',
                            },
                            '&.Mui-focused': {
                              backgroundColor: '#ffffff',
                            },
                          },
                        },
                      },
                    }}
                  />
                </LocalizationProvider>
                {jobCard.job_type !== 'Society' && (
                  <FixedTextField
                    select
                    required
                    fullWidth
                    label="Payment Status"
                    name="payment_status"
                    value={jobCard.payment_status}
                    onChange={handleJobCardChange}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                        backgroundColor: '#fafafa',
                        '&:hover': {
                          backgroundColor: '#f5f5f5',
                        },
                        '&.Mui-focused': {
                          backgroundColor: '#ffffff',
                        },
                      },
                    }}
                  >
                    <MenuItem value="Unpaid">Unpaid</MenuItem>
                    <MenuItem value="Paid">Paid</MenuItem>
                  </FixedTextField>
                )}
              </Box>
            </Box>
          </Box>

          {/* Pricing Details Section */}
          {jobCard.job_type !== 'Society' && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{
                fontWeight: 600,
                color: '#333',
                mb: 3,
                pb: 2,
                borderBottom: '2px solid #f0f0f0'
              }}>
                Pricing Details
              </Typography>

              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, overflow: 'visible', paddingTop: '16px' }}>
                <FixedTextField
                  required
                  fullWidth
                  label="Service Price"
                  name="price"
                  value={jobCard.price}
                  onChange={handleJobCardChange}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 1,
                      backgroundColor: '#e8f5e8',
                      '& input': {
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        color: '#2e7d32',
                      },
                      '&:hover': {
                        backgroundColor: '#e0f2e0',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#ffffff',
                      },
                    },
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Additional Details Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{
              fontWeight: 600,
              color: '#333',
              mb: 3,
              pb: 2,
              borderBottom: '2px solid #f0f0f0'
            }}>
              Additional Details
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'visible', paddingTop: '16px' }}>
              {jobCard.job_type !== 'Society' && (
                <Box sx={{ maxWidth: { xs: '100%', md: '50%' } }}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Next Service Date (Optional)"
                      value={jobCard.next_service_date}
                      onChange={(newValue: Date | null) =>
                        setJobCard({ ...jobCard, next_service_date: newValue })
                      }
                      format="dd/MM/yy"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          sx: {
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 1,
                              backgroundColor: '#fafafa',
                              '&:hover': {
                                backgroundColor: '#f5f5f5',
                              },
                              '&.Mui-focused': {
                                backgroundColor: '#ffffff',
                              },
                            },
                          },
                        },
                      }}
                    />
                </LocalizationProvider>
              </Box>
              )}
              <FixedTextField
                fullWidth
                label="Extra Notes"
                name="notes"
                multiline
                rows={4}
                value={jobCard.notes}
                onChange={handleJobCardChange}
                placeholder="Add any additional notes or special instructions..."
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    backgroundColor: '#fafafa',
                    '&:hover': {
                      backgroundColor: '#f5f5f5',
                    },
                    '&.Mui-focused': {
                      backgroundColor: '#ffffff',
                    },
                  },
                }}
              />
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            pt: 3,
            borderTop: '1px solid #e0e0e0'
          }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isSaving}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 6,
                py: 2,
                fontSize: '1.1rem',
                bgcolor: '#4CAF50',
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                '&:hover': {
                  bgcolor: '#45a049',
                  boxShadow: '0 6px 16px rgba(76, 175, 80, 0.4)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
            </Button>
          </Box>
        </form>
      </Paper>

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)}>
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateJobCard;

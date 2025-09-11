import React, { useState, useEffect } from 'react';
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
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { clientService, jobCardService } from '../services/api';
import { JobCard } from '../types/index';

const EditJobCard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  // Form states
  const [client, setClient] = useState({
    id: 0,
    full_name: '',
    mobile: '',
    email: '',
    city: '',
    address: '',
  });
  const [jobCard, setJobCard] = useState({
    service_type: [] as string[], // Changed to array for multi-select
    schedule_date: new Date(),
    price_subtotal: '' as string | number, // Changed to empty string to avoid showing 0
    payment_status: 'Unpaid' as 'Unpaid' | 'Paid',
    status: 'Enquiry' as 'Enquiry' | 'WIP' | 'Done' | 'Hold' | 'Cancel' | 'Inactive',
    notes: '',
    next_service_date: null as Date | null,
    job_type: 'Customer' as 'Customer' | 'Society',
    contract_duration: undefined as undefined | '12' | '6' | '3',
    is_paused: false,
    reference: '', // New reference field
  });

  useEffect(() => {
    const fetchJobCard = async () => {
      if (!id) return;

      const jobCardId = parseInt(id, 10);
      if (isNaN(jobCardId)) {
        setError('Invalid job card ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch job card details
        const jobCardData = await jobCardService.getJobCard(jobCardId);
        
        // Fetch client details
        const clientData = await clientService.getClient(jobCardData.client);
        
        // Set client data
        setClient({
          id: clientData.id,
          full_name: clientData.full_name,
          mobile: clientData.mobile,
          email: clientData.email || '',
          city: clientData.city,
          address: clientData.address || '',
        });

        // Set job card data
        setJobCard({
          service_type: jobCardData.service_type ? jobCardData.service_type.split(', ') : [], // Convert string to array
          schedule_date: new Date(jobCardData.schedule_date),
          price_subtotal: jobCardData.price_subtotal,
          payment_status: jobCardData.payment_status,
          status: jobCardData.status,
          notes: jobCardData.notes || '',
          next_service_date: jobCardData.next_service_date 
            ? new Date(jobCardData.next_service_date) 
            : null,
          job_type: jobCardData.job_type || 'Customer',
          contract_duration: jobCardData.contract_duration || undefined,
          is_paused: jobCardData.is_paused || false,
          reference: jobCardData.reference || '', // Add reference field
        });
      } catch (err) {
        console.error('Error fetching job card:', err);
        setError('Failed to load job card details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobCard();
  }, [id]);

  const handleClientChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setClient({
      ...client,
      [name]: value,
    });
  };

  const handleJobCardChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    
    if (name === 'job_type') {
      setJobCard({
        ...jobCard,
        job_type: value as 'Customer' | 'Society',
        contract_duration: value === 'Customer' ? undefined : jobCard.contract_duration,
      });
    } else {
      setJobCard({
        ...jobCard,
        [name]: type === 'checkbox' ? checked :
          name === 'price_subtotal' ? (value === '' ? '' : Number(value)) :
          name === 'payment_status' ? (value as 'Unpaid' | 'Paid') :
          name === 'status' ? (value as 'Enquiry' | 'WIP' | 'Done' | 'Hold' | 'Cancel' | 'Inactive') :
          name === 'contract_duration' ? (value as undefined | '12' | '6' | '3') : value,
      });
    }
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
    
    if (!id) return;
    
    try {
      setIsSaving(true);
      setError(null);

      // Validate client data
      if (!client.full_name || !client.mobile || !client.city) {
        setError('Please fill in all required client fields (Name, Mobile, City).');
        return;
      }
      
      if (client.mobile.length !== 10 || !/^\d{10}$/.test(client.mobile)) {
        setError('Mobile number must be exactly 10 digits.');
        return;
      }

      // Validate job card data
      if (!jobCard.service_type || jobCard.service_type.length === 0) {
        setError('Please select at least one service type.');
        return;
      }

      // For Society job cards, allow zero price; for Customer job cards, require price > 0
      if (jobCard.job_type === 'Customer') {
        if (!jobCard.price_subtotal || Number(jobCard.price_subtotal) <= 0) {
          setError('Price must be greater than zero for Customer job cards.');
          return;
        }
      } else if (jobCard.job_type === 'Society') {
        // For Society job cards, set price to 0 if not provided or allow any non-negative value
        if (jobCard.price_subtotal === '' || jobCard.price_subtotal === null || jobCard.price_subtotal === undefined) {
          jobCard.price_subtotal = 0;
        } else if (Number(jobCard.price_subtotal) < 0) {
          setError('Price cannot be negative.');
          return;
        }
      }

      // Validate contract duration for Society job type
      if (jobCard.job_type === 'Society' && !jobCard.contract_duration) {
        setError('Please select contract duration for Society job type.');
        return;
      }

      // Update client
      await clientService.updateClient(client.id, {
        full_name: client.full_name.trim(),
        mobile: client.mobile.trim(),
        email: client.email.trim(),
        city: client.city.trim(),
        address: client.address.trim(),
      });

      // Update job card
      const jobCardData: Partial<JobCard> = {
        service_type: jobCard.service_type.join(', '), // Join array to string
        schedule_date: jobCard.schedule_date.toISOString().split('T')[0],
        price_subtotal: Number(jobCard.price_subtotal),
        payment_status: jobCard.payment_status,
        status: jobCard.status,
        notes: jobCard.notes.trim(),
        next_service_date: jobCard.next_service_date
          ? jobCard.next_service_date.toISOString().split('T')[0]
          : undefined,
        job_type: jobCard.job_type,
        contract_duration: jobCard.job_type === 'Society' ? jobCard.contract_duration : undefined,
        is_paused: jobCard.is_paused,
        reference: jobCard.reference,
      };

      await jobCardService.updateJobCard(parseInt(id), jobCardData);
      setSuccess('Job card updated successfully!');

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/jobcards');
      }, 2000);
    } catch (err: any) {
      console.error('Error updating job card:', err);
      
      let errorMessage = 'Failed to update job card. Please check your inputs and try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else {
          const errors = Object.entries(err.response.data)
            .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
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

  const handleBack = () => {
    navigate('/jobcards');
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', mt: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Edit Job Card
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Update the job card and client details below
        </Typography>
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
              Client Details
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'visible', paddingTop: '16px' }}>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, overflow: 'visible' }}>
                <FixedTextField
                  required
                  fullWidth
                  label="Client Name"
                  name="full_name"
                  value={client.full_name}
                  onChange={handleClientChange}
                />
                <FixedTextField
                  required
                  fullWidth
                  label="Mobile Number"
                  name="mobile"
                  value={client.mobile}
                  onChange={handleClientChange}
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
                  value={client.email}
                  onChange={handleClientChange}
                />
                <FixedTextField
                  required
                  fullWidth
                  label="City"
                  name="city"
                  value={client.city}
                  onChange={handleClientChange}
                />
              </Box>
              <FixedTextField
                fullWidth
                label="Address"
                name="address"
                multiline
                rows={3}
                value={client.address}
                onChange={handleClientChange}
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
              {/* Pause Service Toggle - Moved to top */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: { xs: 'center', sm: 'flex-start' },
                alignItems: 'center',
                p: 2,
                backgroundColor: '#f8f9fa',
                borderRadius: 2,
                border: '1px solid #e9ecef'
              }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={jobCard.is_paused}
                      onChange={handlePauseToggle}
                      name="is_paused"
                      color="primary"
                      size="medium"
                    />
                  }
                  label="Pause Service"
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: { xs: '1rem', sm: '1.1rem' },
                      fontWeight: 600,
                      color: jobCard.is_paused ? '#d32f2f' : '#333',
                    },
                    '& .MuiSwitch-root': {
                      mr: 1,
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
                <FixedTextField
                  select
                  required
                  fullWidth
                  label="Customer Type *"
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
                    label="Contract Duration *"
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
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Schedule Date *"
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
                <FixedTextField
                  select
                  required
                  fullWidth
                  label="Job Status *"
                  name="status"
                  value={jobCard.status}
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
                  <MenuItem value="Enquiry">Enquiry</MenuItem>
                  <MenuItem value="WIP">Work in Progress</MenuItem>
                  <MenuItem value="Done">Completed</MenuItem>
                  <MenuItem value="Hold">On Hold</MenuItem>
                  <MenuItem value="Cancel">Cancelled</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </FixedTextField>
              </Box>
              {jobCard.job_type !== 'Society' && (
                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                  <FixedTextField
                    select
                    required
                    fullWidth
                    label="Payment Status *"
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
                </Box>
              )}
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
                  label="Service Price *"
                  name="price_subtotal"
                  type="number"
                  value={jobCard.price_subtotal}
                  onChange={handleJobCardChange}
                  inputProps={{ min: 0, step: "0.01" }}
                  helperText="Service price (tax will be calculated automatically at 18%)"
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
            gap: 2,
            pt: 3,
            borderTop: '1px solid #e0e0e0'
          }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 4,
                py: 2,
                fontSize: '1rem',
              }}
            >
              Cancel
            </Button>
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
              {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Update Job Card'}
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

export default EditJobCard;
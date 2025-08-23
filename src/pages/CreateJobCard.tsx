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
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import { clientService, jobCardService } from '../services/api';
import { JobCard } from '../types';

const CreateJobCard: React.FC = () => {
  const navigate = useNavigate();
  // Removed isLoading state as we no longer fetch clients
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Always creating new client - no toggle needed

  // Predefined service types for pest control
  const serviceTypes = [
    '🐜 Ants',
    '🪳 Cockroaches',
    '🐛 Termites',
    '🐭 Rodents (Mice/Rats)',
    '🕷️ Spiders',
    '🐝 Wasps/Bees',
    '🛏️ Bed Bugs',
    '🦟 Fleas',
    '🦟 Mosquitoes',
    '🪰 House Flies',
    '🔍 Other'
  ];

  // Form states - removed selectedClientId as we only create new clients
  const [newClient, setNewClient] = useState({
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
    notes: '',
    next_service_date: null as Date | null,
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
    const { name, value } = event.target;
    setJobCard({
      ...jobCard,
      [name]: name === 'price_subtotal' ? (value === '' ? '' : Number(value)) :
        name === 'payment_status' ? (value as 'Unpaid' | 'Paid') : value,
    });
  };

  const handleServiceTypeChange = (event: any) => {
    const value = event.target.value;
    setJobCard({
      ...jobCard,
      service_type: typeof value === 'string' ? value.split(',') : value,
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

      // Validate job card data
      if (!jobCard.service_type || jobCard.service_type.length === 0) {
        setError('Please select at least one service type.');
        return;
      }

      if (!jobCard.price_subtotal || Number(jobCard.price_subtotal) <= 0) {
        setError('Price must be greater than zero.');
        return;
      }

      // Prepare client data with cleaned mobile number
      const clientData = {
        ...newClient,
        mobile: cleanedMobile,
        email: newClient.email.trim() || undefined, // Send undefined if empty
        address: newClient.address.trim() || undefined, // Send undefined if empty
      };

      // Create new client first
      console.log('Creating client with data:', clientData);
      const newClientResponse = await clientService.createClient(clientData);
      const clientId = newClientResponse.id;

      // Create job card with default technician and tax values
      const jobCardData: Partial<JobCard> = {
        client: Number(clientId),
        service_type: jobCard.service_type.join(', '), // Join array to string
        technician_name: 'TBD', // Default value since technician field is removed
        schedule_date: jobCard.schedule_date.toISOString().split('T')[0],
        price_subtotal: Number(jobCard.price_subtotal),
        tax_percent: 18, // Default tax percentage
        payment_status: jobCard.payment_status,
        notes: jobCard.notes.trim(),
        next_service_date: jobCard.next_service_date
          ? jobCard.next_service_date.toISOString().split('T')[0]
          : undefined,
      };

      console.log('Sending job card data:', jobCardData);
      await jobCardService.createJobCard(jobCardData);
      setSuccess('Job card created successfully!');

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

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          Create Job Card
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Fill in the details below to create a new service job card
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
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

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <TextField
                  required
                  fullWidth
                  label="Client Name"
                  name="full_name"
                  value={newClient.full_name}
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
                <TextField
                  required
                  fullWidth
                  label="Mobile Number"
                  name="mobile"
                  value={newClient.mobile}
                  onChange={handleNewClientChange}
                  inputProps={{ maxLength: 10, pattern: '[0-9]{10}' }}
                  helperText="10-digit mobile number"
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
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={newClient.email}
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
                <TextField
                  required
                  fullWidth
                  label="City"
                  name="city"
                  value={newClient.city}
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
              <TextField
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

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <FormControl 
                  required 
                  fullWidth
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
                  <InputLabel id="service-type-label">Service Type *</InputLabel>
                  <Select
                    labelId="service-type-label"
                    multiple
                    value={jobCard.service_type}
                    onChange={handleServiceTypeChange}
                    input={<OutlinedInput label="Service Type *" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip 
                            key={value} 
                            label={value} 
                            size="small"
                            sx={{
                              backgroundColor: '#e8f5e9',
                              color: '#2e7d32',
                              fontWeight: 500,
                              '& .MuiChip-deleteIcon': {
                                color: '#2e7d32',
                              },
                            }}
                          />
                        ))}
                      </Box>
                    )}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                          width: 'auto',
                        },
                      },
                    }}
                  >
                    {serviceTypes.map((service) => (
                      <MenuItem 
                        key={service} 
                        value={service}
                        sx={{
                          py: 1,
                          '&:hover': {
                            backgroundColor: '#f8f9fa',
                          },
                          '&.Mui-selected': {
                            backgroundColor: '#e8f5e9',
                            '&:hover': {
                              backgroundColor: '#e0f2e1',
                            },
                          },
                        }}
                      >
                        <Checkbox 
                          checked={jobCard.service_type.indexOf(service) > -1}
                          sx={{
                            color: '#4CAF50',
                            '&.Mui-checked': {
                              color: '#4CAF50',
                            },
                          }}
                        />
                        <ListItemText 
                          primary={service}
                          sx={{
                            '& .MuiListItemText-primary': {
                              fontSize: '0.95rem',
                            },
                          }}
                        />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Schedule Date"
                    value={jobCard.schedule_date}
                    onChange={(newValue: Date | null) =>
                      setJobCard({ ...jobCard, schedule_date: newValue || new Date() })
                    }
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
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
                <TextField
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
                </TextField>
              </Box>
            </Box>
          </Box>

          {/* Pricing Details Section */}
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

            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
              <TextField
                required
                fullWidth
                label="Service Price "
                name="price_subtotal"
                type="number"
                value={jobCard.price_subtotal}
                onChange={handleJobCardChange}
                inputProps={{ min: 0, step: "0.01" }}
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

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ maxWidth: { xs: '100%', md: '50%' } }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Next Service Date (Optional)"
                    value={jobCard.next_service_date}
                    onChange={(newValue: Date | null) =>
                      setJobCard({ ...jobCard, next_service_date: newValue })
                    }
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
                        }
                      }
                    }}
                  />
                </LocalizationProvider>
              </Box>
              <TextField
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

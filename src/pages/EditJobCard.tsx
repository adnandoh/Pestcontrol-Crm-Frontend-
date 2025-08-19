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
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { clientService, jobCardService } from '../services/api';
import { JobCard } from '../types';

const EditJobCard: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    const { name, value } = event.target;
    setJobCard({
      ...jobCard,
      [name]: name === 'price_subtotal' ? (value === '' ? '' : Number(value)) :
        name === 'payment_status' ? (value as 'Unpaid' | 'Paid') :
        name === 'status' ? (value as 'Enquiry' | 'WIP' | 'Done' | 'Hold' | 'Cancel' | 'Inactive') : value,
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

      if (!jobCard.price_subtotal || Number(jobCard.price_subtotal) <= 0) {
        setError('Price must be greater than zero.');
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
    <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
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

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <TextField
                  required
                  fullWidth
                  label="Client Name *"
                  name="full_name"
                  value={client.full_name}
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
                <TextField
                  required
                  fullWidth
                  label="Mobile Number *"
                  name="mobile"
                  value={client.mobile}
                  onChange={handleClientChange}
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
                  value={client.email}
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
                <TextField
                  required
                  fullWidth
                  label="City *"
                  name="city"
                  value={client.city}
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
              <TextField
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
                    label="Schedule Date *"
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
                </TextField>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
                <TextField
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
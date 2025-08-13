import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  MenuItem,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import { clientService, jobCardService } from '../services/api';
import { Client } from '../types';

const CreateJobCard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isNewClient, setIsNewClient] = useState(false);

  // Form states
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [newClient, setNewClient] = useState({
    full_name: '',
    mobile: '',
    email: '',
    city: '',
    address: '',
  });
  const [jobCard, setJobCard] = useState({
    service_type: '',
    schedule_date: new Date(),
    technician_name: '',
    total_price: 0,
    payment_status: 'Unpaid' as 'Unpaid' | 'Paid',
    notes: '',
    next_service_date: null as Date | null,
  });

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const response = await clientService.getClients();
        setClients(response.results);
      } catch (err) {
        console.error('Error fetching clients:', err);
        setError('Failed to load clients. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, []);

  const handleClientChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedClientId(Number(event.target.value));
  };

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
      [name]: name === 'total_price' ? Number(value) :
        name === 'payment_status' ? (value as 'Unpaid' | 'Paid') : value,
    });
  };



  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      setError(null);

      let clientId = selectedClientId;

      // If creating a new client
      if (isNewClient) {
        const newClientResponse = await clientService.createClient(newClient);
        clientId = newClientResponse.id;
      }

      // Create job card
      const jobCardData = {
        ...jobCard,
        client: clientId === '' ? 0 : clientId, // Ensure client is always a number
        schedule_date: jobCard.schedule_date.toISOString().split('T')[0],
        next_service_date: jobCard.next_service_date
          ? jobCard.next_service_date.toISOString().split('T')[0]
          : undefined,
      };

      await jobCardService.createJobCard(jobCardData);
      setSuccess('Job card created successfully!');

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/jobcards');
      }, 2000);
    } catch (err) {
      console.error('Error creating job card:', err);
      setError('Failed to create job card. Please check your inputs and try again.');
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
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 3,
              pb: 2,
              borderBottom: '2px solid #f0f0f0'
            }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
                Client Details
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={isNewClient}
                    onChange={() => setIsNewClient(!isNewClient)}
                    color="primary"
                  />
                }
                label="Add New Client"
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontWeight: 500,
                    fontSize: '0.9rem'
                  }
                }}
              />
            </Box>

            <Grid container spacing={3}>

              {isNewClient ? (
                // New client form
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      required
                      fullWidth
                      label="Client Name *"
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
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      required
                      fullWidth
                      label="Mobile Number *"
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
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={newClient.email}
                      onChange={handleNewClientChange}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 0,
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
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      required
                      fullWidth
                      label="City *"
                      name="city"
                      value={newClient.city}
                      onChange={handleNewClientChange}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 0,
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
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Address *"
                      name="address"
                      multiline
                      rows={3}
                      value={newClient.address}
                      onChange={handleNewClientChange}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: "8px",
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
                  </Grid>
                </>
              ) : (
                // Existing client selection
                <Grid size={{ xs: 12 }}>
                  <TextField
                    select
                    required
                    fullWidth
                    label="Select Client *"
                    value={selectedClientId}
                    onChange={handleClientChange}
                    disabled={isLoading}
                    SelectProps={{
                      MenuProps: {
                        PaperProps: {
                          style: {
                            maxHeight: 300,
                            width: 'auto',
                          },
                        },
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: "8px",
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
                    <MenuItem value="" disabled>
                      <em>Choose a client...</em>
                    </MenuItem>
                    {clients.map((client) => (
                      <MenuItem 
                        key={client.id} 
                        value={client.id}
                        sx={{
                          py: 1.5,
                          borderBottom: '1px solid #f0f0f0',
                          '&:hover': {
                            backgroundColor: '#f8f9fa',
                          },
                          '&:last-child': {
                            borderBottom: 'none',
                          },
                        }}
                      >
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                            {client.full_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            📱 {client.mobile} • 📍 {client.city}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                  {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  )}
                </Grid>
              )}
            </Grid>
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

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  required
                  fullWidth
                  label="Service Type *"
                  name="service_type"
                  value={jobCard.service_type}
                  onChange={handleJobCardChange}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: "8px",
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
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  required
                  fullWidth
                  label="Technician *"
                  name="technician_name"
                  value={jobCard.technician_name}
                  onChange={handleJobCardChange}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: "8px",
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
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
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
                            borderRadius: "8px",
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
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
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
                      borderRadius: "8px",
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
              </Grid>
            </Grid>
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

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  required
                  fullWidth
                  label="Total Price *"
                  name="total_price"
                  type="number"
                  value={jobCard.total_price}
                  onChange={handleJobCardChange}
                  inputProps={{ min: 0 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: "8px",
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
              </Grid>
            </Grid>
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

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
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
                            borderRadius: "8px",
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
              </Grid>

              <Grid size={{ xs: 12 }}>
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
                      borderRadius: "8px",
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
              </Grid>
            </Grid>
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
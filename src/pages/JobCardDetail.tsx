import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Paper,
  Box,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Assignment as JobCardIcon,
  Person as ClientIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
  Payment as PaymentIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { jobCardService } from '../services/api';
import { JobCard } from '../types';
import { useAuth } from '../contexts/AuthContext';

const JobCardDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobCard = async () => {
      if (!id || !isAuthenticated) return;

      // Validate that id is a valid number
      const jobCardId = parseInt(id, 10);
      if (isNaN(jobCardId)) {
        setError('Invalid job card ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('Fetching job card with ID:', jobCardId);
        const data = await jobCardService.getJobCard(jobCardId);
        setJobCard(data);
      } catch (err) {
        console.error('Error fetching job card:', err);
        setError('Failed to load job card details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && !authLoading) {
      fetchJobCard();
    }
  }, [id, isAuthenticated, authLoading]);

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Don't render the component if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const handleBack = () => {
    navigate('/jobcards');
  };

  const handleEdit = () => {
    navigate(`/jobcards/${id}/edit`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enquiry':
        return '#FFF9C4'; // Light yellow
      case 'WIP':
        return '#BBDEFB'; // Light blue
      case 'Done':
        return '#C8E6C9'; // Light green
      case 'Hold':
        return '#FFCCBC'; // Light orange
      case 'Cancel':
        return '#FFCDD2'; // Light red
      case 'Inactive':
        return '#E0E0E0'; // Light grey
      default:
        return 'transparent';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    return status === 'Paid' ? '#C8E6C9' : '#FFCDD2'; // Green for paid, red for unpaid
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBackIcon />}>
          Back to Job Cards
        </Button>
      </Box>
    );
  }

  if (!jobCard) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Job card not found
        </Alert>
        <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBackIcon />}>
          Back to Job Cards
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: '1400px', mx: 'auto' }}>
      {/* Breadcrumb Navigation */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Agent Booking / View Booking / {jobCard.code?.replace('JC-', '') || ''}
        </Typography>
      </Box>

      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', md: 'center' },
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        mb: 4 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            Job Card Details
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={handleEdit}
          sx={{ 
            bgcolor: '#4CAF50', 
            '&:hover': { bgcolor: '#45a049' },
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.5,
          }}
        >
          Edit
        </Button>
      </Box>

      {/* Job Card ID and Status */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 4, 
          border: '1px solid #e0e0e0',
          borderRadius: 3,
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              p: 1.5, 
              borderRadius: 2, 
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <JobCardIcon />
            </Box>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: '#1976d2' }}>
              {jobCard.code?.replace('JC-', '') || ''}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              label={jobCard.status}
              sx={{
                backgroundColor: getStatusColor(jobCard.status),
                fontWeight: 600,
                fontSize: '0.875rem',
                height: 36,
                borderRadius: 2,
                border: '1px solid rgba(0,0,0,0.1)',
              }}
            />
            <Chip
              label={jobCard.payment_status}
              sx={{
                backgroundColor: getPaymentStatusColor(jobCard.payment_status),
                fontWeight: 600,
                fontSize: '0.875rem',
                height: 36,
                borderRadius: 2,
                border: '1px solid rgba(0,0,0,0.1)',
              }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Information Cards Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}>
        {/* Client Information */}
        <Card 
          elevation={0}
          sx={{ 
            border: '1px solid #e0e0e0',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ 
            p: 2, 
            bgcolor: '#f5f5f5',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}>
            <Box sx={{ 
              p: 1, 
              borderRadius: 1.5, 
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ClientIcon fontSize="small" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
              Client Information
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                Client Name
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                {jobCard.client_name}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                Mobile
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
                <PhoneIcon fontSize="small" color="primary" />
                {jobCard.client_mobile}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                City
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
                <LocationIcon fontSize="small" color="primary" />
                {jobCard.client_city}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Service Information */}
        <Card 
          elevation={0}
          sx={{ 
            border: '1px solid #e0e0e0',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ 
            p: 2, 
            bgcolor: '#f5f5f5',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}>
            <Box sx={{ 
              p: 1, 
              borderRadius: 1.5, 
              bgcolor: 'secondary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <JobCardIcon fontSize="small" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
              Service Information
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                Service Type
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                {jobCard.service_type}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                Technician
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {jobCard.technician_name}
              </Typography>
            </Box>

            <Box sx={{ mb: jobCard.next_service_date ? 3 : 0 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                Schedule Date
              </Typography>
              <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
                <ScheduleIcon fontSize="small" color="primary" />
                {formatDate(jobCard.schedule_date)}
              </Typography>
            </Box>

            {jobCard.next_service_date && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Next Service Date
                </Typography>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 500 }}>
                  <ScheduleIcon fontSize="small" color="primary" />
                  {formatDate(jobCard.next_service_date)}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Financial and Notes Section */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: jobCard.notes ? '1fr 1fr' : '1fr' }, gap: 3, mb: 4 }}>
        {/* Financial Information */}
        <Card 
          elevation={0}
          sx={{ 
            border: '1px solid #e0e0e0',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ 
            p: 2, 
            bgcolor: '#f5f5f5',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}>
            <Box sx={{ 
              p: 1, 
              borderRadius: 1.5, 
              bgcolor: 'success.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PaymentIcon fontSize="small" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
              Financial Information
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                Subtotal
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                {formatCurrency(jobCard.price_subtotal)}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                Tax ({jobCard.tax_percent}%)
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '1rem' }}>
                {formatCurrency((jobCard.price_subtotal * jobCard.tax_percent) / 100)}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                Grand Total
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                {formatCurrency(jobCard.grand_total)}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Notes */}
        {jobCard.notes && (
          <Card 
            elevation={0}
            sx={{ 
              border: '1px solid #e0e0e0',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ 
              p: 2, 
              bgcolor: '#f5f5f5',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5
            }}>
              <Box sx={{ 
                p: 1, 
                borderRadius: 1.5, 
                bgcolor: 'info.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <NotesIcon fontSize="small" />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
                Notes
              </Typography>
            </Box>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="body1" sx={{ lineHeight: 1.6, color: '#555' }}>
                {jobCard.notes}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Timestamps */}
      <Card 
        elevation={0}
        sx={{ 
          border: '1px solid #e0e0e0',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ 
          p: 2, 
          bgcolor: '#f5f5f5',
          borderBottom: '1px solid #e0e0e0',
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#333' }}>
            Timestamps
          </Typography>
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                Created
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {formatDate(jobCard.created_at)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
                Last Updated
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {formatDate(jobCard.updated_at)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default JobCardDetail; 
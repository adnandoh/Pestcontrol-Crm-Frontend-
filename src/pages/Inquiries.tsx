import React, { useEffect, useState, useCallback } from 'react';
import {
  Button,
  Box,
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
// import { useNavigate } from 'react-router-dom'; // Removed - not used in current implementation
import { inquiryService } from '../services/api';
import { Inquiry } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import ModernTable from '../components/ModernTable';

const Inquiries: React.FC = () => {
  // Removed unused navigate - navigation handled by table actions
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { markInquiryAsRead } = useNotifications();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'New', label: 'New' },
    { value: 'Contacted', label: 'Contacted' },
    { value: 'Converted', label: 'Converted' },
    { value: 'Closed', label: 'Closed' },
  ];

  const fetchInquiries = useCallback(async () => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params: any = {};
      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await inquiryService.getInquiries(params);
      setInquiries(response.results);
      setTotalCount(response.count);
    } catch (err) {
      console.error('Error fetching inquiries:', err);
      setError('Failed to load inquiries. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, isAuthenticated]);

  useEffect(() => {
    // Only fetch inquiries when authenticated
    if (isAuthenticated && !authLoading) {
      fetchInquiries();
    }
  }, [fetchInquiries, isAuthenticated, authLoading]);

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


  const handleViewInquiry = async (id: number) => {
    try {
      // Mark inquiry as read when viewing
      await markInquiryAsRead(id);
      setSuccess('Inquiry marked as read!');
      fetchInquiries(); // Refresh the list
    } catch (err) {
      console.error('Error marking inquiry as read:', err);
      setError('Failed to mark inquiry as read. Please try again.');
    }
  };

  const handleConvertToJob = async (id: number) => {
    try {
      setIsConverting(true);
      setConvertingId(id);
      setError(null);

      const response = await inquiryService.convertToJobCard(id);
      setSuccess(`Inquiry converted to Job Card ${response.code} successfully!`);
      fetchInquiries(); // Refresh the list
    } catch (err) {
      console.error('Error converting inquiry to job card:', err);
      setError('Failed to convert inquiry to job card. Please try again.');
    } finally {
      setIsConverting(false);
      setConvertingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return { bg: '#E3F2FD', color: '#1565C0' };
      case 'Contacted':
        return { bg: '#FFF9C4', color: '#F57F17' };
      case 'Converted':
        return { bg: '#C8E6C9', color: '#388E3C' };
      case 'Closed':
        return { bg: '#E0E0E0', color: '#616161' };
      default:
        return { bg: 'transparent', color: 'inherit' };
    }
  };

  return (
    <Box sx={{ maxWidth: '1600px', mx: 'auto' }}>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <ModernTable
          title="Inquiries"
          totalCount={totalCount}
          page={page}
          rowsPerPage={10}
          onPageChange={setPage}
          filters={
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{
                minWidth: 120,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                },
              }}
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          }
          columns={[
            { id: 'name', label: 'Name', minWidth: 150 },
            { id: 'mobile', label: 'Mobile', minWidth: 120 },
            { id: 'email', label: 'Email', minWidth: 150 },
            { id: 'service_interest', label: 'Service Interest', minWidth: 150 },
            { id: 'city', label: 'City', minWidth: 100 },
            { id: 'status', label: 'Status', minWidth: 100 },
            { id: 'created_at', label: 'Created Date', minWidth: 120, format: (value: string) => formatDate(value) },
            { id: 'actions', label: 'Actions', minWidth: 200 },
          ]}
          rows={inquiries.length > 0 ? inquiries.map(inquiry => ({
            name: inquiry.name,
            mobile: inquiry.mobile,
            email: inquiry.email || '-',
            service_interest: inquiry.service_interest,
            city: inquiry.city,
            status: (
              <Chip
                label={inquiry.status}
                size="small"
                sx={{
                  backgroundColor: getStatusColor(inquiry.status).bg,
                  color: getStatusColor(inquiry.status).color,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  height: 24,
                  borderRadius: 1,
                }}
              />
            ),
            created_at: inquiry.created_at,
            actions: (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleViewInquiry(inquiry.id)}
                  sx={{
                    borderColor: '#1976D2',
                    color: '#1976D2',
                    '&:hover': { 
                      borderColor: '#1565C0',
                      backgroundColor: '#E3F2FD'
                    },
                    borderRadius: 1,
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    px: 2,
                    py: 0.5,
                  }}
                >
                  View Details
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleConvertToJob(inquiry.id)}
                  disabled={
                    inquiry.status === 'Converted' ||
                    inquiry.status === 'Closed' ||
                    isConverting
                  }
                  sx={{
                    bgcolor: '#2E7D32',
                    '&:hover': { bgcolor: '#1B5E20' },
                    '&.Mui-disabled': { bgcolor: '#E0E0E0' },
                    borderRadius: 1,
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    px: 2,
                    py: 0.5,
                  }}
                >
                  {isConverting && convertingId === inquiry.id ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    'Convert to Job'
                  )}
                </Button>
              </Box>
            ),
          })) : []}
        />
      )}

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

export default Inquiries;
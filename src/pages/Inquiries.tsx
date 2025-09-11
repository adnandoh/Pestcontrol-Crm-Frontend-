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
import { useNavigate } from 'react-router-dom';
import { inquiryService } from '../services/api';
import { Inquiry } from '../types';
import { useAuth } from '../contexts/AuthContext';
import ModernTable from '../components/ModernTable';
import SortSelector from '../components/SortSelector';
import { SORT_OPTIONS, getDefaultSorting, addSortingToParams } from '../utils/sorting';

const Inquiries: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>(getDefaultSorting('INQUIRIES'));

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
      if (page > 0) {
        params.page = page + 1; // Convert from 0-based to 1-based
      }

      // Add sorting parameter
      const paramsWithSorting = addSortingToParams(params, sortBy);

      const response = await inquiryService.getInquiries(paramsWithSorting);
      setInquiries(response.results);
      setTotalCount(response.count);
    } catch (err) {
      console.error('Error fetching inquiries:', err);
      setError('Failed to load inquiries. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, isAuthenticated, page, sortBy]);

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




  const handleConvertToJob = async (id: number) => {
    try {
      setIsConverting(true);
      setConvertingId(id);
      setError(null);

      // Get the inquiry data first
      const inquiry = inquiries.find(inq => inq.id === id);
      if (!inquiry) {
        setError('Inquiry not found');
        return;
      }

      // Navigate to CreateJobCard with inquiry data
      navigate('/jobcards/create', { 
        state: { 
          fromInquiry: true, 
          inquiryData: inquiry 
        } 
      });
    } catch (err) {
      console.error('Error preparing inquiry for job card conversion:', err);
      setError('Failed to prepare inquiry for job card conversion. Please try again.');
    } finally {
      setIsConverting(false);
      setConvertingId(null);
    }
  };

  const handleDeleteInquiry = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this inquiry? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      setDeletingId(id);
      setError(null);

      await inquiryService.deleteInquiry(id);
      setSuccess('Inquiry deleted successfully!');
      
      // Refresh the inquiries list
      await fetchInquiries();
    } catch (err) {
      console.error('Error deleting inquiry:', err);
      setError('Failed to delete inquiry. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return { bg: '#E3F2FD', color: '#1565C0', border: '#1565C0' };
      case 'Contacted':
        return { bg: '#FFF9C4', color: '#F57F17', border: '#F57F17' };
      case 'Converted':
        return { bg: '#C8E6C9', color: '#388E3C', border: '#388E3C' };
      case 'Closed':
        return { bg: '#E0E0E0', color: '#616161', border: '#616161' };
      default:
        return { bg: '#F5F5F5', color: '#666666', border: '#CCCCCC' };
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <ModernTable
          title="Inquiries"
          totalCount={totalCount}
          page={page}
          rowsPerPage={20}
          onPageChange={setPage}
          filters={
            <>
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
              <SortSelector
                value={sortBy}
                onChange={setSortBy}
                options={SORT_OPTIONS.INQUIRIES}
                label="Sort by"
                size="small"
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setStatusFilter('');
                  setSortBy(getDefaultSorting('INQUIRIES'));
                }}
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 2,
                }}
              >
                Clear
              </Button>
            </>
          }
          columns={[
            { id: 'name', label: 'Name', minWidth: 150 },
            { id: 'mobile', label: 'Mobile', minWidth: 120 },
            { id: 'email', label: 'Email', minWidth: 150 },
            { id: 'service_interest', label: 'Service Interest', minWidth: 150 },
            { id: 'city', label: 'City', minWidth: 100 },
            { id: 'status', label: 'Status', minWidth: 120, align: 'center' },
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
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Chip
                  label={inquiry.status}
                  size="small"
                  variant="outlined"
                  className="status-badge"
                  sx={{
                    backgroundColor: getStatusColor(inquiry.status).bg,
                    color: getStatusColor(inquiry.status).color,
                    borderColor: getStatusColor(inquiry.status).border,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    height: 28,
                    minWidth: 60,
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '& .MuiChip-label': {
                      padding: '0 8px',
                      fontWeight: 600,
                      display: 'block',
                      whiteSpace: 'nowrap',
                    },
                    '&:hover': {
                      backgroundColor: getStatusColor(inquiry.status).bg,
                      opacity: 0.9,
                    },
                  }}
                />
              </Box>
            ),
            created_at: inquiry.created_at,
            actions: (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleConvertToJob(inquiry.id)}
                  disabled={
                    inquiry.status === 'Converted' ||
                    inquiry.status === 'Closed' ||
                    isConverting ||
                    isDeleting
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
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleDeleteInquiry(inquiry.id)}
                  disabled={isConverting || isDeleting}
                  sx={{
                    color: '#d32f2f',
                    borderColor: '#d32f2f',
                    '&:hover': { 
                      bgcolor: '#ffebee',
                      borderColor: '#c62828'
                    },
                    '&.Mui-disabled': { 
                      color: '#bdbdbd',
                      borderColor: '#e0e0e0'
                    },
                    borderRadius: 1,
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    px: 2,
                    py: 0.5,
                  }}
                >
                  {isDeleting && deletingId === inquiry.id ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    'Delete'
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
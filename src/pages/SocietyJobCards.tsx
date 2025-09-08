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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Edit as EditIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { jobCardService } from '../services/api';
import { JobCard } from '../types';
import { useAuth } from '../contexts/AuthContext';
import ModernTable from '../components/ModernTable';

const SocietyJobCards: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [contractFilter, setContractFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fromDate, setFromDate] = useState<Date | null>(null);

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Enquiry', label: 'Enquiry' },
    { value: 'WIP', label: 'Work in Progress' },
    { value: 'Done', label: 'Completed' },
    { value: 'Hold', label: 'On Hold' },
    { value: 'Cancel', label: 'Cancelled' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const contractOptions = [
    { value: '', label: 'All Contracts' },
    { value: '12', label: '12 Months' },
    { value: '6', label: '6 Months' },
    { value: '3', label: '3 Months' },
  ];

  const fetchJobCards = useCallback(async () => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params: any = {
        job_type: 'Society', // Filter for Society job cards only
        status: statusFilter,
        contract_duration: contractFilter,
        q: searchQuery,
      };

      if (fromDate) {
        params.from = fromDate.toISOString().split('T')[0];
      }
      if (page > 0) {
        params.page = page + 1; // Convert from 0-based to 1-based
      }

      const response = await jobCardService.getJobCards(params);
      console.log('Society job cards response:', response);
      console.log('Society job cards data:', response.results);
      setJobCards(response.results);
      setTotalCount(response.count);
    } catch (err) {
      console.error('Error fetching society job cards:', err);
      setError('Failed to load society job cards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, contractFilter, searchQuery, fromDate, isAuthenticated, page]);

  useEffect(() => {
    // Only fetch job cards when authenticated
    if (isAuthenticated && !authLoading) {
      fetchJobCards();
    }
  }, [fetchJobCards, isAuthenticated, authLoading]);

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

  const handleEditJobCard = (id: number) => {
    console.log('Navigating to job card edit with ID:', id);
    if (!id || isNaN(id)) {
      console.error('Invalid job card ID:', id);
      setError('Invalid job card ID');
      return;
    }
    navigate(`/jobcards/${id}/edit`);
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
      case 'Enquiry':
        return { bg: '#FFF9C4', color: '#F57F17' };
      case 'WIP':
        return { bg: '#BBDEFB', color: '#1976D2' };
      case 'Done':
        return { bg: '#C8E6C9', color: '#388E3C' };
      case 'Hold':
        return { bg: '#FFCCBC', color: '#F57C00' };
      case 'Cancel':
        return { bg: '#FFCDD2', color: '#D32F2F' };
      case 'Inactive':
        return { bg: '#E0E0E0', color: '#616161' };
      default:
        return { bg: 'transparent', color: 'inherit' };
    }
  };

  const getContractLabel = (duration?: string) => {
    if (!duration) return 'N/A';
    return `${duration} Months`;
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        {/* Header content can be added here if needed */}
      </Box>

      {/* Modern Table */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <ModernTable
          title="Society Job Cards"
          totalCount={totalCount}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          page={page}
          rowsPerPage={20}
          onPageChange={setPage}
          filters={
            <>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Select Date"
                  value={fromDate}
                  onChange={(newValue: Date | null) => setFromDate(newValue)}
                  format="dd/MM/yy"
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: {
                        minWidth: 150,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1,
                        },
                      },
                    },
                  }}
                />
              </LocalizationProvider>
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
              <TextField
                select
                size="small"
                label="Contract Duration"
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                sx={{
                  minWidth: 150,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  },
                }}
              >
                {contractOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setStatusFilter('');
                  setContractFilter('');
                  setSearchQuery('');
                  setFromDate(null);
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
              <Button
                variant="contained"
                size="small"
                onClick={fetchJobCards}
                sx={{
                  bgcolor: '#007bff',
                  '&:hover': { bgcolor: '#0056b3' },
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 2,
                }}
              >
                Search
              </Button>
            </>
          }
          columns={[
            { id: 'booking_id', label: 'Id', minWidth: 100 },
            { id: 'client_name', label: 'Client Name', minWidth: 120 },
            { id: 'mobile_number', label: 'Mobile Number', minWidth: 120 },
            { id: 'client_address', label: 'Client Address', minWidth: 150 },
            { id: 'schedule_date', label: 'Schedule Date', minWidth: 120 },
            { id: 'contract_duration', label: 'Contract Duration', minWidth: 130 },
            { id: 'status', label: 'Status', minWidth: 100 },
            { id: 'actions', label: 'Actions', minWidth: 100 },
          ]}
          rows={jobCards.length > 0 ? jobCards.map(jobCard => ({
            booking_id: jobCard.code,
            client_name: jobCard.client_name,
            mobile_number: jobCard.client_mobile,
            client_address: jobCard.client_city,
            schedule_date: formatDate(jobCard.schedule_date),
            contract_duration: getContractLabel(jobCard.contract_duration),
            status: (
              <Chip
                label={jobCard.status}
                size="small"
                sx={{
                  backgroundColor: getStatusColor(jobCard.status).bg,
                  color: getStatusColor(jobCard.status).color,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  height: 24,
                  borderRadius: 1,
                }}
              />
            ),
            actions: (
              <Button
                variant="contained"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => handleEditJobCard(jobCard.id)}
                sx={{
                  bgcolor: '#4CAF50',
                  '&:hover': { bgcolor: '#45a049' },
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  px: 2,
                  py: 0.5,
                }}
              >
                Edit
              </Button>
            ),
          })) : []}
        />
      )}

      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SocietyJobCards;
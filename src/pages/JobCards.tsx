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
import ServiceTypesDisplay from '../components/ServiceTypesDisplay';
import AddressDisplay from '../components/AddressDisplay';
import SortSelector from '../components/SortSelector';
import { SORT_OPTIONS, getDefaultSorting, addSortingToParams } from '../utils/sorting';
import { 
  handleSearchInputChange, 
  handleSearchSubmission, 
  validateSearchInput 
} from '../utils/searchValidation';

const JobCards: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [cityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<string>(getDefaultSorting('JOB_CARDS'));

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Enquiry', label: 'Enquiry' },
    { value: 'WIP', label: 'Work in Progress' },
    { value: 'Done', label: 'Completed' },
    { value: 'Hold', label: 'On Hold' },
    { value: 'Cancel', label: 'Cancelled' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const fetchJobCards = useCallback(async (searchTerm?: string) => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params: any = {
        job_type: 'Customer', // Filter for Customer job cards only
        status: statusFilter,
        city: cityFilter,
        q: searchTerm !== undefined ? searchTerm : searchQuery,
      };

      // Add sorting parameter
      const paramsWithSorting = addSortingToParams(params, sortBy);

      if (fromDate) {
        paramsWithSorting.from = fromDate.toISOString().split('T')[0];
      }
      if (page > 0) {
        paramsWithSorting.page = page + 1; // Convert from 0-based to 1-based
      }

      const response = await jobCardService.getJobCards(paramsWithSorting);
      console.log('Job cards response:', response);
      console.log('Job cards data:', response.results);
      setJobCards(response.results);
      setTotalCount(response.count);
    } catch (err) {
      console.error('Error fetching job cards:', err);
      setError('Failed to load job cards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, cityFilter, fromDate, isAuthenticated, page, sortBy]);

  useEffect(() => {
    // Only fetch job cards when authenticated and on initial load or filter changes
    if (isAuthenticated && !authLoading) {
      fetchJobCards();
    }
  }, [statusFilter, cityFilter, fromDate, isAuthenticated, authLoading, page, sortBy]);

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

  // Handle search input change with validation
  const handleSearchChange = (value: string) => {
    handleSearchInputChange(value, setSearchQuery, setSearchError);
  };

  // Handle search on Enter key press
  const handleSearchKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearchSubmission(searchQuery, setSearchError, () => fetchJobCards(searchQuery));
    }
  };

  // Handle search button click
  const handleSearchSubmit = () => {
    handleSearchSubmission(searchQuery, setSearchError, () => fetchJobCards(searchQuery));
  };

  // Handle search clear
  const handleSearchClear = () => {
    setSearchQuery('');
    setSearchError(null);
    fetchJobCards(''); // Clear search by passing empty string
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


  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>

      {/* Modern Table */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <ModernTable
          title="Customer Job Cards"
          totalCount={totalCount}
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          searchError={searchError}
          onSearchKeyPress={handleSearchKeyPress}
          onSearchSubmit={handleSearchSubmit}
          onSearchClear={handleSearchClear}
          searchContext="jobcards"
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
              <SortSelector
                value={sortBy}
                onChange={setSortBy}
                options={SORT_OPTIONS.JOB_CARDS}
                label="Sort by"
                size="small"
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setStatusFilter('');
                  setSearchQuery('');
                  setSearchError(null);
                  setFromDate(null);
                  setSortBy(getDefaultSorting('JOB_CARDS'));
                  fetchJobCards(''); // Clear search
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
            { id: 'booking_id', label: 'Id', minWidth: 100 },
            { id: 'client_name', label: 'Client Name', minWidth: 120 },
            { id: 'mobile_number', label: 'Mobile Number', minWidth: 120 },
            { id: 'client_address', label: 'Client Address', minWidth: 150 },
            { id: 'service_types', label: 'Service Types', minWidth: 200 },
            { id: 'schedule_date', label: 'Schedule Date', minWidth: 120 },
            { id: 'status', label: 'Status', minWidth: 100 },
            { id: 'actions', label: 'Actions', minWidth: 100 },
          ]}
          rows={jobCards.length > 0 ? jobCards.map(jobCard => ({
            booking_id: jobCard.code?.replace('JC-', '') || '',
            client_name: jobCard.client_name,
            mobile_number: jobCard.client_mobile,
            client_address: (
              <AddressDisplay
                address={jobCard.client_city || ''}
                maxWords={4}
                showViewMore={true}
              />
            ),
            service_types: (
              <ServiceTypesDisplay
                serviceTypes={jobCard.service_type || ''}
                maxDisplay={2}
                showViewMore={true}
              />
            ),
            schedule_date: formatDate(jobCard.schedule_date),
            status: (
              <Chip
                label={jobCard.status}
                size="small"
                sx={{
                  backgroundColor: getStatusColor(jobCard.status).bg,
                  color: getStatusColor(jobCard.status).color,
                  fontWeight: 500,
                  fontSize: '0.65rem',
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
                  fontSize: '0.65rem',
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

export default JobCards;
import React, { useEffect, useState, useCallback } from 'react';
import {
  Typography,
  Paper,
  Button,
  Box,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardContent,
  Chip,
  useTheme,
  useMediaQuery,
  Pagination,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { jobCardService } from '../services/api';
import { JobCard } from '../types';
import { useAuth } from '../contexts/AuthContext';
import ResponsiveTable from '../components/ResponsiveTable';
import ModernTable from '../components/ModernTable';

const JobCards: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Enquiry', label: 'Enquiry' },
    { value: 'WIP', label: 'Work in Progress' },
    { value: 'Done', label: 'Completed' },
    { value: 'Hold', label: 'On Hold' },
    { value: 'Cancel', label: 'Cancelled' },
    { value: 'Inactive', label: 'Inactive' },
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
        status: statusFilter,
        city: cityFilter,
        q: searchQuery,
      };

      if (fromDate) {
        params.from = fromDate.toISOString().split('T')[0];
      }

      if (toDate) {
        params.to = toDate.toISOString().split('T')[0];
      }

      const response = await jobCardService.getJobCards(params);
      setJobCards(response.results);
      setTotalCount(response.count);
    } catch (err) {
      console.error('Error fetching job cards:', err);
      setError('Failed to load job cards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, cityFilter, searchQuery, fromDate, toDate, isAuthenticated]);

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

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCreateJobCard = () => {
    navigate('/jobcards/create');
  };

  const handleViewJobCard = (id: number) => {
    navigate(`/jobcards/${id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
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

  // Define table columns
  const columns = [
    { id: 'code', label: 'Job ID', minWidth: 120 },
    { id: 'client_name', label: 'Client Name', minWidth: 150 },
    { id: 'client_mobile', label: 'Mobile', minWidth: 120 },
    { id: 'client_city', label: 'City', minWidth: 100 },
    { id: 'service_type', label: 'Service Type', minWidth: 150 },
    { id: 'status', label: 'Status', minWidth: 100 },
    { id: 'schedule_date', label: 'Date', minWidth: 120, format: (value: string) => formatDate(value) },
    { id: 'grand_total', label: 'Amount', minWidth: 120, format: (value: number) => formatCurrency(value) },
    { id: 'actions', label: 'Actions', minWidth: 100 },
  ];

  // Mobile card render function
  const renderMobileCard = (jobCard: JobCard, index: number) => {
    const statusStyle = getStatusColor(jobCard.status);

    return (
      <Card
        key={jobCard.id}
        elevation={0}
        sx={{
          border: '1px solid #e0e0e0',
          borderRadius: 3,
          overflow: 'hidden',
          '&:hover': {
            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            transform: 'translateY(-2px)',
            transition: 'all 0.2s ease-in-out',
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
              {jobCard.code}
            </Typography>
            <Chip
              label={jobCard.status}
              sx={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.color,
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 28,
              }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
              {jobCard.client_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <PhoneIcon fontSize="small" />
              {jobCard.client_mobile}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationIcon fontSize="small" />
              {jobCard.client_city}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Service: {jobCard.service_type}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ScheduleIcon fontSize="small" />
              {formatDate(jobCard.schedule_date)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50' }}>
              {formatCurrency(jobCard.grand_total)}
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<ViewIcon />}
              onClick={() => handleViewJobCard(jobCard.id)}
              sx={{
                bgcolor: '#4CAF50',
                '&:hover': { bgcolor: '#45a049' },
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              View
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ maxWidth: '1600px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        mb: 4
      }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateJobCard}
          sx={{
            bgcolor: '#4CAF50',
            '&:hover': { bgcolor: '#45a049' },
            borderRadius: 0,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.5,
          }}
        >
          Create Job Card
        </Button>
      </Box>

      {/* Modern Table */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <ModernTable
          title="View Booking"
          totalCount={totalCount}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          filters={
            <>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Select Date"
                  value={fromDate}
                  onChange={(newValue: Date | null) => setFromDate(newValue)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: {
                        minWidth: 150,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1,
                        },
                      }
                    }
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
                label="Booking For"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                sx={{
                  minWidth: 120,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  },
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Local">Local</MenuItem>
                <MenuItem value="Outstation">Outstation</MenuItem>
              </TextField>
              <Button
                variant="outlined"
                size="small"
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
            { id: 'booking_id', label: 'Booking Id', minWidth: 100 },
            { id: 'client_name', label: 'Client Name', minWidth: 120 },
            { id: 'mobile_number', label: 'Mobile Number', minWidth: 120 },
            { id: 'client_address', label: 'Client Address', minWidth: 150 },
            { id: 'booking_for', label: 'Booking For', minWidth: 100 },
            { id: 'status', label: 'Status', minWidth: 100 },
          ]}
          rows={jobCards.length > 0 ? jobCards.map(jobCard => ({
            booking_id: jobCard.code,
            client_name: jobCard.client_name,
            mobile_number: jobCard.client_mobile,
            client_address: jobCard.client_city,
            booking_for: jobCard.service_type,
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
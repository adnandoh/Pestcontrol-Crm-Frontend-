import React, { useEffect, useState, useCallback } from 'react';
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import CustomPagination from '../components/CustomPagination';
import { Add as AddIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { inquiryService } from '../services/api';
import { Inquiry } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Inquiries: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStatusFilter(event.target.value);
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

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Inquiries
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Status"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              variant="outlined"
              margin="normal"
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Service Interest</TableCell>
                  <TableCell>City</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inquiries.length > 0 ? (
                  inquiries
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((inquiry) => (
                      <TableRow key={inquiry.id} hover>
                        <TableCell>{inquiry.name}</TableCell>
                        <TableCell>{inquiry.mobile}</TableCell>
                        <TableCell>{inquiry.email || '-'}</TableCell>
                        <TableCell>{inquiry.service_interest}</TableCell>
                        <TableCell>{inquiry.city}</TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'inline-block',
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              backgroundColor: (() => {
                                switch (inquiry.status) {
                                  case 'New':
                                    return '#E3F2FD'; // Light blue
                                  case 'Contacted':
                                    return '#FFF9C4'; // Light yellow
                                  case 'Converted':
                                    return '#C8E6C9'; // Light green
                                  case 'Closed':
                                    return '#E0E0E0'; // Light grey
                                  default:
                                    return 'transparent';
                                }
                              })(),
                            }}
                          >
                            {inquiry.status}
                          </Box>
                        </TableCell>
                        <TableCell>{formatDate(inquiry.created_at)}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
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
                            }}
                          >
                            {isConverting && convertingId === inquiry.id ? (
                              <CircularProgress size={24} color="inherit" />
                            ) : (
                              'Convert to Job'
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No inquiries found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <CustomPagination
            count={Math.ceil(totalCount / rowsPerPage)}
            page={page + 1}
            onChange={(event, value) => setPage(value - 1)}
          />
        </Paper>
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
    </>
  );
};

export default Inquiries;
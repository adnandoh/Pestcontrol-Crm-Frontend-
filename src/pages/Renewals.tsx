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
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import CustomPagination from '../components/CustomPagination';
import { useNavigate } from 'react-router-dom';
import { renewalService } from '../services/api';
import { Renewal } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Renewals: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const fetchRenewals = useCallback(async () => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params: any = {};
      if (tabValue === 0) {
        // Due in 7 days
        const today = new Date();
        const in7Days = new Date(today);
        in7Days.setDate(today.getDate() + 7);
        params.due_date_gte = today.toISOString();
        params.due_date_lte = in7Days.toISOString();
      } else if (tabValue === 1) {
        // Due in 15 days
        const today = new Date();
        const in15Days = new Date(today);
        in15Days.setDate(today.getDate() + 15);
        params.due_date_gte = today.toISOString();
        params.due_date_lte = in15Days.toISOString();
      } else if (tabValue === 2) {
        // Overdue
        params.due_date_lt = new Date().toISOString();
      }

      const response = await renewalService.getRenewals(params);
      setRenewals(response.results);
      setTotalCount(response.count);
    } catch (err) {
      console.error('Error fetching renewals:', err);
      setError('Failed to load renewals. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [tabValue, isAuthenticated]);

  useEffect(() => {
    // Only fetch renewals when authenticated
    if (isAuthenticated && !authLoading) {
      fetchRenewals();
    }
  }, [fetchRenewals, isAuthenticated, authLoading]);

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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewJobCard = (jobCardId: number) => {
    navigate(`/jobcards/${jobCardId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getDueDateStatus = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    
    if (due < today) {
      return { label: 'Overdue', color: '#FFCDD2' }; // Light red
    }
    
    const diffTime = Math.abs(due.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      return { label: 'Due soon', color: '#FFECB3' }; // Light amber
    }
    
    return { label: 'Upcoming', color: '#C8E6C9' }; // Light green
  };

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Renewals
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Due in 7 Days" />
          <Tab label="Due in 15 Days" />
          <Tab label="Overdue" />
        </Tabs>
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
                  <TableCell>Job ID</TableCell>
                  <TableCell>Client Name</TableCell>
                  <TableCell>Service Type</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {renewals.length > 0 ? (
                  renewals
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((renewal) => {
                      const statusInfo = getDueDateStatus(renewal.due_date);
                      return (
                        <TableRow key={renewal.id} hover>
                          <TableCell>{renewal.jobcard_code}</TableCell>
                          <TableCell>{renewal.client_name}</TableCell>
                          <TableCell>Service Renewal</TableCell>
                          <TableCell>{formatDate(renewal.due_date)}</TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: 'inline-block',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                backgroundColor: statusInfo.color,
                              }}
                            >
                              {statusInfo.label}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewJobCard(renewal.jobcard)}
                              sx={{ color: '#2E7D32', borderColor: '#2E7D32' }}
                            >
                              View Job
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No renewals found
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
    </>
  );
};

export default Renewals;
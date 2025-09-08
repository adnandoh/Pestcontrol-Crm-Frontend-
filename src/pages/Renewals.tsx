import React, { useEffect, useState, useCallback } from 'react';
import {
  Button,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Paper,
  Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { renewalService } from '../services/api';
import { Renewal } from '../types';
import { useAuth } from '../contexts/AuthContext';
import ModernTable from '../components/ModernTable';

const Renewals: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
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

      if (page > 0) {
        params.page = page + 1; // Convert from 0-based to 1-based
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
  }, [tabValue, isAuthenticated, page]);

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


  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewJobCard = (jobCardId: number) => {
    navigate(`/jobcards/${jobCardId}/edit`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };


  const getStatusColor = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    
    if (due < today) {
      return { label: 'Overdue', bg: '#FFCDD2', color: '#D32F2F' };
    }
    
    const diffTime = Math.abs(due.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      return { label: 'Due soon', bg: '#FFECB3', color: '#F57C00' };
    }
    
    return { label: 'Upcoming', bg: '#C8E6C9', color: '#388E3C' };
  };

  const getTabTitle = () => {
    switch (tabValue) {
      case 0:
        return 'Renewals Due in 7 Days';
      case 1:
        return 'Renewals Due in 15 Days';
      case 2:
        return 'Overdue Renewals';
      default:
        return 'Renewals';
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Paper sx={{ mb: 3, overflow: 'hidden', border: '1px solid #e0e0e0', borderRadius: 0 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
            },
          }}
        >
          <Tab label="Due in 7 Days" />
          <Tab label="Due in 15 Days" />
          <Tab label="Overdue" />
        </Tabs>
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <ModernTable
          title={getTabTitle()}
          totalCount={totalCount}
          page={page}
          rowsPerPage={20}
          onPageChange={setPage}
          columns={[
            { id: 'jobcard_code', label: 'Job ID', minWidth: 120 },
            { id: 'client_name', label: 'Client Name', minWidth: 150 },
            { id: 'service_type', label: 'Service Type', minWidth: 150 },
            { id: 'due_date', label: 'Due Date', minWidth: 120, format: (value: string) => formatDate(value) },
            { id: 'status', label: 'Status', minWidth: 100 },
            { id: 'actions', label: 'Actions', minWidth: 120 },
          ]}
          rows={renewals.length > 0 ? renewals.map(renewal => {
            const statusInfo = getStatusColor(renewal.due_date);
            return {
              jobcard_code: renewal.jobcard_code,
              client_name: renewal.client_name,
              service_type: 'Service Renewal',
              due_date: renewal.due_date,
              status: (
                <Chip
                  label={statusInfo.label}
                  size="small"
                  sx={{
                    backgroundColor: statusInfo.bg,
                    color: statusInfo.color,
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    height: 24,
                    borderRadius: 1,
                  }}
                />
              ),
              actions: (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleViewJobCard(renewal.jobcard)}
                  sx={{
                    color: '#2E7D32',
                    borderColor: '#2E7D32',
                    '&:hover': {
                      bgcolor: '#E8F5E8',
                      borderColor: '#1B5E20',
                    },
                    borderRadius: 1,
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    px: 2,
                    py: 0.5,
                  }}
                >
                  View Job
                </Button>
              ),
            };
          }) : []}
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

export default Renewals;
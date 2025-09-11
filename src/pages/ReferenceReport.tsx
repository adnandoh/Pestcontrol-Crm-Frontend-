import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
} from '@mui/material';
import { jobCardService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ReferenceData {
  reference_name: string;
  reference_count: number;
}

interface ReferenceReportData {
  results: ReferenceData[];
  total_job_cards: number;
  total_with_reference: number;
}

const ReferenceReport: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReferenceReportData | null>(null);

  useEffect(() => {
    const fetchReferenceReport = async () => {
      if (!isAuthenticated) return;

      try {
        setIsLoading(true);
        setError(null);
        const data = await jobCardService.getReferenceReport();
        setReportData(data);
      } catch (err) {
        console.error('Error fetching reference report:', err);
        setError('Failed to load reference report. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && !authLoading) {
      fetchReferenceReport();
    }
  }, [isAuthenticated, authLoading]);

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }


  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Loading reference report...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>


      {/* Reference Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #ddd' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, backgroundColor: '#f5f5f5' }}>
                Reference Name
              </TableCell>
              <TableCell sx={{ fontWeight: 600, backgroundColor: '#f5f5f5', textAlign: 'right' }}>
                Reference Count
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reportData?.results.map((item) => (
              <TableRow key={item.reference_name}>
                <TableCell>
                  {item.reference_name}
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  {item.reference_count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ReferenceReport;

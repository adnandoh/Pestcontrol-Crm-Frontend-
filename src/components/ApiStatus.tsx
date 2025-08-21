/**
 * API Status Component - Shows current API connection status
 * Demonstrates the enhanced API service usage
 */

import React, { useState, useEffect } from 'react';
import { Chip, Box, Typography, Alert } from '@mui/material';
import { healthService } from '../services/api.enhanced';
import { environment, apiConfig } from '../config/api.config';

interface ApiStatusProps {
  showDetails?: boolean;
}

const ApiStatus: React.FC<ApiStatusProps> = ({ showDetails = false }) => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    try {
      const health = await healthService.check();
      setIsHealthy(health.status === 'ok');
      setLastCheck(new Date());
      setError(null);
    } catch (err) {
      setIsHealthy(false);
      setLastCheck(new Date());
      setError(err instanceof Error ? err.message : 'Health check failed');
    }
  };

  useEffect(() => {
    // Initial health check
    checkHealth();

    // Set up periodic health checks
    const interval = setInterval(checkHealth, apiConfig.healthCheckInterval);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (): 'success' | 'error' | 'warning' => {
    if (isHealthy === null) return 'warning';
    return isHealthy ? 'success' : 'error';
  };

  const getStatusText = (): string => {
    if (isHealthy === null) return 'Checking...';
    return isHealthy ? 'Connected' : 'Disconnected';
  };

  return (
    <Box>
      <Chip
        label={`API: ${getStatusText()}`}
        color={getStatusColor()}
        size="small"
        variant="outlined"
      />
      
      {showDetails && (
        <Box mt={1}>
          <Typography variant="caption" display="block">
            Environment: {environment.name}
          </Typography>
          <Typography variant="caption" display="block">
            Base URL: {apiConfig.baseURL}
          </Typography>
          {lastCheck && (
            <Typography variant="caption" display="block">
              Last Check: {lastCheck.toLocaleTimeString()}
            </Typography>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 1, fontSize: '0.75rem' }}>
              {error}
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ApiStatus;

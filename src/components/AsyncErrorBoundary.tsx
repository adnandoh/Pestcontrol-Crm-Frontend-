import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for async operations and API calls
 * Handles errors in components that make network requests
 */
class AsyncErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log async errors
    console.error('AsyncErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            p: 2,
          }}
        >
          <Paper
            elevation={1}
            sx={{
              p: 3,
              maxWidth: 400,
              width: '100%',
              textAlign: 'center',
            }}
          >
            <ErrorOutline
              sx={{
                fontSize: 48,
                color: 'error.main',
                mb: 2,
              }}
            />
            
            <Typography variant="h6" gutterBottom color="error">
              Failed to load data
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              There was a problem loading the data. Please try again.
            </Typography>

            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={this.handleRetry}
              size="small"
            >
              Retry
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default AsyncErrorBoundary;

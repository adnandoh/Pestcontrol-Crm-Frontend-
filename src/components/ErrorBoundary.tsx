import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
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
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            p: 3,
          }}
        >
          <Paper
            elevation={1}
            sx={{
              p: 4,
              maxWidth: 500,
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" color="error" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </Typography>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, textAlign: 'left' }}>
                <Typography variant="body2" fontFamily="monospace">
                  {this.state.error.toString()}
                </Typography>
              </Box>
            )}
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={this.handleReset}
                sx={{ mr: 2 }}
              >
                Try Again
              </Button>
              <Button
                variant="outlined"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 
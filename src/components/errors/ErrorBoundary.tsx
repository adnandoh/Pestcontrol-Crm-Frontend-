import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { logErrorForDev } from '../../utils/errors';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: 'Something unexpected happened. Please refresh the page and try again.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logErrorForDev('ErrorBoundary', { error, info });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4 rounded-2xl border border-red-100 bg-red-50/60 p-8 shadow-sm">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" aria-hidden />
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {this.props.fallbackTitle ?? 'Application Error'}
              </h2>
              <p className="text-sm text-gray-700 mt-2">{this.state.message}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Refresh page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

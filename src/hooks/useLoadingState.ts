import { useState, useCallback } from 'react';

/**
 * Custom hook for standardized loading state management
 * Provides consistent loading, error, and success states across components
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

export interface UseLoadingStateReturn extends LoadingState {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: boolean) => void;
  reset: () => void;
  execute: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
}

/**
 * Hook for managing loading states with error handling
 * @param initialLoading - Initial loading state
 * @returns Loading state management functions
 */
export const useLoadingState = (initialLoading: boolean = false): UseLoadingStateReturn => {
  const [isLoading, setIsLoading] = useState<boolean>(initialLoading);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (loading) {
      setError(null);
      setIsSuccess(false);
    }
  }, []);

  const setErrorState = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
    setIsLoading(false);
    setIsSuccess(false);
  }, []);

  const setSuccess = useCallback((success: boolean) => {
    setIsSuccess(success);
    setIsLoading(false);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setIsSuccess(false);
  }, []);

  /**
   * Execute an async function with automatic loading state management
   * @param asyncFn - Async function to execute
   * @returns Promise with result or null if error
   */
  const execute = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      const result = await asyncFn();
      setSuccess(true);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorState(errorMessage);
      return null;
    }
  }, [setLoading, setSuccess, setErrorState]);

  return {
    isLoading,
    error,
    isSuccess,
    setLoading,
    setError: setErrorState,
    setSuccess,
    reset,
    execute,
  };
};

/**
 * Hook for managing multiple loading states
 * Useful for components that need to track multiple async operations
 */
export const useMultipleLoadingStates = (keys: string[]) => {
  const [states, setStates] = useState<Record<string, LoadingState>>(
    keys.reduce((acc, key) => {
      acc[key] = { isLoading: false, error: null, isSuccess: false };
      return acc;
    }, {} as Record<string, LoadingState>)
  );

  const setLoading = useCallback((key: string, loading: boolean) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: loading,
        error: loading ? null : prev[key].error,
        isSuccess: loading ? false : prev[key].isSuccess,
      },
    }));
  }, []);

  const setError = useCallback((key: string, error: string | null) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        error,
        isLoading: false,
        isSuccess: false,
      },
    }));
  }, []);

  const setSuccess = useCallback((key: string, success: boolean) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isSuccess: success,
        isLoading: false,
        error: null,
      },
    }));
  }, []);

  const reset = useCallback((key: string) => {
    setStates(prev => ({
      ...prev,
      [key]: { isLoading: false, error: null, isSuccess: false },
    }));
  }, []);

  const resetAll = useCallback(() => {
    setStates(prev => {
      const newStates = { ...prev };
      keys.forEach(key => {
        newStates[key] = { isLoading: false, error: null, isSuccess: false };
      });
      return newStates;
    });
  }, [keys]);

  return {
    states,
    setLoading,
    setError,
    setSuccess,
    reset,
    resetAll,
  };
};

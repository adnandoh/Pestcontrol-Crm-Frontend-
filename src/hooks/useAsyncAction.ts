import { useCallback, useState } from 'react';
import { getErrorMessage, extractFieldErrors, logErrorForDev } from '../utils/errors';
import { notify } from '../utils/notify';

interface UseAsyncActionOptions {
  /** Show toast on error (default true). Set false when using inline error UI. */
  toastOnError?: boolean;
  context?: string;
  fallbackMessage?: string;
}

export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: UseAsyncActionOptions = {},
) {
  const { toastOnError = true, context, fallbackMessage } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await action(...args);
        return result;
      } catch (err) {
        if (context) logErrorForDev(context, err);
        const message = getErrorMessage(err, fallbackMessage);
        setError(message);
        if (toastOnError) notify.apiError(err, context, fallbackMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [action, context, fallbackMessage, toastOnError],
  );

  const clearError = useCallback(() => setError(null), []);

  return { execute, loading, error, clearError, setError };
}

export { extractFieldErrors };

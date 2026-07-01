import { useCallback } from 'react';
import { useToastContext, type ToastVariant } from '../components/ui/toast/ToastProvider';

export function useToast() {
  const { show, dismiss } = useToastContext();

  const push = useCallback(
    (variant: ToastVariant, description: string, title?: string, duration?: number) => {
      show({ variant, description, title, duration });
    },
    [show],
  );

  return {
    success: (description: string, title = 'Success') => push('success', description, title),
    error: (description: string, title = 'Error') => push('error', description, title),
    warning: (description: string, title = 'Warning') => push('warning', description, title),
    info: (description: string, title = 'Notice') => push('info', description, title),
    dismiss,
  };
}

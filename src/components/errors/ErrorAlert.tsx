import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ErrorAlertProps {
  message: string;
  title?: string;
  className?: string;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  message,
  title = 'Error',
  className,
  onDismiss,
}) => {
  if (!message?.trim()) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="font-bold">{title}</p>
          <p className="mt-1 whitespace-pre-line leading-relaxed">{message}</p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-bold uppercase tracking-wide text-red-700 hover:text-red-900"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
};

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui';

interface PageErrorStateProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const PageErrorState: React.FC<PageErrorStateProps> = ({
  message,
  title = 'Unable to load this page',
  onRetry,
  retryLabel = 'Try again',
}) => (
  <div className="p-6 max-w-lg mx-auto text-center space-y-4">
    <AlertCircle className="h-10 w-10 text-amber-600 mx-auto" aria-hidden />
    <div>
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{message}</p>
    </div>
    {onRetry ? (
      <Button type="button" variant="outline" onClick={onRetry} className="inline-flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        {retryLabel}
      </Button>
    ) : null}
  </div>
);

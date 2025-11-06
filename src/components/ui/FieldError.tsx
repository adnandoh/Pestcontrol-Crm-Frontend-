import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface FieldErrorProps {
  error?: string;
  fieldId: string;
  className?: string;
  show?: boolean;
}

const FieldError: React.FC<FieldErrorProps> = ({ 
  error, 
  fieldId, 
  className,
  show = true 
}) => {
  if (!error || !show) {
    return null;
  }

  return (
    <div
      id={`${fieldId}-error`}
      className={cn(
        'flex items-center space-x-1 mt-1 text-sm text-red-600 animate-in fade-in duration-200',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </div>
  );
};

export { FieldError };
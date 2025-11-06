import React from 'react';
import { CheckCircle, Info, Loader2, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ClientCheckStatusProps {
  status: 'idle' | 'loading' | 'found' | 'not-found' | 'error';
  clientName?: string;
  error?: string;
  className?: string;
}

const ClientCheckStatus: React.FC<ClientCheckStatusProps> = ({
  status,
  clientName,
  error,
  className
}) => {
  if (status === 'idle') {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: Loader2,
          iconClassName: 'h-4 w-4 text-blue-500 animate-spin',
          containerClassName: 'bg-blue-50 border-blue-200 text-blue-700',
          message: 'Checking client...',
          ariaLabel: 'Checking if client exists'
        };
      case 'found':
        return {
          icon: CheckCircle,
          iconClassName: 'h-4 w-4 text-green-500',
          containerClassName: 'bg-green-50 border-green-200 text-green-700',
          message: `Client found: ${clientName}`,
          ariaLabel: `Existing client found: ${clientName}`
        };
      case 'not-found':
        return {
          icon: Info,
          iconClassName: 'h-4 w-4 text-blue-500',
          containerClassName: 'bg-blue-50 border-blue-200 text-blue-700',
          message: 'New client - please fill in details',
          ariaLabel: 'No existing client found, this will be a new client'
        };
      case 'error':
        return {
          icon: XCircle,
          iconClassName: 'h-4 w-4 text-orange-500',
          containerClassName: 'bg-orange-50 border-orange-200 text-orange-700',
          message: error || 'Unable to check client. Please continue with manual entry.',
          ariaLabel: 'Error checking client, manual entry required'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const { icon: Icon, iconClassName, containerClassName, message, ariaLabel } = config;

  return (
    <div
      className={cn(
        'flex items-center space-x-2 px-3 py-2 rounded-md border text-sm font-medium transition-all duration-200',
        containerClassName,
        className
      )}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <Icon className={iconClassName} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
};

export { ClientCheckStatus };
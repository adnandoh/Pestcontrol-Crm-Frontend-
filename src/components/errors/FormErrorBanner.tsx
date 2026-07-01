import React from 'react';
import { ErrorAlert } from './ErrorAlert';

interface FormErrorBannerProps {
  message?: string | null;
  className?: string;
}

/** Top-of-form API / submit error banner. Field-level errors use FieldError. */
export const FormErrorBanner: React.FC<FormErrorBannerProps> = ({ message, className }) => {
  if (!message?.trim()) return null;
  return (
    <ErrorAlert
      title="Please fix the following"
      message={message}
      className={className}
    />
  );
};

import React, { forwardRef } from 'react';
import { Textarea } from '../ui/Textarea';
import { FieldError } from '../ui/FieldError';
import { cn } from '../../utils/cn';

export interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name: string;
  error?: string;
  onValidate?: (value: string) => void;
  label?: string;
  required?: boolean;
  containerClassName?: string;
  showError?: boolean;
}

const ValidatedTextarea = forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  ({ 
    name, 
    error, 
    onValidate, 
    label, 
    required, 
    className, 
    containerClassName,
    showError = true,
    onChange,
    onBlur,
    ...props 
  }) => {
    const hasError = Boolean(error);

    // Handle textarea change with validation
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      
      // Call original onChange if provided
      if (onChange) {
        onChange(e);
      }
      
      // Call validation if provided
      if (onValidate) {
        onValidate(value);
      }
    };

    // Handle blur event for validation
    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      
      // Call original onBlur if provided
      if (onBlur) {
        onBlur(e);
      }
      
      // Call validation if provided
      if (onValidate) {
        onValidate(value);
      }
    };

    return (
      <div className={cn('space-y-1', containerClassName)}>
        {label && (
          <label 
            htmlFor={name} 
            className="block text-sm font-medium text-gray-700"
          >
            {label}
            {required && (
              <span className={cn('ml-1', hasError ? 'text-red-500' : 'text-red-500')}>
                *
              </span>
            )}
          </label>
        )}
        
        <Textarea
          id={name}
          name={name}
          className={cn(
            hasError && 'border-red-500 bg-red-50 focus:border-red-500 focus:ring-red-500',
            className
          )}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : undefined}
          onChange={handleChange}
          onBlur={handleBlur}
          {...props}
        />
        
        {showError && (
          <FieldError 
            error={error} 
            fieldId={name}
            show={hasError}
          />
        )}
      </div>
    );
  }
);

ValidatedTextarea.displayName = 'ValidatedTextarea';

export { ValidatedTextarea };
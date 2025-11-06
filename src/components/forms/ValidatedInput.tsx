import React, { forwardRef, useEffect } from 'react';
import { Input } from '../ui/Input';
import { FieldError } from '../ui/FieldError';
import { cn } from '../../utils/cn';

export interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  error?: string;
  onValidate?: (value: string) => void;
  label?: string;
  required?: boolean;
  containerClassName?: string;
  showError?: boolean;
}

const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
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
  }, ref) => {
    const hasError = Boolean(error);

    // Handle input change with validation
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
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
        
        <Input
          ref={ref}
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

ValidatedInput.displayName = 'ValidatedInput';

export { ValidatedInput };
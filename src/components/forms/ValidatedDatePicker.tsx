import React, { forwardRef } from 'react';
import { DatePicker } from '../ui/DatePicker';
import { FieldError } from '../ui/FieldError';
import { cn } from '../../utils/cn';

export interface ValidatedDatePickerProps {
  name: string;
  value?: string;
  onChange?: (date: string) => void;
  onBlur?: () => void;
  error?: string;
  onValidate?: (value: string) => void;
  label?: string;
  required?: boolean;
  containerClassName?: string;
  showError?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const ValidatedDatePicker = forwardRef<HTMLInputElement, ValidatedDatePickerProps>(
  ({ 
    name, 
    value,
    onChange,
    onBlur,
    error, 
    onValidate, 
    label, 
    required, 
    containerClassName,
    showError = true,
    placeholder,
    disabled,
    ...props 
  }, ref) => {
    const hasError = Boolean(error);

    // Handle date change with validation
    const handleChange = (date: string) => {
      // Call original onChange if provided
      if (onChange) {
        onChange(date);
      }
      
      // Call validation if provided
      if (onValidate) {
        onValidate(date);
      }
    };

    // Handle blur event for validation
    const handleBlur = () => {
      // Call original onBlur if provided
      if (onBlur) {
        onBlur();
      }
      
      // Call validation if provided and value exists
      if (onValidate && value !== undefined) {
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
        
        <div className={cn(hasError && 'datepicker-error')}>
          <DatePicker
            value={value || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            error={error}
            name={name}
            id={name}
            ariaInvalid={hasError}
            ariaDescribedBy={hasError ? `${name}-error` : undefined}
            placeholder={placeholder}
            disabled={disabled}
            {...props}
          />
        </div>
        
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

ValidatedDatePicker.displayName = 'ValidatedDatePicker';

export { ValidatedDatePicker };

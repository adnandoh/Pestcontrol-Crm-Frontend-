import { forwardRef } from 'react';
import { Select } from '../ui/Select';
import { FieldError } from '../ui/FieldError';
import { cn } from '../../utils/cn';

export interface ValidatedSelectProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  onValidate?: (value: string) => void;
  label?: string;
  required?: boolean;
  containerClassName?: string;
  showError?: boolean;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}

const ValidatedSelect = forwardRef<HTMLSelectElement, ValidatedSelectProps>(
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
    options,
    placeholder,
    disabled,
    ...props 
  }) => {
    const hasError = Boolean(error);

    // Handle select change with validation
    const handleChange = (newValue: string) => {
      // Call original onChange if provided
      if (onChange) {
        onChange(newValue);
      }
      
      // Call validation if provided
      if (onValidate) {
        onValidate(newValue);
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
        
        <div className={cn(hasError && 'select-error')}>
          <Select
            value={value || ''}
            onChange={handleChange}
            options={options}
            placeholder={placeholder}
            disabled={disabled}
            error={error}
            name={name}
            id={name}
            ariaInvalid={hasError}
            ariaDescribedBy={hasError ? `${name}-error` : undefined}
            {...props}
          />
        </div>
        {onBlur && (
          <input
            type="hidden"
            onBlur={handleBlur}
            aria-hidden="true"
            tabIndex={-1}
          />
        )}
        
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

ValidatedSelect.displayName = 'ValidatedSelect';

export { ValidatedSelect };

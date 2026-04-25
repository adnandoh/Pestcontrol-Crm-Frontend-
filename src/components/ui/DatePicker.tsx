import React, { forwardRef } from 'react';

interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (date: any) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  name?: string;
  id?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({
    value,
    onChange,
    placeholder: _placeholder = 'Select date',
    error,
    disabled = false,
    required = false,
    className = '',
    name,
    id,
    ariaInvalid,
    ariaDescribedBy,
    ...props
  }, ref) => {
    return (
      <div>
        <input
          ref={ref}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          name={name}
          id={id || name}
          aria-invalid={ariaInvalid ? true : undefined}
          aria-describedby={ariaDescribedBy}
          className={`
            w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';

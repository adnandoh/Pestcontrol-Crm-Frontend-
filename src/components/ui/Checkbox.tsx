import React from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = ''
}) => {
  return (
    <label className={`flex items-center cursor-pointer ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="
          h-4 w-4 text-blue-600 border-gray-300 rounded
          focus:ring-2 focus:ring-blue-500
          disabled:cursor-not-allowed
        "
      />
      {label && (
        <span className="ml-2 text-sm text-gray-700">
          {label}
        </span>
      )}
    </label>
  );
};
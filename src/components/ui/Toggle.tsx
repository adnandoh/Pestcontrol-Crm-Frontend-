import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = ''
}) => {
  return (
    <label className={`flex items-center cursor-pointer ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div className={`
          block w-14 h-8 rounded-full transition-colors duration-200 ease-in-out
          ${checked ? 'bg-blue-600' : 'bg-gray-300'}
          ${disabled ? 'opacity-50' : ''}
        `}>
          <div className={`
            absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ease-in-out
            ${checked ? 'transform translate-x-6' : ''}
          `} />
        </div>
      </div>
      {label && (
        <span className="ml-3 text-sm text-gray-700">
          {label}
        </span>
      )}
    </label>
  );
};
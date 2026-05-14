import React from 'react';
import AsyncSelect from 'react-select/async';
import { enhancedApiService } from '../../services/api.enhanced';
import { cn } from '../../utils/cn';

interface LocationSearchSelectProps {
  value?: number;
  onChange: (locationId: number, cityId?: number, stateId?: number) => void;
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
}

const LocationSearchSelect: React.FC<LocationSearchSelectProps> = ({
  value,
  onChange,
  placeholder = "Search location...",
  className,
  isDisabled = false
}) => {
  // Load options from API
  const loadOptions = async (inputValue: string) => {
    if (!inputValue || inputValue.length < 2) return [];
    
    try {
      const results = await enhancedApiService.searchLocations(inputValue);
      return results.map(loc => ({
        value: loc.id,
        label: loc.display_name,
        city_id: loc.city_id,
        state_id: loc.state_id
      }));
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  };

  // Handle selection
  const handleChange = (option: any) => {
    if (option) {
      onChange(option.value, option.city_id, option.state_id);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <AsyncSelect
        cacheOptions
        defaultOptions={false}
        loadOptions={loadOptions}
        onChange={handleChange}
        placeholder={placeholder}
        isDisabled={isDisabled}
        noOptionsMessage={({ inputValue }) => 
          inputValue.length < 2 ? "Type at least 2 characters..." : "No locations found"
        }
        loadingMessage={() => "Searching locations..."}
        classNamePrefix="location-select"
        styles={{
          control: (base) => ({
            ...base,
            minHeight: '40px',
            borderRadius: '8px',
            borderColor: '#e5e7eb',
            '&:hover': {
              borderColor: '#3b82f6',
            },
            boxShadow: 'none',
            fontSize: '14px',
            backgroundColor: '#f9fafb'
          }),
          option: (base, state) => ({
            ...base,
            fontSize: '13px',
            backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
            color: state.isSelected ? 'white' : '#374151',
          }),
        }}
      />
    </div>
  );
};

export default LocationSearchSelect;

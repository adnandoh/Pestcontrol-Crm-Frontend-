import React, { useEffect, useState } from 'react';
import AsyncSelect from 'react-select/async';
import { enhancedApiService } from '../../services/api.enhanced';
import { cn } from '../../utils/cn';
import { MapPin } from 'lucide-react';

interface LocationOption {
  value: number;
  label: string;
  city_id?: number;
  state_id?: number;
}

interface LocationSearchSelectProps {
  value?: number;
  /** Pre-filled label for edit forms (e.g. master_location_name + city). */
  defaultLabel?: string;
  onChange: (locationId: number, cityId?: number, stateId?: number) => void;
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
  error?: string;
  name?: string;
}

const LocationSearchSelect: React.FC<LocationSearchSelectProps> = ({
  value,
  defaultLabel,
  onChange,
  placeholder = "Search location (e.g. Khopoli, Thane)...",
  className,
  isDisabled = false,
  error,
  name = 'master_location',
}) => {
  const [selectedOption, setSelectedOption] = useState<LocationOption | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveSelectedOption = async () => {
      if (!value) {
        setSelectedOption(null);
        return;
      }

      if (defaultLabel) {
        setSelectedOption({ value, label: defaultLabel });
        return;
      }

      try {
        const location = await enhancedApiService.getMasterLocation(value);
        if (cancelled) return;
        setSelectedOption({
          value: location.id,
          label: location.display_name || `${location.name}, ${location.city_name}`,
          city_id: location.city,
          state_id: location.state_id,
        });
      } catch (fetchError) {
        console.error('Error loading saved location:', fetchError);
        if (!cancelled) {
          setSelectedOption({ value, label: `Location #${value}` });
        }
      }
    };

    resolveSelectedOption();
    return () => {
      cancelled = true;
    };
  }, [value, defaultLabel]);

  const loadOptions = async (inputValue: string) => {
    if (!inputValue || inputValue.length < 4) return [];

    try {
      const results = await enhancedApiService.searchLocations(inputValue);
      return results.map((loc) => ({
        value: loc.id,
        label: loc.display_name,
        city_id: loc.city_id,
        state_id: loc.state_id,
      }));
    } catch (loadError) {
      console.error('Error searching locations:', loadError);
      return [];
    }
  };

  const handleChange = (option: LocationOption | null) => {
    setSelectedOption(option);
    if (option) {
      onChange(option.value, option.city_id, option.state_id);
    }
  };

  const borderColor = error ? '#ef4444' : undefined;

  return (
    <div className={cn('w-full relative', className)} data-field={name}>
      <AsyncSelect
        name={name}
        cacheOptions
        defaultOptions={false}
        loadOptions={loadOptions}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isClearable
        noOptionsMessage={({ inputValue }) =>
          inputValue.length < 4 ? 'Type at least 4 characters...' : 'No locations found'
        }
        loadingMessage={() => 'Searching...'}
        classNamePrefix="location-select"
        styles={{
          control: (base, state) => ({
            ...base,
            minHeight: '40px',
            borderRadius: '8px',
            borderColor: borderColor ?? (state.isFocused ? '#3b82f6' : '#e5e7eb'),
            '&:hover': {
              borderColor: borderColor ?? '#3b82f6',
            },
            boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
            fontSize: '14px',
            backgroundColor: '#ffffff',
            fontWeight: '600',
            color: '#374151',
          }),
          option: (base, state) => ({
            ...base,
            fontSize: '13px',
            fontWeight: state.isSelected ? '700' : '500',
            backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
            color: state.isSelected ? 'white' : '#374151',
            padding: '10px 12px',
            cursor: 'pointer',
            '&:active': {
              backgroundColor: '#dbeafe',
            },
          }),
          placeholder: (base) => ({
            ...base,
            color: '#9ca3af',
            fontSize: '13px',
          }),
          singleValue: (base) => ({
            ...base,
            color: '#1f2937',
          }),
        }}
      />
      <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
        <MapPin className="h-4 w-4" />
      </div>
    </div>
  );
};

export default LocationSearchSelect;

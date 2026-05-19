import React, { useEffect, useId, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { isGoogleMapsConfigured } from '../../config/googleMaps';
import { loadGoogleMapsPlaces } from '../../utils/googleMapsLoader';
import {
  parseGooglePlaceResult,
  type GooglePlaceSelection,
} from '../../utils/parseGooglePlace';
import { cn } from '../../utils/cn';

export interface GooglePlacesAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: GooglePlaceSelection) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
}

const GooglePlacesAddressInput: React.FC<GooglePlacesAddressInputProps> = ({
  value,
  onChange,
  onPlaceSelect,
  error,
  required = false,
  disabled = false,
  placeholder = 'Search address across India (building, street, area)...',
  id,
  name = 'client_address',
  className,
}) => {
  const reactId = useId();
  const inputId = id ?? `google-address-${reactId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  onChangeRef.current = onChange;
  onPlaceSelectRef.current = onPlaceSelect;

  useEffect(() => {
    if (!isGoogleMapsConfigured()) {
      setLoadError('Google Maps API key missing. Add VITE_GOOGLE_MAPS_API_KEY to .env');
      return;
    }

    let cancelled = false;

    loadGoogleMapsPlaces()
      .then(() => {
        if (cancelled || !inputRef.current) return;

        if (!window.google?.maps?.places?.Autocomplete) {
          setLoadError(
            'Google Places did not load. Check API key, billing, and enable Places API in Google Cloud.',
          );
          return;
        }

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'in' },
          fields: ['formatted_address', 'address_components', 'geometry', 'name'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const parsed = parseGooglePlaceResult(place);
          if (!parsed) return;
          onChangeRef.current(parsed.client_address);
          onPlaceSelectRef.current?.(parsed);
        });

        autocompleteRef.current = autocomplete;
        setReady(true);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Could not load Google Maps';
          setLoadError(msg);
          setReady(false);
        }
      });

    return () => {
      cancelled = true;
      autocompleteRef.current = null;
    };
  }, []);

  const borderClass = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

  return (
    <div className={cn('w-full', className)} data-field={name}>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          autoComplete="off"
          placeholder={ready ? placeholder : 'Loading Google Maps…'}
          className={cn(
            'w-full h-10 pl-3 pr-10 text-sm font-medium text-gray-900 rounded-lg shadow-sm outline-none focus:ring-1 bg-white',
            borderClass,
            disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed',
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          {!ready && !loadError ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-500 mt-1">
        Start typing to search any address in India. Pick a suggestion to auto-fill.
      </p>
      {loadError && (
        <p className="text-[11px] text-amber-700 mt-1 font-medium">{loadError}</p>
      )}
      {error && <p className="text-[11px] text-red-600 mt-1 font-medium">{error}</p>}
    </div>
  );
};

export default GooglePlacesAddressInput;

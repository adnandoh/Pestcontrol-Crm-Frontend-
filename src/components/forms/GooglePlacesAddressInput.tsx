import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { isGoogleMapsConfigured } from '../../config/googleMaps';
import { loadGoogleMapsPlaces } from '../../utils/googleMapsLoader';
import {
  parseGooglePlaceResult,
  type GooglePlaceSelection,
} from '../../utils/parseGooglePlace';
import { cn } from '../../utils/cn';

const MIN_SEARCH_CHARS = 5;
const SEARCH_DEBOUNCE_MS = 350;

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
  placeholder = 'Type at least 5 characters to search address in India…',
  id,
  name = 'client_address',
  className,
}) => {
  const reactId = useId();
  const inputId = id ?? `google-address-${reactId}`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [hint, setHint] = useState<string | null>(null);

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
        if (cancelled) return;
        autocompleteServiceRef.current = new window.google!.maps!.places!.AutocompleteService();
        const host = document.createElement('div');
        placesServiceRef.current = new window.google!.maps!.places!.PlacesService(host);
        setReady(true);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Could not load Google Maps');
          setReady(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchPredictions = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!ready || !autocompleteServiceRef.current || trimmed.length < MIN_SEARCH_CHARS) {
      setPredictions([]);
      setOpen(false);
      setSearching(false);
      setHint(
        trimmed.length > 0 && trimmed.length < MIN_SEARCH_CHARS
          ? `Type ${MIN_SEARCH_CHARS - trimmed.length} more character(s) to search`
          : null,
      );
      return;
    }

    setHint(null);
    setSearching(true);

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: trimmed,
        componentRestrictions: { country: 'in' },
      },
      (results, status) => {
        setSearching(false);
        if (status !== 'OK' || !results?.length) {
          setPredictions([]);
          setOpen(false);
          if (status === 'ZERO_RESULTS') {
            setHint('No addresses found. Try a more specific search.');
          }
          return;
        }
        setPredictions(results);
        setOpen(true);
      },
    );
  }, [ready]);

  const handleInputChange = (next: string) => {
    onChange(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = next.trim();
    if (trimmed.length < MIN_SEARCH_CHARS) {
      setPredictions([]);
      setOpen(false);
      setSearching(false);
      setHint(
        trimmed.length > 0
          ? `Type ${MIN_SEARCH_CHARS - trimmed.length} more character(s) to search`
          : null,
      );
      return;
    }

    debounceRef.current = setTimeout(() => fetchPredictions(next), SEARCH_DEBOUNCE_MS);
  };

  const selectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    const service = placesServiceRef.current;
    if (!service) return;

    setOpen(false);
    setPredictions([]);
    setSearching(true);

    service.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['formatted_address', 'address_components', 'geometry', 'name'],
      },
      (place, status) => {
        setSearching(false);
        if (status !== 'OK' || !place) return;

        const parsed = parseGooglePlaceResult(place);
        if (!parsed) return;

        const fullAddress = parsed.full_address;
        onChangeRef.current(fullAddress);
        onPlaceSelectRef.current?.({
          ...parsed,
          client_address: fullAddress,
        });
        setHint(null);
      },
    );
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const borderClass = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

  const showSpinner = !ready || searching;

  return (
    <div className={cn('w-full', className)} data-field={name} ref={wrapperRef}>
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (value.trim().length >= MIN_SEARCH_CHARS && predictions.length > 0) {
              setOpen(true);
            }
          }}
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
          {showSpinner && !loadError ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </div>

        {open && predictions.length > 0 && (
          <ul className="google-places-dropdown" role="listbox">
            {predictions.map((p) => (
              <li key={p.place_id}>
                <button
                  type="button"
                  role="option"
                  className="google-places-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectPrediction(p)}
                >
                  <MapPin className="google-places-item-icon shrink-0" />
                  <span className="google-places-item-text">
                    <span className="google-places-item-main">{p.description}</span>
                    {p.structured_formatting?.secondary_text && (
                      <span className="google-places-item-secondary">
                        {p.structured_formatting.secondary_text}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            <li className="google-places-powered">powered by Google</li>
          </ul>
        )}
      </div>

      <p className="text-[11px] text-gray-500 mt-1">
        Type at least {MIN_SEARCH_CHARS} characters, then pick an address for the full location.
      </p>
      {hint && !loadError && (
        <p className="text-[11px] text-gray-600 mt-0.5 font-medium">{hint}</p>
      )}
      {loadError && (
        <p className="text-[11px] text-amber-700 mt-1 font-medium">{loadError}</p>
      )}
      {error && <p className="text-[11px] text-red-600 mt-1 font-medium">{error}</p>}
    </div>
  );
};

export default GooglePlacesAddressInput;

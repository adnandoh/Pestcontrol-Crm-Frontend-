import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';

const SCRIPT_ID = 'google-maps-places-sdk';

let loadPromise: Promise<void> | null = null;

export function loadGoogleMapsPlaces(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser'));
  }

  if (window.google?.maps?.places) {
    return Promise.resolve();
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error('Google Maps API key is not configured'));
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY,
    )}&libraries=places&loading=async`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

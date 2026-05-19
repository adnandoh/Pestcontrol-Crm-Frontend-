import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';

const SCRIPT_ID = 'google-maps-places-sdk';

let loadPromise: Promise<void> | null = null;

function injectMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      const poll = window.setInterval(() => {
        if (window.google?.maps) {
          window.clearInterval(poll);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(poll);
        if (!window.google?.maps) {
          reject(new Error('Google Maps timed out while loading'));
        }
      }, 15000);
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error('Google Maps API key is not configured'));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY,
    )}&loading=async`;
    script.onload = () => {
      const poll = window.setInterval(() => {
        if (window.google?.maps) {
          window.clearInterval(poll);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(poll);
        if (!window.google?.maps) {
          reject(new Error('Google Maps failed to initialize'));
        }
      }, 15000);
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps script (check API key & domain restrictions)'));
    document.head.appendChild(script);
  });
}

/** Load Maps JS + Places library (required for address autocomplete). */
export async function loadGoogleMapsPlaces(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps can only load in the browser');
  }

  if (window.google?.maps?.places?.Autocomplete) {
    return;
  }

  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error(
      'Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY in Vercel and redeploy.',
    );
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      await injectMapsScript();
      await window.google!.maps!.importLibrary('places');
      if (!window.google?.maps?.places?.Autocomplete) {
        throw new Error(
          'Google Places library failed to load. Enable Places API and Maps JavaScript API in Google Cloud.',
        );
      }
    })().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }

  return loadPromise;
}

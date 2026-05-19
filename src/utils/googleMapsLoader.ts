import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';

const SCRIPT_ID = 'google-maps-places-sdk-v2';

let loadPromise: Promise<void> | null = null;

function placesReady(): boolean {
  return Boolean(window.google?.maps?.places?.AutocompleteService);
}

function waitForPlacesReady(timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (placesReady()) {
      resolve();
      return;
    }

    const started = Date.now();
    const poll = window.setInterval(() => {
      if (placesReady()) {
        window.clearInterval(poll);
        resolve();
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(poll);
        reject(new Error('Google Places timed out while loading'));
      }
    }, 50);
  });
}

function injectMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (placesReady()) {
      resolve();
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      waitForPlacesReady().then(resolve).catch(reject);
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error('Google Maps API key is not configured'));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    // Classic loader: Places is bundled via libraries=places (works on all CRM browsers).
    // Do not use importLibrary here — it only exists with the newer bootstrap loader.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      GOOGLE_MAPS_API_KEY,
    )}&libraries=places`;
    script.onload = () => {
      waitForPlacesReady().then(resolve).catch(reject);
    };
    script.onerror = () =>
      reject(new Error('Failed to load Google Maps script (check API key & domain restrictions)'));
    document.head.appendChild(script);
  });
}

async function ensurePlacesLibrary(): Promise<void> {
  if (placesReady()) {
    return;
  }

  const maps = window.google?.maps;
  if (maps && typeof maps.importLibrary === 'function') {
    await maps.importLibrary('places');
    if (placesReady()) {
      return;
    }
  }

  throw new Error(
    'Google Places library failed to load. Enable Places API and Maps JavaScript API in Google Cloud.',
  );
}

/** Load Maps JS + Places library (required for address autocomplete). */
export async function loadGoogleMapsPlaces(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps can only load in the browser');
  }

  if (placesReady()) {
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
      await ensurePlacesLibrary();
    })().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }

  return loadPromise;
}

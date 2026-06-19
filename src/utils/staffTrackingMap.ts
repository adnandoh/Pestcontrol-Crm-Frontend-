import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';

const MAP_SCRIPT_ID = 'google-maps-tracking-sdk';

let mapLoadPromise: Promise<void> | null = null;

function mapReady(): boolean {
  return Boolean(window.google?.maps?.Map);
}

function waitForMapReady(timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (mapReady()) {
      resolve();
      return;
    }
    const started = Date.now();
    const poll = window.setInterval(() => {
      if (mapReady()) {
        window.clearInterval(poll);
        resolve();
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(poll);
        reject(new Error('Google Maps timed out while loading'));
      }
    }, 50);
  });
}

/** Load Google Maps JS API for interactive map (live tracking + route history). */
export async function loadGoogleMapsForTracking(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps can only load in the browser');
  }
  if (mapReady()) {
    return;
  }
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Set VITE_GOOGLE_MAPS_API_KEY for staff tracking maps.');
  }

  if (!mapLoadPromise) {
    mapLoadPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById(MAP_SCRIPT_ID);
      if (existing) {
        waitForMapReady().then(resolve).catch(reject);
        return;
      }

      const script = document.createElement('script');
      script.id = MAP_SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;
      script.onload = () => waitForMapReady().then(resolve).catch(reject);
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    }).catch((err) => {
      mapLoadPromise = null;
      throw err;
    });
  }

  return mapLoadPromise;
}

export const STATUS_COLORS: Record<string, string> = {
  on_duty: '#16a34a',
  checked_in_idle: '#f59e0b',
  off_duty: '#9ca3af',
};

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

export const isGoogleMapsConfigured = (): boolean =>
  GOOGLE_MAPS_API_KEY.trim().length > 0;

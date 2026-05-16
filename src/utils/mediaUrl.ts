import { apiConfig } from '../config/api.config';

/**
 * Ensures blog/media URLs work in CRM when API returns relative paths (local dev).
 * S3 responses are already absolute https:// URLs.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const apiBase = apiConfig.baseUrl.replace(/\/$/, '');
  const origin = apiBase.replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}

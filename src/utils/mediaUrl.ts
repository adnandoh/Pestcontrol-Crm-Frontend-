import { apiConfig } from '../config/api.config';

/**
 * Ensures blog/media URLs work in CRM when API returns relative paths (local dev).
 * S3 responses are already absolute https:// URLs.
 */
function apiMediaOrigin(): string {
  const apiBase = apiConfig.baseUrl.replace(/\/$/, '');
  return apiBase.replace(/\/api\/?$/, '');
}

/** Rewrite dev/wrong-host absolute URLs to the configured API origin. */
function rewriteToApiOrigin(absoluteUrl: string): string {
  try {
    const parsed = new URL(absoluteUrl);
    const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
    if (localHosts.has(parsed.hostname)) {
      const origin = apiMediaOrigin();
      return `${origin}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    /* keep original */
  }
  return absoluteUrl;
}

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return rewriteToApiOrigin(trimmed);
  }

  const origin = apiMediaOrigin();
  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

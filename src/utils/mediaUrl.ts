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

/** Legacy API URLs used /media/job_selfies/... which 404 on Railway — route through media-file proxy. */
function legacyJobSelfieProxyUrl(absoluteUrl: string): string | null {
  try {
    const parsed = new URL(absoluteUrl);
    const match = parsed.pathname.match(/\/media\/(job_selfies\/.+)$/);
    if (!match) return null;
    const origin = apiMediaOrigin();
    return `${origin}/v1/media-file/?path=${encodeURIComponent(match[1])}`;
  } catch {
    return null;
  }
}

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const proxy = legacyJobSelfieProxyUrl(trimmed);
    if (proxy) return proxy;
    return rewriteToApiOrigin(trimmed);
  }

  const origin = apiMediaOrigin();
  if (trimmed.startsWith('job_selfies/')) {
    return `${origin}/v1/media-file/?path=${encodeURIComponent(trimmed)}`;
  }
  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

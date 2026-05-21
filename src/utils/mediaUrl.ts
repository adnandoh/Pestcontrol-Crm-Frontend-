import { apiConfig } from '../config/api.config';

/**
 * Ensures blog/media URLs work in CRM when API returns relative paths (local dev).
 * S3 responses are already absolute https:// URLs.
 */
function apiMediaOrigin(): string {
  const apiBase = apiConfig.baseUrl.replace(/\/$/, '');
  return apiBase.replace(/\/api\/?$/, '');
}

function mediaFileProxyUrl(storagePath: string): string {
  const apiBase = apiConfig.baseUrl.replace(/\/$/, '');
  return `${apiBase}/v1/media-file/?path=${encodeURIComponent(storagePath)}`;
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

/** Job selfies: use API proxy (private S3 returns Access Denied on direct bucket URLs). */
function jobSelfieProxyUrl(absoluteUrl: string): string | null {
  try {
    const parsed = new URL(absoluteUrl);
    let storagePath: string | null = null;
    const mediaMatch = parsed.pathname.match(/\/media\/(job_selfies\/.+)$/);
    const s3Match = parsed.pathname.match(/^\/(job_selfies\/.+)$/);
    if (mediaMatch) storagePath = mediaMatch[1];
    else if (s3Match && parsed.hostname.includes('amazonaws.com')) storagePath = s3Match[1];
    if (!storagePath) return null;
    return mediaFileProxyUrl(storagePath);
  } catch {
    return null;
  }
}

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const proxy = jobSelfieProxyUrl(trimmed);
    if (proxy) return proxy;
    return rewriteToApiOrigin(trimmed);
  }

  if (trimmed.startsWith('job_selfies/')) {
    return mediaFileProxyUrl(trimmed);
  }
  const origin = apiMediaOrigin();
  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

import type { AxiosError } from 'axios';
import { ApiError } from './ApiError';
import { messageForStatus } from './statusMessages';

export type FieldErrors = Record<string, string>;

export function isDevEnvironment(): boolean {
  return import.meta.env.DEV;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

export function flattenValidationDetails(value: unknown, prefix = ''): string[] {
  if (value == null) return [];
  if (typeof value === 'string') return prefix ? [`${prefix}: ${value}`] : [value];
  if (Array.isArray(value)) {
    if (!value.length) return [];
    const first = value[0];
    if (typeof first === 'string') return prefix ? [`${prefix}: ${first}`] : [first];
    return flattenValidationDetails(first, prefix);
  }
  if (typeof value !== 'object') return [];
  const parts: string[] = [];
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const label = prefix ? `${prefix} → ${key.replace(/_/g, ' ')}` : key.replace(/_/g, ' ');
    parts.push(...flattenValidationDetails(val, label));
  }
  return parts;
}

export function formatApiErrorMessage(
  data: Record<string, unknown> | string | undefined,
  fallback: string,
): string {
  if (!data) return fallback;
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) return fallback;
    if (trimmed.startsWith('<!') || trimmed.toLowerCase().includes('<html')) {
      return 'The requested API endpoint was not found on the server.';
    }
    return trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed;
  }
  if (typeof data.detail === 'string' && data.detail) return data.detail;
  if (typeof data.message === 'string' && data.message) return data.message;
  const nestedDetails = data.details;
  if (nestedDetails) {
    const parts = flattenValidationDetails(nestedDetails);
    if (parts.length) return parts.join('\n');
  }
  if (typeof data.error === 'string' && data.error && data.error !== 'Validation failed') {
    return data.error;
  }
  const fieldParts: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (['message', 'error', 'details', 'success', 'code', 'detail'].includes(key)) continue;
    fieldParts.push(...flattenValidationDetails(val, key.replace(/_/g, ' ')));
  }
  if (fieldParts.length) return fieldParts.join('\n');
  if (typeof data.error === 'string' && data.error) return data.error;
  return fallback;
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value) && value.length) {
    const first = value[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
  }
  return null;
}

/** Map server validation payload to form field errors. */
export function extractFieldErrors(error: unknown): FieldErrors {
  const out: FieldErrors = {};

  const applyRecord = (record: Record<string, unknown>, prefix = '') => {
    for (const [key, val] of Object.entries(record)) {
      if (['message', 'error', 'details', 'success', 'code', 'detail'].includes(key)) continue;
      const fieldKey = prefix ? `${prefix}.${key}` : key;
      const msg = firstString(val);
      if (msg) {
        out[fieldKey] = msg;
        out[key] = msg;
        continue;
      }
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        applyRecord(val as Record<string, unknown>, fieldKey);
      }
    }
  };

  if (isApiError(error)) {
    const data = error.details as Record<string, unknown> | undefined;
    if (data?.details && typeof data.details === 'object') {
      applyRecord(data.details as Record<string, unknown>);
    } else if (data) {
      applyRecord(data);
    }
    return out;
  }

  if (isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    if (data?.details && typeof data.details === 'object') {
      applyRecord(data.details as Record<string, unknown>);
    } else if (data) {
      applyRecord(data);
    }
  }

  return out;
}

/** Convert any thrown value into a clean, user-facing message. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;

  if (isApiError(error)) {
    if (error.message?.trim()) return error.message.trim();
    return messageForStatus(error.status, fallback);
  }

  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as Record<string, unknown> | undefined;
    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'];
      const seconds = retryAfter ? Number.parseInt(String(retryAfter), 10) : NaN;
      if (Number.isFinite(seconds) && seconds > 0) {
        return `Too many login attempts. Please wait ${seconds} seconds and try again.`;
      }
      return 'Too many login attempts. Please wait a minute and try again.';
    }
    const formatted = formatApiErrorMessage(data, error.message || fallback);
    if (formatted && formatted !== error.message) return formatted;
    if (status === 401) return 'Your session has expired. Please sign in again.';
    return messageForStatus(status, formatted || fallback);
  }

  if (error instanceof Error && error.message?.trim()) {
    if (error.message === 'Network Error') {
      return 'Unable to reach the server. Check your internet connection and try again.';
    }
    return error.message.trim();
  }

  if (typeof error === 'string' && error.trim()) return error.trim();

  return fallback;
}

export function createApiErrorFromAxios(error: AxiosError): ApiError {
  const data = error.response?.data as Record<string, unknown> | undefined;
  const status = error.response?.status ?? 0;
  const message = formatApiErrorMessage(data, error.message || messageForStatus(status));
  return new ApiError(message, status, data);
}

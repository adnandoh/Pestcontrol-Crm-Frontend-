import { ApiError, createApiErrorFromAxios, getErrorMessage, isApiError, isAxiosError } from './errors';

type ErrorPayload = {
  status: number | null;
  message: string;
  body: unknown;
};

function firstMessageFromBody(data: Record<string, unknown>): string {
  if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();

  if (typeof data.detail === 'string' && data.detail.trim()) return data.detail.trim();

  const nested = data.data;
  if (nested && typeof nested === 'object') {
    const inner = nested as Record<string, unknown>;
    if (typeof inner.message === 'string' && inner.message.trim()) return inner.message.trim();
  }

  const err = data.error;
  if (err && typeof err === 'object') {
    const errRecord = err as Record<string, unknown>;
    const errMessage = errRecord.message;
    if (typeof errMessage === 'string' && errMessage.trim()) return errMessage.trim();
    if (Array.isArray(errMessage) && errMessage.length) {
      const first = String(errMessage[0]).trim();
      if (first) return `message: ${first}`;
    }
  }

  const messages = data.messages;
  if (Array.isArray(messages) && messages.length) {
    const parts = messages
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return String(record.message ?? record.detail ?? '').trim();
        }
        return '';
      })
      .filter(Boolean);
    if (parts.length) return parts.join('\n');
  }

  if (typeof data.code === 'string' && data.code.trim()) {
    const detail = typeof data.detail === 'string' ? data.detail.trim() : '';
    return detail ? `${detail} (${data.code})` : data.code;
  }

  return '';
}

function bodyToDisplayText(body: unknown): string {
  if (body == null) return '';
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<!') || trimmed.toLowerCase().includes('<html')) {
      return 'The requested API endpoint was not found on the server.';
    }
    return trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed;
  }
  if (typeof body === 'object') {
    try {
      return JSON.stringify(body, null, 2);
    } catch {
      return String(body);
    }
  }
  return String(body);
}

export function extractWhatsFlowErrorPayload(error: unknown): ErrorPayload {
  if (isApiError(error)) {
    const body = error.details;
    const bodyRecord =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;
    const message =
      error.message?.trim() ||
      (bodyRecord ? firstMessageFromBody(bodyRecord) : '') ||
      getErrorMessage(error, '');
    return { status: error.status || null, message, body: body ?? null };
  }

  if (isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const body = error.response?.data ?? null;
    const bodyRecord =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;
    const message =
      (bodyRecord ? firstMessageFromBody(bodyRecord) : '') ||
      error.message?.trim() ||
      getErrorMessage(error, '');
    return { status, message, body };
  }

  if (error instanceof Error && error.message.trim()) {
    return { status: null, message: error.message.trim(), body: null };
  }

  return { status: null, message: '', body: null };
}

/** Always log full WhatsFlow API failures to the browser console. */
export function logWhatsFlowError(context: string, error: unknown): void {
  const payload = extractWhatsFlowErrorPayload(error);
  console.error(`[WhatsApp Inbox · ${context}]`, {
    httpStatus: payload.status,
    message: payload.message,
    responseBody: payload.body,
    error,
  });
}

/** User-visible error: HTTP status + exact backend message (never a generic placeholder). */
export function formatWhatsFlowError(error: unknown, fallback: string): string {
  const payload = extractWhatsFlowErrorPayload(error);
  const lines: string[] = [];

  if (payload.status) {
    lines.push(`HTTP ${payload.status}`);
  }

  if (payload.message) {
    lines.push(payload.message);
  } else if (payload.body != null) {
    lines.push(bodyToDisplayText(payload.body));
  }

  if (!lines.length) return fallback;
  return lines.join('\n\n');
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (isAxiosError(error)) return createApiErrorFromAxios(error);
  return new ApiError(getErrorMessage(error), 0, error);
}

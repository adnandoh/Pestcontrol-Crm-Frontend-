import { getErrorMessage, logErrorForDev, isApiError } from './errors';

type ToastHandler = (description: string, title?: string) => void;

let toastHandlers: {
  success: ToastHandler;
  error: ToastHandler;
  warning: ToastHandler;
  info: ToastHandler;
} | null = null;

let lastShown = { message: '', at: 0 };
const DEDUPE_MS = 2500;

function shouldShow(message: string): boolean {
  const normalized = message.trim();
  if (!normalized) return false;
  const now = Date.now();
  if (normalized === lastShown.message && now - lastShown.at < DEDUPE_MS) return false;
  lastShown = { message: normalized, at: now };
  return true;
}

/** Register toast handlers from ToastProvider (called once at app startup). */
export function registerNotifyHandlers(handlers: typeof toastHandlers): void {
  toastHandlers = handlers;
}

function show(variant: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) {
  const text = message.trim();
  if (!text || !shouldShow(text)) return;
  toastHandlers?.[variant](text, title);
}

export const notify = {
  success(message: string, title?: string) {
    show('success', message, title ?? 'Success');
  },
  error(message: string, title?: string) {
    show('error', message, title ?? 'Error');
  },
  warning(message: string, title?: string) {
    show('warning', message, title ?? 'Warning');
  },
  info(message: string, title?: string) {
    show('info', message, title ?? 'Notice');
  },
  /** Show a user-friendly API error and return the message (for inline state). */
  apiError(error: unknown, context?: string, fallback?: string): string {
    if (context) logErrorForDev(context, error);
    else logErrorForDev('API', error);
    const message = getErrorMessage(error, fallback);
    if (!isApiError(error) || error.status !== 401) {
      show('error', message);
    }
    return message;
  },
};

/** Drop-in replacement for window.alert — routes to success or error toast. */
export function showAlert(message: string): void {
  const lower = message.toLowerCase();
  const isSuccess =
    lower.includes('success') ||
    lower.includes('saved') ||
    lower.includes('added') ||
    lower.includes('updated') ||
    lower.includes('deleted') ||
    lower.includes('created') ||
    lower.includes('converted') ||
    lower.includes('sent') ||
    lower.includes('completed');
  if (isSuccess) notify.success(message);
  else notify.error(message);
}

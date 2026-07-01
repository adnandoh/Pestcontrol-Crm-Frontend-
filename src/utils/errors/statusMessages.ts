/** User-friendly messages for HTTP status codes. */
export const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'The request was invalid. Please check your input and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested item could not be found.',
  409: 'This action conflicts with existing data. Please refresh and try again.',
  422: 'Some fields need to be corrected before continuing.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our server. Please try again shortly.',
  502: 'The server is temporarily unavailable. Please try again.',
  503: 'The service is temporarily unavailable. Please try again later.',
  504: 'The server took too long to respond. Please try again.',
};

export function messageForStatus(status: number, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim();
  if (status === 0) {
    return 'Unable to reach the server. Check your internet connection and try again.';
  }
  return HTTP_STATUS_MESSAGES[status] ?? 'Something went wrong. Please try again.';
}

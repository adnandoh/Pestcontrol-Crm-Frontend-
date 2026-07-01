import { isDevEnvironment } from './parseApiError';

/** Log technical error details for developers without exposing them in the UI. */
export function logErrorForDev(context: string, error: unknown): void {
  if (!isDevEnvironment()) return;
  console.error(`[${context}]`, error);
}

/**
 * Proactive CRM JWT refresh — keeps session alive until refresh token expires (60 days).
 */

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 minutes before access expiry
const MIN_SCHEDULE_MS = 60 * 1000;
const SESSION_EXPIRED_MESSAGE = 'Session expired. Please login again.';

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<boolean> | null = null;

function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let payload = parts[1];
    const mod = payload.length % 4;
    if (mod > 0) payload += '='.repeat(4 - mod);
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof json.exp === 'number') return json.exp * 1000;
  } catch {
    /* ignore */
  }
  return null;
}

export type RefreshFn = () => Promise<void>;
export type LogoutFn = (message?: string) => void;

let refreshFn: RefreshFn | null = null;
let logoutFn: LogoutFn | null = null;

export function registerAuthSessionHandlers(handlers: {
  refresh: RefreshFn;
  logout: LogoutFn;
}) {
  refreshFn = handlers.refresh;
  logoutFn = handlers.logout;
}

export async function performSilentRefresh(): Promise<boolean> {
  if (!refreshFn) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      await refreshFn!();
      scheduleProactiveAccessRefresh();
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function scheduleProactiveAccessRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const access = localStorage.getItem('access_token');
  const refresh = localStorage.getItem('refresh_token');
  if (!access || !refresh) return;

  const expMs = decodeJwtExp(access);
  if (!expMs) return;

  const delay = Math.max(expMs - Date.now() - REFRESH_BUFFER_MS, MIN_SCHEDULE_MS);

  refreshTimer = setTimeout(async () => {
    const ok = await performSilentRefresh();
    if (!ok) {
      forceSessionLogout(SESSION_EXPIRED_MESSAGE);
    }
  }, delay);
}

export function stopAuthSessionScheduler(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

export function forceSessionLogout(message: string = SESSION_EXPIRED_MESSAGE): void {
  stopAuthSessionScheduler();
  sessionStorage.setItem('auth_logout_message', message);
  logoutFn?.(message);
}

export function consumeLogoutMessage(): string | null {
  const msg = sessionStorage.getItem('auth_logout_message');
  if (msg) sessionStorage.removeItem('auth_logout_message');
  return msg;
}

export { SESSION_EXPIRED_MESSAGE };

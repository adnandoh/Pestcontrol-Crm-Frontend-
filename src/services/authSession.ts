/**
 * CRM JWT session: single refresh mutex (required when backend rotates refresh tokens),
 * proactive access refresh, and coordinated logout.
 */
import axios from 'axios';
import { apiConfig, API_ENDPOINTS } from '../config/api.config';
import { apiCache } from './apiCache';
import { clearWhatsAppInboxTokens } from './whatsappInboxApi';

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before access expiry
const MIN_SCHEDULE_MS = 60 * 1000;
const FALLBACK_REFRESH_MS = 23 * 60 * 60 * 1000; // if JWT exp cannot be decoded (24h tokens)
const SESSION_EXPIRED_MESSAGE = 'Session expired. Please login again.';

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
/** One in-flight refresh for the whole app (axios 401, proactive timer, tab focus, mount). */
let refreshMutex: Promise<string> | null = null;

export function decodeJwtExp(token: string): number | null {
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

export function isAccessTokenExpired(bufferMs = 0): boolean {
  const access = localStorage.getItem('access_token');
  if (!access) return true;
  const expMs = decodeJwtExp(access);
  if (!expMs) return false;
  return Date.now() >= expMs - bufferMs;
}

/** True when access token is missing, expired, or within REFRESH_BUFFER_MS of expiry. */
export function shouldRefreshAccessToken(): boolean {
  return isAccessTokenExpired(REFRESH_BUFFER_MS);
}

export function clearStoredAuthSession(): void {
  stopAuthSessionScheduler();
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_info');
  clearWhatsAppInboxTokens();
  apiCache.clear();
}

export type LogoutFn = (message?: string) => void;

let logoutFn: LogoutFn | null = null;

export function registerAuthSessionHandlers(handlers: { logout: LogoutFn }) {
  logoutFn = handlers.logout;
}

/**
 * Refresh access (and rotated refresh) token — must be the only refresh path in the CRM.
 */
export async function refreshAccessTokenFromStorage(): Promise<string> {
  if (refreshMutex) return refreshMutex;

  refreshMutex = (async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await axios.post<{ access: string; refresh?: string }>(
      `${apiConfig.baseUrl}${API_ENDPOINTS.AUTH.REFRESH}`,
      { refresh: refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    );

    const newAccess = response.data.access;
    localStorage.setItem('access_token', newAccess);
    if (response.data.refresh) {
      localStorage.setItem('refresh_token', response.data.refresh);
    }

    scheduleProactiveAccessRefresh();
    return newAccess;
  })().finally(() => {
    refreshMutex = null;
  });

  return refreshMutex;
}

export async function performSilentRefresh(): Promise<boolean> {
  try {
    await refreshAccessTokenFromStorage();
    return true;
  } catch {
    return false;
  }
}

/** Refresh when tab returns if access token is expired or about to expire. */
export function refreshSessionIfNeeded(): Promise<boolean> {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return Promise.resolve(false);
  if (!shouldRefreshAccessToken()) return Promise.resolve(true);
  return performSilentRefresh();
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
  const delay = expMs
    ? Math.max(expMs - Date.now() - REFRESH_BUFFER_MS, MIN_SCHEDULE_MS)
    : FALLBACK_REFRESH_MS;

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
  sessionStorage.setItem('auth_logout_message', message);
  clearStoredAuthSession();
  if (logoutFn) {
    logoutFn(message);
  } else {
    window.location.href = '/login';
  }
}

export function consumeLogoutMessage(): string | null {
  const msg = sessionStorage.getItem('auth_logout_message');
  if (msg) sessionStorage.removeItem('auth_logout_message');
  return msg;
}

export { SESSION_EXPIRED_MESSAGE };

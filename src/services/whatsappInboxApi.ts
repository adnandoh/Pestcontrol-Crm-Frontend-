import axios, { type AxiosError, type AxiosInstance } from 'axios';
import type { AuthUser } from '../types';
import { ApiError, createApiErrorFromAxios } from '../utils/errors';
import { getUserRole } from '../utils/roles';

const DEFAULT_API_BASE = 'https://api.driveronhire.ai';

const API_BASE = normalizeApiBase(
  import.meta.env.VITE_WHATSAPP_API_URL ||
    import.meta.env.VITE_WHATSFLOW_API_BASE_URL ||
    DEFAULT_API_BASE,
);

const WS_BASE = (
  import.meta.env.VITE_WHATSAPP_WS_URL ||
  import.meta.env.VITE_WHATSFLOW_WS_BASE_URL ||
  API_BASE.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:')
).replace(/\/$/, '');

const WHATSAPP_API_KEY = (import.meta.env.VITE_WHATSAPP_API_KEY || '').trim();

/** Refresh ~5 min before the 30-minute access token expires. */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const MIN_SCHEDULE_MS = 60 * 1000;
const FALLBACK_PROACTIVE_REFRESH_MS = 25 * 60 * 1000;

export function isWhatsAppApiKeyConfigured(): boolean {
  return WHATSAPP_API_KEY.length > 0;
}

const ACCESS_KEY = 'whatsflow_access_token';
const REFRESH_KEY = 'whatsflow_refresh_token';

type InboxFilter = 'all' | 'unread' | 'assigned';
type TokenRefreshListener = (accessToken: string) => void;

export interface InboxConversation {
  id: string;
  customer_name: string;
  phone: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  assigned_to_me?: boolean;
}

export interface InboxMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'template';
  content: string;
  media_url?: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  sender_name?: string;
}

export interface ConversationDetail {
  id: string;
  customer_name: string;
  phone: string;
  messages: InboxMessage[];
  has_older_messages?: boolean;
}

export interface ConversationPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: InboxConversation[];
}

export interface InboxSocketEvent {
  type:
    | 'new_message'
    | 'message_sent'
    | 'message_delivered'
    | 'message_read'
    | 'typing'
    | 'presence';
  conversation_id?: string;
  message?: InboxMessage;
  payload?: Record<string, unknown>;
}

interface SendTextPayload {
  conversation_id: string;
  text: string;
}

interface SendTemplatePayload {
  conversation_id: string;
  template_id: string;
  variables?: Record<string, string>;
}

interface SsoLoginResponse {
  access_token: string;
  refresh_token: string;
  organization?: Record<string, unknown>;
  permissions?: Record<string, unknown>;
}

type WhatsFlowEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function normalizeApiBase(url: string): string {
  return url.replace(/\/api\/?$/i, '').replace(/\/$/, '');
}

function unwrapWhatsFlowPayload<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    throw new ApiError('Invalid WhatsFlow API response.', 502);
  }
  const record = payload as WhatsFlowEnvelope<T>;
  if (record.data !== undefined && record.data !== null) {
    return record.data;
  }
  return payload as T;
}

function parseSsoTokens(payload: unknown): SsoLoginResponse {
  const data = unwrapWhatsFlowPayload<Partial<SsoLoginResponse>>(payload);
  const access_token = data.access_token?.trim();
  const refresh_token = data.refresh_token?.trim();
  if (!access_token) {
    throw new ApiError('WhatsFlow SSO did not return an access token.', 502);
  }
  if (!refresh_token) {
    throw new ApiError('WhatsFlow SSO did not return a refresh token.', 502);
  }
  return {
    access_token,
    refresh_token,
    organization: data.organization,
    permissions: data.permissions,
  };
}

function parseRefreshTokens(payload: unknown): { access: string; refresh: string } {
  const data = unwrapWhatsFlowPayload<Record<string, unknown>>(payload);
  const nested = data.tokens as Record<string, unknown> | undefined;
  if (nested) {
    const access = String(nested.access ?? nested.access_token ?? '').trim();
    const refresh = String(nested.refresh ?? nested.refresh_token ?? '').trim();
    if (access && refresh) return { access, refresh };
  }

  const access = String(data.access ?? data.access_token ?? '').trim();
  const refresh = String(data.refresh ?? data.refresh_token ?? '').trim();
  if (access && refresh) return { access, refresh };

  throw new ApiError('WhatsFlow refresh did not return rotated tokens.', 502);
}

function isAuthTokenError(error: AxiosError): boolean {
  const status = error.response?.status;
  if (status !== 401 && status !== 403) return false;

  const data = error.response?.data;
  if (!data || typeof data !== 'object') return status === 401;

  const record = data as Record<string, unknown>;
  if (record.code === 'token_not_valid') return true;

  const detail = String(record.detail ?? '').toLowerCase();
  if (detail.includes('token') || detail.includes('expired') || detail.includes('not valid')) {
    return true;
  }

  const messages = record.messages;
  if (Array.isArray(messages)) {
    return messages.some((item) => {
      const message = item as Record<string, unknown>;
      const text = String(message.message ?? '').toLowerCase();
      return text.includes('expired') || text.includes('token');
    });
  }

  return status === 401;
}

function mapConversation(raw: Record<string, unknown>): InboxConversation {
  return {
    id: String(raw.id ?? ''),
    customer_name: String(raw.customer_name ?? raw.customer ?? ''),
    phone: String(raw.phone ?? ''),
    last_message: String(raw.last_message ?? ''),
    last_message_time: String(raw.last_message_time ?? ''),
    unread_count: Number(raw.unread_count ?? 0),
    assigned_to_me: typeof raw.assigned_to_me === 'boolean' ? raw.assigned_to_me : undefined,
  };
}

function mapConversationPage(payload: unknown): ConversationPage {
  const data = unwrapWhatsFlowPayload<{
    results?: Record<string, unknown>[];
    count?: number;
    next?: string | null;
    previous?: string | null;
  }>(payload);
  const results = (data.results ?? []).map(mapConversation);
  return {
    count: data.count ?? results.length,
    next: data.next ?? null,
    previous: data.previous ?? null,
    results,
  };
}

function mapConversationDetail(payload: unknown): ConversationDetail {
  const data = unwrapWhatsFlowPayload<Record<string, unknown>>(payload);
  const rawMessages = Array.isArray(data.messages) ? data.messages : [];
  const messages = rawMessages.map((message) => {
    const item = message as Record<string, unknown>;
    return {
      id: String(item.id ?? ''),
      conversation_id: String(item.conversation_id ?? data.id ?? ''),
      direction: (item.direction as InboxMessage['direction']) ?? 'inbound',
      message_type: (item.message_type as InboxMessage['message_type']) ?? 'text',
      content: String(item.content ?? item.text ?? ''),
      media_url: item.media_url ? String(item.media_url) : undefined,
      created_at: String(item.created_at ?? ''),
      status: item.status as InboxMessage['status'] | undefined,
      sender_name: item.sender_name ? String(item.sender_name) : undefined,
    };
  });

  return {
    id: String(data.id ?? ''),
    customer_name: String(data.customer_name ?? data.customer ?? ''),
    phone: String(data.phone ?? ''),
    messages,
    has_older_messages:
      typeof data.has_older_messages === 'boolean' ? data.has_older_messages : undefined,
  };
}

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

function isStoredAccessTokenValid(token: string | null): boolean {
  if (!token) return false;
  const trimmed = token.trim();
  return trimmed.length > 0 && trimmed !== 'undefined' && trimmed !== 'null';
}

function shouldRefreshWhatsAppAccessToken(access: string | null): boolean {
  if (!isStoredAccessTokenValid(access)) return true;
  const expMs = decodeJwtExp(access!);
  if (!expMs) return false;
  return Date.now() >= expMs - REFRESH_BUFFER_MS;
}

function readCrmUserFromStorage(): AuthUser | null {
  const raw = localStorage.getItem('user_info');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function buildExternalUser(user: AuthUser): { id: string; name: string; role: string } {
  const crmRole = getUserRole(user);
  const role = crmRole === 'super_admin' || crmRole === 'admin' ? 'admin' : 'staff';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
  return {
    id: String(user.id),
    name,
    role,
  };
}

let inboxApiRef: WhatsAppInboxApi | null = null;

export function clearWhatsAppInboxTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  inboxApiRef?.stopProactiveRefresh();
}

class WhatsAppInboxApi {
  private client: AxiosInstance;
  /** Single in-flight refresh/SSO for concurrent 401s. */
  private refreshPromise: Promise<string> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private tokenRefreshListeners = new Set<TokenRefreshListener>();

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      timeout: 30000,
    });
    this.setupInterceptors();
  }

  onTokenRefreshed(listener: TokenRefreshListener): () => void {
    this.tokenRefreshListeners.add(listener);
    return () => {
      this.tokenRefreshListeners.delete(listener);
    };
  }

  stopProactiveRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private notifyTokenRefreshed(access: string): void {
    this.tokenRefreshListeners.forEach((listener) => listener(access));
  }

  private scheduleProactiveRefresh(): void {
    this.stopProactiveRefresh();

    const access = this.getAccessToken();
    const refresh = this.getRefreshToken();
    if (!access || !refresh) return;

    const expMs = decodeJwtExp(access);
    const delay = expMs
      ? Math.max(expMs - Date.now() - REFRESH_BUFFER_MS, MIN_SCHEDULE_MS)
      : FALLBACK_PROACTIVE_REFRESH_MS;

    this.refreshTimer = setTimeout(() => {
      void this.tryRefreshOrSso().catch(() => {
        // Next API call or socket reconnect will retry.
      });
    }, delay);
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
        if (!originalRequest) {
          throw createApiErrorFromAxios(error);
        }

        if (isAuthTokenError(error) && !originalRequest._retry) {
          originalRequest._retry = true;
          const refreshed = await this.tryRefreshOrSso();
          if (originalRequest.headers) {
            (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${refreshed}`;
          }
          return this.client(originalRequest);
        }

        throw createApiErrorFromAxios(error);
      },
    );
  }

  private getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  private setTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    this.scheduleProactiveRefresh();
    this.notifyTokenRefreshed(access);
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const shouldRetry =
        error instanceof ApiError
          ? error.status === 0 || error.status >= 500
          : true;
      if (!shouldRetry) throw error;
      return fn();
    }
  }

  private async refreshAccessToken(): Promise<string> {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      throw new ApiError('WhatsFlow refresh token missing.', 401);
    }

    const response = await axios.post(
      `${API_BASE}/api/v1/auth/refresh/`,
      { refresh },
      { headers: { 'Content-Type': 'application/json' } },
    );

    const tokens = parseRefreshTokens(response.data);
    this.setTokens(tokens.access, tokens.refresh);
    return tokens.access;
  }

  private async tryRefreshOrSso(): Promise<string> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      if (this.getRefreshToken()) {
        try {
          return await this.refreshAccessToken();
        } catch {
          // Refresh failed — fall through to SSO.
        }
      }
      return this.ssoLogin();
    })().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  async ssoLogin(): Promise<string> {
    if (!WHATSAPP_API_KEY) {
      throw new ApiError(
        'WhatsApp API key is not configured. Set VITE_WHATSAPP_API_KEY in your environment.',
        500,
      );
    }

    const crmUser = readCrmUserFromStorage();
    if (!crmUser) {
      throw new ApiError('CRM session not found. Please login again.', 401);
    }

    const response = await axios.post(
      `${API_BASE}/api/auth/sso-login/`,
      {
        api_key: WHATSAPP_API_KEY,
        external_user: buildExternalUser(crmUser),
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const tokens = parseSsoTokens(response.data);
    this.setTokens(tokens.access_token, tokens.refresh_token);
    return tokens.access_token;
  }

  async ensureAuthenticated(): Promise<void> {
    const access = this.getAccessToken();
    const refresh = this.getRefreshToken();

    if (!isStoredAccessTokenValid(access) || !refresh) {
      clearWhatsAppInboxTokens();
      await this.ssoLogin();
      return;
    }

    if (shouldRefreshWhatsAppAccessToken(access)) {
      await this.tryRefreshOrSso();
    } else {
      this.scheduleProactiveRefresh();
    }
  }

  async getConversations(params: {
    page?: number;
    page_size?: number;
    filter?: InboxFilter;
    search?: string;
  }): Promise<ConversationPage> {
    await this.ensureAuthenticated();
    return this.withRetry(async () => {
      const res = await this.client.get('/api/inbox/conversations/', {
        params: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
          filter: params.filter ?? 'all',
          search: params.search ?? '',
        },
      });
      return mapConversationPage(res.data);
    });
  }

  async getConversation(conversationId: string, before?: string): Promise<ConversationDetail> {
    await this.ensureAuthenticated();
    return this.withRetry(async () => {
      const res = await this.client.get(`/api/inbox/conversations/${conversationId}/`, {
        params: before ? { before } : undefined,
      });
      return mapConversationDetail(res.data);
    });
  }

  async sendText(payload: SendTextPayload): Promise<void> {
    await this.ensureAuthenticated();
    await this.withRetry(async () => {
      await this.client.post('/api/inbox/messages/send/', payload);
    });
  }

  async sendTemplate(payload: SendTemplatePayload): Promise<void> {
    await this.ensureAuthenticated();
    await this.withRetry(async () => {
      await this.client.post('/api/inbox/messages/template/', payload);
    });
  }

  async sendMedia(payload: {
    conversation_id: string;
    file: File;
    caption?: string;
  }): Promise<void> {
    await this.ensureAuthenticated();
    const formData = new FormData();
    formData.append('conversation_id', payload.conversation_id);
    formData.append('file', payload.file);
    if (payload.caption) formData.append('caption', payload.caption);

    await this.withRetry(async () => {
      await this.client.post('/api/inbox/messages/media/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    });
  }

  async getCustomerByPhone(phone: string): Promise<Record<string, unknown> | null> {
    await this.ensureAuthenticated();
    return this.withRetry(async () => {
      const res = await this.client.get(`/api/customers/${encodeURIComponent(phone)}/`);
      return unwrapWhatsFlowPayload<Record<string, unknown>>(res.data);
    });
  }

  async connectInboxSocket(handlers: {
    onEvent: (event: InboxSocketEvent) => void;
    onError?: (event: Event) => void;
    onOpen?: () => void;
    onClose?: () => void;
  }): Promise<() => void> {
    await this.ensureAuthenticated();
    const token = this.getAccessToken();
    if (!token) {
      throw new ApiError('WhatsFlow access token missing after authentication.', 401);
    }

    const ws = new WebSocket(`${WS_BASE}/ws/inbox/?token=${encodeURIComponent(token)}`);
    let heartbeat: number | null = null;

    ws.onopen = () => {
      handlers.onOpen?.();
      heartbeat = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    };

    ws.onerror = (event) => {
      handlers.onError?.(event);
    };

    ws.onclose = () => {
      if (heartbeat) window.clearInterval(heartbeat);
      handlers.onClose?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as InboxSocketEvent;
        handlers.onEvent(data);
      } catch {
        // ignore malformed messages
      }
    };

    return () => {
      if (heartbeat) window.clearInterval(heartbeat);
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }
}

export const whatsappInboxApi = new WhatsAppInboxApi();
inboxApiRef = whatsappInboxApi;

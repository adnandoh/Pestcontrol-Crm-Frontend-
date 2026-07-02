import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { ApiError, createApiErrorFromAxios } from '../utils/errors';

const DEFAULT_API_BASE = 'https://www.driveronhire.ai';
const DEFAULT_WS_BASE = 'wss://www.driveronhire.ai';

const API_BASE = (import.meta.env.VITE_WHATSFLOW_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, '');
const WS_BASE = (import.meta.env.VITE_WHATSFLOW_WS_BASE_URL || DEFAULT_WS_BASE).replace(/\/$/, '');

const ACCESS_KEY = 'whatsflow_access_token';
const REFRESH_KEY = 'whatsflow_refresh_token';

type InboxFilter = 'all' | 'unread' | 'assigned';

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

class WhatsAppInboxApi {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      timeout: 30000,
    });
    this.setupInterceptors();
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

        if (error.response?.status === 401 && !originalRequest._retry) {
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

  private setTokens(access: string, refresh?: string | null): void {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh);
    }
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

  private async tryRefreshOrSso(): Promise<string> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const refresh = this.getRefreshToken();
      if (refresh) {
        try {
          const response = await this.client.post<{ access_token: string; refresh_token?: string }>(
            '/api/auth/refresh/',
            { refresh_token: refresh },
          );
          this.setTokens(response.data.access_token, response.data.refresh_token);
          return response.data.access_token;
        } catch {
          // fall through to sso login
        }
      }
      return this.ssoLogin();
    })().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  async ssoLogin(): Promise<string> {
    const crmAccess = localStorage.getItem('access_token');
    if (!crmAccess) {
      throw new ApiError('CRM session not found. Please login again.', 401);
    }

    const response = await axios.post<{ access_token: string; refresh_token?: string }>(
      `${API_BASE}/api/auth/sso-login/`,
      {},
      {
        headers: {
          Authorization: `Bearer ${crmAccess}`,
          'Content-Type': 'application/json',
        },
      },
    );

    this.setTokens(response.data.access_token, response.data.refresh_token);
    return response.data.access_token;
  }

  async ensureAuthenticated(): Promise<void> {
    if (!this.getAccessToken()) {
      await this.ssoLogin();
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
      const res = await this.client.get<ConversationPage>('/api/inbox/conversations/', {
        params: {
          page: params.page ?? 1,
          page_size: params.page_size ?? 20,
          filter: params.filter ?? 'all',
          search: params.search ?? '',
        },
      });
      return res.data;
    });
  }

  async getConversation(conversationId: string, before?: string): Promise<ConversationDetail> {
    await this.ensureAuthenticated();
    return this.withRetry(async () => {
      const res = await this.client.get<ConversationDetail>(`/api/inbox/conversations/${conversationId}/`, {
        params: before ? { before } : undefined,
      });
      return res.data;
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
      return (res.data as Record<string, unknown>) ?? null;
    });
  }

  async connectInboxSocket(handlers: {
    onEvent: (event: InboxSocketEvent) => void;
    onError?: (event: Event) => void;
    onOpen?: () => void;
    onClose?: () => void;
  }): Promise<() => void> {
    const token = this.getAccessToken() || (await this.ssoLogin());
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
      ws.close();
    };
  }
}

export const whatsappInboxApi = new WhatsAppInboxApi();

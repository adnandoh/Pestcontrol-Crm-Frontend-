import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle,
  Search,
  RefreshCw,
  Loader2,
  Check,
  CheckCheck,
  Circle,
  Paperclip,
  Send,
  SlidersHorizontal,
  Smile,
  Image as ImageIcon,
  Bold,
  Italic,
  Strikethrough,
  Zap,
} from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Button, PageLoading } from '../components/ui';
import { ErrorAlert } from '../components/errors';
import {
  whatsappInboxApi,
  isWhatsAppApiKeyConfigured,
  type ConversationDetail,
  type InboxConversation,
  type InboxMessage,
  type InboxSocketEvent,
} from '../services/whatsappInboxApi';
import { formatWhatsFlowError, logWhatsFlowError } from '../utils/whatsappInboxErrors';
import { notify } from '../utils/notify';
import { useAuth } from '../hooks/useAuth';
import { isCRMOperationalUser } from '../utils/roles';

dayjs.extend(utc);
dayjs.extend(timezone);

type ConversationFilter = 'all' | 'unread' | 'assigned';

const EMOJIS = ['🙂', '👍', '🙏', '✅', '📍', '📞'];
const SEARCH_DEBOUNCE_MS = 500;

/** WhatsApp Web palette — one neutral dark + one teal accent */
const WA = {
  panel: '#202c33',
  primary: '#00a884',
  primaryHover: '#008f72',
  chatBg: '#efeae2',
  activeBg: '#f0f2f5',
} as const;

const CHAT_WALLPAPER =
  'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4cdc4\' fill-opacity=\'0.35\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")';

const AVATAR_COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#EAB308', '#14B8A6', '#6366F1'];

function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '?'
  );
}

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function AvatarBadge({
  name,
  size = 'md',
  unread,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  unread?: number;
}) {
  const dim = size === 'lg' ? 'h-16 w-16 text-xl' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm';
  return (
    <div className="relative shrink-0">
      <div
        className={`${dim} rounded-full flex items-center justify-center font-bold text-white shadow-sm`}
        style={{ backgroundColor: avatarColor(name) }}
      >
        {getInitials(name)}
      </div>
      {unread && unread > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] flex items-center justify-center font-bold border-2 border-white" style={{ backgroundColor: WA.primary }}>
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
    </div>
  );
}

const statusIcon = (status?: string) => {
  if (status === 'read') return <CheckCheck className="h-3.5 w-3.5 text-blue-600" aria-label="Read" />;
  if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 text-gray-500" aria-label="Delivered" />;
  if (status === 'sent') return <Check className="h-3.5 w-3.5 text-gray-500" aria-label="Sent" />;
  return <Circle className="h-3 w-3 text-gray-300" aria-hidden />;
};

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  sending: 1,
  sent: 2,
  delivered: 3,
  read: 4,
  failed: 99,
};

function mergeMessageStatus(
  current?: InboxMessage['status'],
  incoming?: InboxMessage['status'],
): InboxMessage['status'] | undefined {
  if (!incoming) return current;
  if (!current) return incoming;
  if (incoming === 'failed') return 'failed';
  if (current === 'failed') return current;
  return (STATUS_RANK[incoming] ?? 0) >= (STATUS_RANK[current] ?? 0) ? incoming : current;
}

function mergeMessageFields(existing: InboxMessage, incoming: InboxMessage): InboxMessage {
  return {
    ...existing,
    ...incoming,
    status: mergeMessageStatus(existing.status, incoming.status),
  };
}

const getFileAccept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov,.mp3,.wav,.aac,.ogg';

function bumpConversation(
  conversations: InboxConversation[],
  message: InboxMessage,
  selectedConversationId: string | null,
): InboxConversation[] {
  const idx = conversations.findIndex((c) => c.id === message.conversation_id);
  if (idx < 0) {
    const isSelected = message.conversation_id === selectedConversationId;
    return [
      {
        id: message.conversation_id,
        customer_name: message.sender_name || 'Unknown',
        phone: '',
        last_message: message.content,
        last_message_time: message.created_at,
        unread_count: message.direction === 'inbound' && !isSelected ? 1 : 0,
      },
      ...conversations,
    ];
  }

  const conv = conversations[idx];
  const isSelected = conv.id === selectedConversationId;
  const unread =
    message.direction === 'inbound' && !isSelected
      ? (conv.unread_count || 0) + 1
      : isSelected
        ? 0
        : conv.unread_count || 0;

  const updated: InboxConversation = {
    ...conv,
    last_message: message.content || conv.last_message,
    last_message_time: message.created_at || conv.last_message_time,
    unread_count: unread,
  };

  const rest = conversations.filter((c) => c.id !== message.conversation_id);
  return [updated, ...rest];
}

const WhatsAppInbox: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [search, setSearch] = useState('');
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [typingState, setTypingState] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const wsCleanupRef = useRef<(() => void) | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const socketEnabledRef = useRef(false);
  const intentionalCloseRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const pageRef = useRef(1);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const initialMessagesScrollRef = useRef(true);
  const initStartedRef = useRef(false);
  const filterRef = useRef(filter);
  const searchRef = useRef(search);
  const selectedConversationIdRef = useRef(selectedConversationId);

  filterRef.current = filter;
  searchRef.current = search;
  selectedConversationIdRef.current = selectedConversationId;

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  const filterCounts = useMemo(
    () => ({
      all: conversations.length,
      unread: conversations.filter((c) => (c.unread_count || 0) > 0).length,
      assigned: conversations.filter((c) => c.assigned_to_me).length,
    }),
    [conversations],
  );

  const quickContacts = useMemo(() => conversations.slice(0, 10), [conversations]);

  const filterLabels: Record<ConversationFilter, string> = {
    all: 'ALL',
    unread: 'UNREAD',
    assigned: 'ASSIGNED',
  };

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearSearchDebounce = useCallback(() => {
    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
  }, []);

  const clearTypingTimer = useCallback(() => {
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  const cancelPendingRequests = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const getAbortSignal = useCallback((): AbortSignal => {
    abortRef.current ??= new AbortController();
    return abortRef.current.signal;
  }, []);

  const loadConversationsRef = useRef<(reset?: boolean) => Promise<void>>(async () => {});

  const loadConversations = useCallback(
    async (reset = false) => {
      const signal = getAbortSignal();
      try {
        if (reset) {
          setLoading(true);
          setListError('');
          pageRef.current = 1;
        }
        const nextPage = reset ? 1 : pageRef.current;
        const response = await whatsappInboxApi.getConversations(
          {
            page: nextPage,
            page_size: 20,
            filter: filterRef.current,
            search: searchRef.current,
          },
          signal,
        );
        setConversations((prev) => (reset ? response.results : [...prev, ...response.results]));
        setHasMoreConversations(Boolean(response.next));
        pageRef.current = nextPage + 1;
      } catch (error) {
        if (signal.aborted) return;
        logWhatsFlowError('loadConversations', error);
        setListError(formatWhatsFlowError(error, 'Failed to load conversations.'));
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [getAbortSignal],
  );

  loadConversationsRef.current = loadConversations;

  const applyNewMessage = useCallback((message: InboxMessage) => {
    setConversationDetail((prev) => {
      if (!prev || prev.id !== message.conversation_id) return prev;
      const exists = prev.messages.some((m) => m.id === message.id);
      if (exists) {
        return {
          ...prev,
          messages: prev.messages.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
        };
      }
      return { ...prev, messages: [...prev.messages, message] };
    });
    setConversations((prev) =>
      bumpConversation(prev, message, selectedConversationIdRef.current),
    );
  }, []);

  const applyMessageStatus = useCallback((message: InboxMessage) => {
    setConversationDetail((prev) => {
      if (!prev || prev.id !== message.conversation_id) return prev;

      const byId = prev.messages.find((m) => m.id === message.id);
      if (byId) {
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.id === message.id ? mergeMessageFields(m, message) : m,
          ),
        };
      }

      const byWaId =
        message.whatsapp_message_id &&
        prev.messages.find((m) => m.whatsapp_message_id === message.whatsapp_message_id);
      if (byWaId) {
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.whatsapp_message_id === message.whatsapp_message_id
              ? mergeMessageFields(m, message)
              : m,
          ),
        };
      }

      const localIdx = prev.messages.findIndex(
        (m) =>
          m.id.startsWith('local-') &&
          m.direction === 'outbound' &&
          message.content &&
          m.content === message.content,
      );
      if (localIdx >= 0) {
        const messages = [...prev.messages];
        messages[localIdx] = mergeMessageFields(messages[localIdx], message);
        return { ...prev, messages };
      }

      return prev;
    });
  }, []);

  const applyOutboundSocketMessage = useCallback(
    (message: InboxMessage) => {
      setConversationDetail((prev) => {
        if (!prev || prev.id !== message.conversation_id) return prev;

        const byId = prev.messages.find((m) => m.id === message.id);
        if (byId) {
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === message.id ? mergeMessageFields(m, message) : m,
            ),
          };
        }

        const localIdx = prev.messages.findIndex(
          (m) =>
            m.id.startsWith('local-') &&
            m.direction === 'outbound' &&
            m.content === message.content,
        );
        if (localIdx >= 0) {
          const messages = [...prev.messages];
          messages[localIdx] = mergeMessageFields(messages[localIdx], message);
          return { ...prev, messages };
        }

        return { ...prev, messages: [...prev.messages, message] };
      });
      setConversations((prev) =>
        bumpConversation(prev, message, selectedConversationIdRef.current),
      );
    },
    [],
  );

  const loadConversationDetailRef = useRef<(conversationId: string, before?: string) => Promise<void>>(
    async () => {},
  );

  const handleSocketEvent = useCallback(
    (event: InboxSocketEvent) => {
      if (event.type === 'new_message' && event.message) {
        applyNewMessage(event.message);
        return;
      }
      if (event.type === 'message_sent' && event.message) {
        applyOutboundSocketMessage(event.message);
        return;
      }
      if (
        (event.type === 'message_delivered' ||
          event.type === 'message_read' ||
          event.type === 'message_status_updated') &&
        event.message
      ) {
        applyMessageStatus(event.message);
        return;
      }
      if (event.type === 'typing') {
        if (event.conversation_id === selectedConversationIdRef.current) {
          clearTypingTimer();
          setTypingState('Typing…');
          typingTimerRef.current = window.setTimeout(() => setTypingState(''), 1500);
        }
        return;
      }
      if (event.type === 'conversation_updated') {
        const convId = event.conversation_id;
        if (convId && convId === selectedConversationIdRef.current) {
          void loadConversationDetailRef.current(convId);
        } else {
          void loadConversationsRef.current(true);
        }
      }
    },
    [applyMessageStatus, applyNewMessage, applyOutboundSocketMessage, clearTypingTimer],
  );

  const handleSocketEventRef = useRef(handleSocketEvent);
  handleSocketEventRef.current = handleSocketEvent;

  const disconnectSocket = useCallback(
    (intentional = true) => {
      intentionalCloseRef.current = intentional;
      socketEnabledRef.current = false;
      clearReconnectTimer();
      if (wsCleanupRef.current) {
        wsCleanupRef.current();
        wsCleanupRef.current = null;
      }
      setSocketConnected(false);
    },
    [clearReconnectTimer],
  );

  const connectSocket = useCallback(async () => {
    if (document.hidden) return;

    clearReconnectTimer();
    intentionalCloseRef.current = true;
    if (wsCleanupRef.current) {
      wsCleanupRef.current();
      wsCleanupRef.current = null;
    }
    intentionalCloseRef.current = false;
    socketEnabledRef.current = true;

    try {
      wsCleanupRef.current = await whatsappInboxApi.connectInboxSocket({
        onOpen: () => {
          reconnectAttemptRef.current = 0;
          setSocketConnected(true);
        },
        onClose: () => {
          setSocketConnected(false);
          if (intentionalCloseRef.current || !socketEnabledRef.current) return;
          if (document.hidden) return;
          const delay = Math.min(2500 * 2 ** reconnectAttemptRef.current, 30000);
          reconnectAttemptRef.current += 1;
          clearReconnectTimer();
          reconnectTimerRef.current = window.setTimeout(() => {
            void connectSocket();
          }, delay);
        },
        onError: () => {
          setSocketConnected(false);
        },
        onEvent: (event) => handleSocketEventRef.current(event),
      });
    } catch (error) {
      logWhatsFlowError('connectSocket', error);
      setSocketConnected(false);
      if (!socketEnabledRef.current || document.hidden) return;
      const delay = Math.min(2500 * 2 ** reconnectAttemptRef.current, 30000);
      reconnectAttemptRef.current += 1;
      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        void connectSocket();
      }, delay);
    }
  }, [clearReconnectTimer]);

  const loadConversationDetail = useCallback(
    async (conversationId: string, before?: string) => {
      const signal = getAbortSignal();
      try {
        if (!before) {
          setChatLoading(true);
          setChatError('');
        } else {
          setLoadingOlder(true);
        }
        const detail = await whatsappInboxApi.getConversation(conversationId, before, signal);
        if (signal.aborted) return;

        if (before) {
          setConversationDetail((prev) => {
            if (!prev) return detail;
            const existingIds = new Set(prev.messages.map((m) => m.id));
            const newMessages = detail.messages.filter((m) => !existingIds.has(m.id));
            return {
              ...prev,
              messages: [...newMessages, ...prev.messages],
              has_older_messages: detail.has_older_messages,
            };
          });
        } else {
          setConversationDetail(detail);
          initialMessagesScrollRef.current = true;
          setConversations((prev) =>
            prev.map((conv) => (conv.id === conversationId ? { ...conv, unread_count: 0 } : conv)),
          );
        }
      } catch (error) {
        if (signal.aborted) return;
        logWhatsFlowError('loadConversationDetail', error);
        setChatError(formatWhatsFlowError(error, 'Failed to load conversation.'));
      } finally {
        if (!signal.aborted) {
          setChatLoading(false);
          setLoadingOlder(false);
        }
      }
    },
    [getAbortSignal],
  );

  loadConversationDetailRef.current = loadConversationDetail;

  const handleManualRefresh = useCallback(async () => {
    cancelPendingRequests();
    await loadConversations(true);
  }, [cancelPendingRequests, loadConversations]);

  const handleFilterChange = useCallback(
    (nextFilter: ConversationFilter) => {
      if (nextFilter === filterRef.current) return;
      filterRef.current = nextFilter;
      setFilter(nextFilter);
      cancelPendingRequests();
      void loadConversations(true);
    },
    [cancelPendingRequests, loadConversations],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      searchRef.current = value;
      clearSearchDebounce();
      searchDebounceRef.current = window.setTimeout(() => {
        cancelPendingRequests();
        void loadConversations(true);
      }, SEARCH_DEBOUNCE_MS);
    },
    [cancelPendingRequests, clearSearchDebounce, loadConversations],
  );

  const handleLoadMore = useCallback(() => {
    void loadConversations(false);
  }, [loadConversations]);

  useEffect(() => {
    if (!isCRMOperationalUser(user)) return;
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    let active = true;
    abortRef.current = new AbortController();

    const bootstrap = async () => {
      try {
        await whatsappInboxApi.ensureAuthenticated();
        if (!active) return;

        const signal = abortRef.current?.signal;
        const convPage = await whatsappInboxApi.getConversations(
          { page: 1, page_size: 20, filter: filterRef.current, search: searchRef.current },
          signal,
        );
        if (!active) return;

        setConversations(convPage.results);
        setHasMoreConversations(Boolean(convPage.next));
        pageRef.current = 2;
        setListError('');
        setLoading(false);

        if (!document.hidden) {
          await connectSocket();
        }
      } catch (error) {
        if (!active || abortRef.current?.signal.aborted) return;
        logWhatsFlowError('bootstrap', error);

        if (!isWhatsAppApiKeyConfigured()) {
          setListError(
            'WhatsApp Embed API key is not configured.\n\nSet VITE_WHATSAPP_API_KEY on Vercel (Production), then redeploy the CRM.',
          );
          setLoading(false);
          return;
        }

        setListError(formatWhatsFlowError(error, 'Failed to connect to WhatsApp.'));
        setLoading(false);
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        disconnectSocket(true);
        return;
      }
      if (socketEnabledRef.current) return;
      socketEnabledRef.current = true;
      reconnectAttemptRef.current = 0;
      void connectSocket();
    };

    const unsubscribeToken = whatsappInboxApi.onTokenRefreshed(() => {
      if (!active || document.hidden) return;
      reconnectAttemptRef.current = 0;
      void connectSocket();
    });

    void bootstrap();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      unsubscribeToken();
      clearSearchDebounce();
      clearTypingTimer();
      clearReconnectTimer();
      disconnectSocket(true);
      cancelPendingRequests();
      whatsappInboxApi.teardown();
      initStartedRef.current = false;
    };
  }, [
    cancelPendingRequests,
    clearReconnectTimer,
    clearSearchDebounce,
    clearTypingTimer,
    connectSocket,
    disconnectSocket,
    user?.id,
  ]);

  useEffect(() => {
    if (socketConnected || !selectedConversationId) return undefined;

    const timer = window.setInterval(() => {
      void loadConversationDetailRef.current(selectedConversationId);
      void loadConversationsRef.current(true);
    }, 20000);

    return () => window.clearInterval(timer);
  }, [socketConnected, selectedConversationId]);

  useEffect(() => {
    if (!conversationDetail || !messagesContainerRef.current || !initialMessagesScrollRef.current) return;
    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    initialMessagesScrollRef.current = false;
  }, [conversationDetail]);

  const onSelectConversation = async (conversation: InboxConversation) => {
    setSelectedConversationId(conversation.id);
    setConversationDetail(null);
    setChatError('');
    await loadConversationDetail(conversation.id);
  };

  const appendLocalOutboundMessage = (text: string): string => {
    const conversationId = selectedConversationIdRef.current;
    if (!conversationId) return '';

    const localId = `local-${Date.now()}`;
    const message: InboxMessage = {
      id: localId,
      conversation_id: conversationId,
      direction: 'outbound',
      message_type: 'text',
      content: text,
      created_at: new Date().toISOString(),
      status: 'sent',
    };
    applyNewMessage(message);
    return localId;
  };

  const handleSendText = async () => {
    if (!selectedConversationId || !composerText.trim()) return;
    const text = composerText.trim();
    setComposerText('');
    appendLocalOutboundMessage(text);

    try {
      setSending(true);
      await whatsappInboxApi.sendText({
        conversation_id: selectedConversationId,
        message: text,
        phone: selectedConversation?.phone || conversationDetail?.phone,
      });
    } catch (error) {
      notify.apiError(error, 'WhatsAppInbox.sendText', 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleSendMedia = async (file: File | null) => {
    if (!selectedConversationId || !file) return;
    const localId = `local-${Date.now()}`;
    const message: InboxMessage = {
      id: localId,
      conversation_id: selectedConversationId,
      direction: 'outbound',
      message_type: 'image',
      content: file.name,
      created_at: new Date().toISOString(),
      status: 'sent',
    };
    applyNewMessage(message);

    try {
      setSending(true);
      await whatsappInboxApi.sendMedia({
        conversation_id: selectedConversationId,
        file,
      });
    } catch (error) {
      notify.apiError(error, 'WhatsAppInbox.sendMedia', 'Failed to send media.');
    } finally {
      setSending(false);
    }
  };

  const handleMessagesScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (
      container.scrollTop < 40 &&
      !loadingOlder &&
      conversationDetail?.has_older_messages &&
      conversationDetail.messages.length > 0
    ) {
      await loadConversationDetail(
        conversationDetail.id,
        conversationDetail.messages[0].created_at,
      );
    }
  };

  const wrapComposerSelection = (wrap: string) => {
    const el = document.getElementById('wa-composer') as HTMLTextAreaElement | null;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = composerText.slice(start, end);
    const next = `${composerText.slice(0, start)}${wrap}${selected}${wrap}${composerText.slice(end)}`;
    setComposerText(next);
  };

  if (!isCRMOperationalUser(user)) {
    return <ErrorAlert title="Access denied" message="You do not have permission to use WhatsApp Inbox." />;
  }

  if (loading && conversations.length === 0) {
    return <PageLoading text="Loading WhatsApp Inbox..." />;
  }

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col bg-[#eef1f4] rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {listError ? (
        <div className="px-4 pt-3">
          <ErrorAlert title="WhatsApp Inbox" message={listError} />
        </div>
      ) : null}

      {/* Top bar — search + quick contacts */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name or mobile number"
            className="w-full h-10 pl-9 pr-10 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00a884]/25"
          />
          <SlidersHorizontal className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex-1 flex items-center gap-3 overflow-x-auto py-1 min-w-0">
          {quickContacts.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => void onSelectConversation(conv)}
              className="flex flex-col items-center gap-1 shrink-0 min-w-[56px]"
              title={conv.customer_name}
            >
              <AvatarBadge name={conv.customer_name || '?'} size="sm" unread={conv.unread_count} />
              <span className="text-[10px] text-gray-600 truncate max-w-[56px]">
                {(conv.customer_name || '?').split(' ')[0]}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handleManualRefresh()}
          className="h-10 w-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center shrink-0"
          title="Refresh inbox"
        >
          <RefreshCw className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* 3-pane workspace */}
      <div className="flex flex-1 min-h-0">
        {/* Left — conversation list */}
        <section className="w-full lg:w-[300px] xl:w-[320px] border-r border-gray-200 bg-white flex flex-col min-h-0 shrink-0">
          <div className="flex border-b border-gray-200 bg-[#fafbfc]">
            {(['all', 'unread', 'assigned'] as ConversationFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => handleFilterChange(f)}
                className={`flex-1 py-3 text-[11px] font-bold tracking-wide border-b-2 transition-colors ${
                  filter === f
                    ? 'border-[#00a884] text-[#00a884] bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {filterLabels[f]} ({filterCounts[f]})
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No conversations found.</div>
            ) : (
              conversations.map((conv) => {
                const active = selectedConversationId === conv.id;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => void onSelectConversation(conv)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-[#f8faf9] transition-colors ${
                      active ? 'bg-[#f0f2f5] border-l-[3px] border-l-[#00a884]' : 'border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AvatarBadge name={conv.customer_name || '?'} unread={conv.unread_count} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-sm text-gray-900 truncate uppercase tracking-tight">
                            {conv.customer_name || 'Unknown'}
                          </p>
                          <p className="text-[10px] text-gray-400 shrink-0">
                            {conv.last_message_time ? dayjs(conv.last_message_time).format('DD/MM') : ''}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {conv.last_message || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
            {hasMoreConversations ? (
              <div className="p-3">
                <Button type="button" variant="outline" className="w-full text-sm" onClick={handleLoadMore}>
                  Load more
                </Button>
              </div>
            ) : null}
          </div>
        </section>

        {/* Center — chat */}
        <section className="flex-1 flex flex-col min-h-0 min-w-0" style={{ backgroundColor: WA.chatBg }}>
          {!selectedConversationId ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 bg-[#f0f2f5]">
              <div className="text-center">
                <MessageCircle className="h-14 w-14 mx-auto text-gray-300 mb-3" />
                <p className="font-semibold text-gray-700">Select a conversation</p>
                <p className="text-sm text-gray-500 mt-1">Choose a contact from the list to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 text-white flex items-center justify-between gap-3 shrink-0" style={{ backgroundColor: WA.panel }}>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate uppercase tracking-wide">
                    {selectedConversation?.customer_name}
                    {selectedConversation?.phone ? (
                      <span className="font-normal normal-case text-white/80 ml-2">
                        ({selectedConversation.phone})
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-white/70 mt-0.5">
                    {typingState || (socketConnected ? 'Connected · Live updates' : 'Reconnecting…')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                      socketConnected ? 'bg-[#00a884]/25 text-[#d9fdd3]' : 'bg-amber-500/20 text-amber-100'
                    }`}
                  >
                    {socketConnected ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                style={{
                  backgroundColor: WA.chatBg,
                  backgroundImage: CHAT_WALLPAPER,
                }}
              >
                {chatLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-600">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading messages…
                  </div>
                ) : chatError ? (
                  <ErrorAlert title="Chat error" message={chatError} />
                ) : (
                  <>
                    {loadingOlder ? (
                      <div className="text-center text-xs text-gray-600 bg-white/60 rounded-full py-1 px-3 mx-auto w-fit">
                        Loading older messages…
                      </div>
                    ) : null}
                    {conversationDetail?.messages.map((msg) => {
                      const isOut = msg.direction === 'outbound';
                      return (
                        <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[78%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                              isOut
                                ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none'
                                : 'bg-white text-gray-800 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-line break-words">{msg.content}</p>
                            {msg.media_url ? (
                              <a
                                href={msg.media_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 underline mt-1 inline-block"
                              >
                                Open attachment
                              </a>
                            ) : null}
                            <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-gray-500">
                              <span>{dayjs(msg.created_at).format('hh:mm A')}</span>
                              {isOut ? statusIcon(msg.status) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Composer */}
              <div className="bg-white border-t border-gray-200 p-3 shrink-0">
                <div className="flex items-center gap-1 mb-2 text-gray-500">
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded" onClick={() => wrapComposerSelection('*')} title="Bold">
                    <Bold className="h-4 w-4" />
                  </button>
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded" onClick={() => wrapComposerSelection('_')} title="Italic">
                    <Italic className="h-4 w-4" />
                  </button>
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded" onClick={() => wrapComposerSelection('~')} title="Strikethrough">
                    <Strikethrough className="h-4 w-4" />
                  </button>
                  <span className="w-px h-4 bg-gray-200 mx-1" />
                  {EMOJIS.slice(0, 3).map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="p-1.5 hover:bg-gray-100 rounded text-base leading-none"
                      onClick={() => setComposerText((prev) => `${prev}${emoji}`)}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded" title="Emoji">
                    <Smile className="h-4 w-4" />
                  </button>
                  <label className="p-1.5 hover:bg-gray-100 rounded cursor-pointer" title="Attach file">
                    <Paperclip className="h-4 w-4" />
                    <input
                      type="file"
                      accept={getFileAccept}
                      className="hidden"
                      onChange={(e) => handleSendMedia(e.target.files?.[0] || null)}
                    />
                  </label>
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded" title="Image">
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <button type="button" className="p-1.5 hover:bg-gray-100 rounded" title="Quick reply">
                    <Zap className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    id="wa-composer"
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendText();
                      }
                    }}
                    placeholder="Type a message…"
                    className="flex-1 min-h-[44px] max-h-32 resize-none px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00a884]/25"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendText()}
                    disabled={!composerText.trim() || sending}
                    className="h-11 px-5 rounded-lg disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-2 shrink-0 transition-colors hover:opacity-95"
                    style={{ backgroundColor: WA.primary }}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default WhatsAppInbox;

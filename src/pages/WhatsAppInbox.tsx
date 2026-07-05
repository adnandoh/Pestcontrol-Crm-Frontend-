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

const statusIcon = (status?: string) => {
  if (status === 'read') return <CheckCheck className="h-3.5 w-3.5 text-blue-600" aria-label="Read" />;
  if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 text-gray-500" aria-label="Delivered" />;
  if (status === 'sent') return <Check className="h-3.5 w-3.5 text-gray-500" aria-label="Sent" />;
  return <Circle className="h-3 w-3 text-gray-300" aria-hidden />;
};

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

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations],
  );

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
            m.id === message.id ? { ...m, status: message.status } : m,
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
        messages[localIdx] = { ...messages[localIdx], ...message };
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
            messages: prev.messages.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
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
          messages[localIdx] = message;
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
        (event.type === 'message_delivered' || event.type === 'message_read') &&
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
        text,
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

  if (!isCRMOperationalUser(user)) {
    return <ErrorAlert title="Access denied" message="You do not have permission to use WhatsApp Inbox." />;
  }

  if (loading && conversations.length === 0) {
    return <PageLoading text="Loading WhatsApp Inbox..." />;
  }

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col gap-3">
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-gray-900">Inbox</h1>
              {unreadTotal > 0 ? (
                <span className="inline-flex min-w-[20px] h-5 px-1.5 rounded-full bg-teal-600 text-white text-[11px] items-center justify-center font-bold">
                  {unreadTotal}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-gray-500">
              {socketConnected ? 'Real-time connected' : document.hidden ? 'Paused (tab in background)' : 'Reconnecting…'}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => void handleManualRefresh()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {listError && (
        <ErrorAlert title="WhatsApp Inbox" message={listError} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0 min-h-0 flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <section className="border-r border-gray-200 flex flex-col min-h-0 bg-white">
          <div className="p-3 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {(['all', 'unread', 'assigned'] as ConversationFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleFilterChange(f)}
                  className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide rounded-md ${
                    filter === f
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Assigned'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search conversations…"
                className="w-full h-9 pl-8 pr-3 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => {
              const active = selectedConversationId === conv.id;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => onSelectConversation(conv)}
                  className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    active ? 'bg-teal-50/80 border-l-4 border-l-teal-600' : 'border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
                      {(conv.customer_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-gray-900 truncate">{conv.customer_name || 'Unknown'}</p>
                        <p className="text-[11px] text-gray-400 shrink-0">
                          {conv.last_message_time ? dayjs(conv.last_message_time).format('ddd') : ''}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{conv.phone}</p>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{conv.last_message || 'No messages yet'}</p>
                    </div>
                    {conv.unread_count > 0 ? (
                      <span className="inline-flex min-w-[18px] h-[18px] px-1 rounded-full bg-teal-600 text-white text-[10px] items-center justify-center font-bold shrink-0">
                        {conv.unread_count}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
            {hasMoreConversations && (
              <div className="p-3">
                <Button type="button" variant="outline" className="w-full" onClick={handleLoadMore}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col min-h-0 bg-[#efeae2]">
          {!selectedConversationId ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 bg-[#f0f2f5]">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="font-medium">Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0">
                    {(selectedConversation?.customer_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{selectedConversation?.customer_name}</p>
                    <p className="text-xs text-gray-500">{selectedConversation?.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs shrink-0">
                  {typingState ? <span className="text-teal-700 font-semibold">{typingState}</span> : null}
                  <span className={socketConnected ? 'text-emerald-600' : 'text-amber-600'}>
                    {socketConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>

              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)',
                  backgroundSize: '18px 18px',
                }}
              >
                {chatLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading chat...
                  </div>
                ) : chatError ? (
                  <ErrorAlert title="Chat error" message={chatError} />
                ) : (
                  <>
                    {loadingOlder ? (
                      <div className="text-center text-xs text-gray-500">Loading older messages…</div>
                    ) : null}
                    {conversationDetail?.messages.map((msg) => {
                      const isOut = msg.direction === 'outbound';
                      return (
                        <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                              isOut ? 'bg-[#d9fdd3] text-gray-900' : 'bg-white text-gray-800'
                            }`}
                          >
                            <p className="whitespace-pre-line break-words">{msg.content}</p>
                            {msg.media_url ? (
                              <a href={msg.media_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline mt-1 inline-block">
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

              <div className="border-t border-gray-200 bg-[#f0f2f5] p-3 space-y-2">
                <div className="flex items-center gap-1">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="text-lg hover:bg-white/80 rounded p-1"
                      onClick={() => setComposerText((prev) => `${prev}${emoji}`)}
                      aria-label={`Insert ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <label className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white border border-gray-200 cursor-pointer hover:bg-gray-50 shrink-0">
                    <Paperclip className="h-4 w-4 text-gray-600" />
                    <input
                      type="file"
                      accept={getFileAccept}
                      className="hidden"
                      onChange={(e) => handleSendMedia(e.target.files?.[0] || null)}
                    />
                  </label>
                  <textarea
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendText();
                      }
                    }}
                    placeholder="Message customer on WhatsApp…"
                    className="flex-1 min-h-[40px] max-h-28 resize-none px-4 py-2.5 text-sm border border-gray-200 rounded-3xl bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                  <Button
                    type="button"
                    onClick={handleSendText}
                    disabled={!composerText.trim() || sending}
                    className="h-10 w-10 rounded-full p-0 shrink-0 bg-teal-600 hover:bg-teal-700"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4 mx-auto" />
                  </Button>
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

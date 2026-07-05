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
import { getErrorMessage, logErrorForDev } from '../utils/errors';
import { notify } from '../utils/notify';
import { useAuth } from '../hooks/useAuth';
import { isCRMOperationalUser } from '../utils/roles';

dayjs.extend(utc);
dayjs.extend(timezone);

type ConversationFilter = 'all' | 'unread' | 'assigned';

const EMOJIS = ['🙂', '👍', '🙏', '✅', '📍', '📞'];

const statusIcon = (status?: string) => {
  if (status === 'read') return <CheckCheck className="h-3.5 w-3.5 text-blue-600" aria-label="Read" />;
  if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 text-gray-500" aria-label="Delivered" />;
  if (status === 'sent') return <Check className="h-3.5 w-3.5 text-gray-500" aria-label="Sent" />;
  return <Circle className="h-3 w-3 text-gray-300" aria-hidden />;
};

const getFileAccept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov,.mp3,.wav,.aac,.ogg';

const WhatsAppInbox: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
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

  const wsCleanupRef = useRef<(() => void) | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const socketEnabledRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const pageRef = useRef(1);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const initialMessagesScrollRef = useRef(true);
  const bootstrapInitializedRef = useRef(false);
  const socketInitializedRef = useRef(false);
  const filterSearchInitializedRef = useRef(false);
  const filterRef = useRef(filter);
  const searchRef = useRef(search);

  filterRef.current = filter;
  searchRef.current = search;

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations],
  );

  const loadConversations = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setListError('');
        setServiceUnavailable(false);
        pageRef.current = 1;
      }
      const nextPage = reset ? 1 : pageRef.current;
      const response = await whatsappInboxApi.getConversations({
        page: nextPage,
        page_size: 20,
        filter: filterRef.current,
        search: searchRef.current,
      });
      setConversations((prev) => (reset ? response.results : [...prev, ...response.results]));
      setHasMoreConversations(Boolean(response.next));
      pageRef.current = nextPage + 1;
    } catch (error) {
      logErrorForDev('WhatsAppInbox.loadConversations', error);
      const msg = getErrorMessage(error, 'Failed to load conversations.');
      setListError(msg);
      const isUnavailable =
        msg.toLowerCase().includes('server') ||
        msg.toLowerCase().includes('unavailable') ||
        msg.toLowerCase().includes('unable to reach');
      if (isUnavailable) {
        setServiceUnavailable(true);
        setListError('WhatsApp service is temporarily unavailable.\n\nPlease try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const mergeIncomingMessage = useCallback((message: InboxMessage) => {
    setConversationDetail((prev) => {
      if (!prev || prev.id !== message.conversation_id) return prev;
      const exists = prev.messages.some((m) => m.id === message.id);
      if (exists) {
        return {
          ...prev,
          messages: prev.messages.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
        };
      }
      return {
        ...prev,
        messages: [...prev.messages, message],
      };
    });
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== message.conversation_id) return conv;
        const unread = message.direction === 'inbound' ? (conv.unread_count || 0) + 1 : conv.unread_count || 0;
        return {
          ...conv,
          last_message: message.content || conv.last_message,
          last_message_time: message.created_at || conv.last_message_time,
          unread_count: conv.id === selectedConversationId ? 0 : unread,
        };
      }),
    );
  }, [selectedConversationId]);

  const handleSocketEvent = useCallback(
    (event: InboxSocketEvent) => {
      if (event.type === 'new_message' && event.message) {
        mergeIncomingMessage(event.message);
        return;
      }
      if ((event.type === 'message_sent' || event.type === 'message_delivered' || event.type === 'message_read') && event.message) {
        mergeIncomingMessage(event.message);
        return;
      }
      if (event.type === 'typing') {
        if (event.conversation_id === selectedConversationId) {
          setTypingState('Typing…');
          window.setTimeout(() => setTypingState(''), 1500);
        }
      }
    },
    [mergeIncomingMessage, selectedConversationId],
  );

  const handleSocketEventRef = useRef(handleSocketEvent);
  handleSocketEventRef.current = handleSocketEvent;

  const disconnectSocket = useCallback(() => {
    socketEnabledRef.current = false;
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsCleanupRef.current) {
      wsCleanupRef.current();
      wsCleanupRef.current = null;
    }
    setSocketConnected(false);
  }, []);

  const connectSocket = useCallback(async () => {
    try {
      disconnectSocket();
      socketEnabledRef.current = true;
      wsCleanupRef.current = await whatsappInboxApi.connectInboxSocket({
        onOpen: () => {
          reconnectAttemptRef.current = 0;
          setSocketConnected(true);
        },
        onClose: () => {
          setSocketConnected(false);
          if (!socketEnabledRef.current) return;
          const delay = Math.min(2500 * 2 ** reconnectAttemptRef.current, 30000);
          reconnectAttemptRef.current += 1;
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
      logErrorForDev('WhatsAppInbox.connectSocket', error);
      setSocketConnected(false);
      if (!socketEnabledRef.current) return;
      const delay = Math.min(2500 * 2 ** reconnectAttemptRef.current, 30000);
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = window.setTimeout(() => {
        void connectSocket();
      }, delay);
    }
  }, [disconnectSocket]);

  const loadConversationDetail = useCallback(
    async (conversationId: string, before?: string) => {
      try {
        if (!before) {
          setChatLoading(true);
          setChatError('');
        } else {
          setLoadingOlder(true);
        }
        const detail = await whatsappInboxApi.getConversation(conversationId, before);
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
        logErrorForDev('WhatsAppInbox.loadConversationDetail', error);
        setChatError(getErrorMessage(error, 'Failed to load conversation.'));
      } finally {
        setChatLoading(false);
        setLoadingOlder(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isCRMOperationalUser(user)) return;
    if (bootstrapInitializedRef.current) return;
    bootstrapInitializedRef.current = true;

    let active = true;
    const bootstrap = async () => {
      try {
        await whatsappInboxApi.ensureAuthenticated();
        if (!active) return;
        await loadConversations(true);
      } catch (error) {
        logErrorForDev('WhatsAppInbox.bootstrap', error);
        const msg = getErrorMessage(error, 'Failed to connect to WhatsApp.');
        const missingApiKey =
          !isWhatsAppApiKeyConfigured() ||
          msg.toLowerCase().includes('api key') ||
          msg.toLowerCase().includes('vite_whatsapp_api_key');
        if (missingApiKey) {
          setServiceUnavailable(true);
          setListError(
            'WhatsApp Embed API key is not configured.\n\nSet VITE_WHATSAPP_API_KEY on Vercel (Production), then redeploy the CRM.',
          );
          return;
        }
        setServiceUnavailable(true);
        setListError('WhatsApp service is temporarily unavailable.\n\nPlease try again later.');
      }
    };
    bootstrap();
    return () => {
      active = false;
    };
  }, [loadConversations, user?.id]);

  useEffect(() => {
    if (!isCRMOperationalUser(user)) return;
    if (!filterSearchInitializedRef.current) {
      filterSearchInitializedRef.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      void loadConversations(true);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filter, search, loadConversations, user?.id]);

  useEffect(() => {
    if (!isCRMOperationalUser(user)) return;
    if (socketInitializedRef.current) return;
    socketInitializedRef.current = true;

    reconnectAttemptRef.current = 0;
    void connectSocket();
    const unsubscribe = whatsappInboxApi.onTokenRefreshed(() => {
      reconnectAttemptRef.current = 0;
      void connectSocket();
    });
    return () => {
      unsubscribe();
      disconnectSocket();
    };
  }, [connectSocket, disconnectSocket, user?.id]);

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

  const handleSendText = async () => {
    if (!selectedConversationId || !composerText.trim()) return;
    try {
      setSending(true);
      await whatsappInboxApi.sendText({
        conversation_id: selectedConversationId,
        text: composerText.trim(),
      });
      setComposerText('');
    } catch (error) {
      notify.apiError(error, 'WhatsAppInbox.sendText', 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleSendMedia = async (file: File | null) => {
    if (!selectedConversationId || !file) return;
    try {
      setSending(true);
      await whatsappInboxApi.sendMedia({
        conversation_id: selectedConversationId,
        file,
      });
      notify.success('Media sent.');
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
              {socketConnected ? 'Real-time connected' : 'Reconnecting…'}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => loadConversations(true)} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {(serviceUnavailable || listError) && (
        <ErrorAlert
          title="WhatsApp Inbox"
          message={listError || 'WhatsApp service is temporarily unavailable.\n\nPlease try again later.'}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0 min-h-0 flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {/* Conversation list — WhatsFlow style */}
        <section className="border-r border-gray-200 flex flex-col min-h-0 bg-white">
          <div className="p-3 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {(['all', 'unread', 'assigned'] as ConversationFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
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
                onChange={(e) => setSearch(e.target.value)}
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
                <Button type="button" variant="outline" className="w-full" onClick={() => loadConversations(false)}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Chat panel — WhatsFlow style */}
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

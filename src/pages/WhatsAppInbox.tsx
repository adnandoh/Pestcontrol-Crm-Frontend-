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
  Plus,
  FileText,
  Receipt,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Button, Drawer, Input, PageLoading } from '../components/ui';
import { ErrorAlert, FormErrorBanner } from '../components/errors';
import {
  whatsappInboxApi,
  isWhatsAppApiKeyConfigured,
  type ConversationDetail,
  type InboxConversation,
  type InboxMessage,
  type InboxSocketEvent,
} from '../services/whatsappInboxApi';
import { enhancedApiService } from '../services/api.enhanced';
import type { Client, CustomerHistory, JobCard, QuotationFormData, JobCardFormData } from '../types';
import { getErrorMessage, logErrorForDev } from '../utils/errors';
import { notify } from '../utils/notify';
import { downloadManualInvoicePdf } from '../utils/invoicePdf';
import AssignTechnicianModal from '../components/crm/AssignTechnicianModal';
import { useAuth } from '../hooks/useAuth';
import { isCRMOperationalUser } from '../utils/roles';

dayjs.extend(utc);
dayjs.extend(timezone);

type ConversationFilter = 'all' | 'unread' | 'assigned';

interface CustomerPanelData {
  client: Client | null;
  history: CustomerHistory | null;
  pendingAmount: number;
}

const EMOJIS = ['🙂', '👍', '🙏', '✅', '📍', '📞', '💰', '🧾', '🪳', '🐀'];

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
  const [templateId, setTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [typingState, setTypingState] = useState('');
  const [customerPanel, setCustomerPanel] = useState<CustomerPanelData>({
    client: null,
    history: null,
    pendingAmount: 0,
  });
  const [rightPanelLoading, setRightPanelLoading] = useState(false);
  const [rightPanelError, setRightPanelError] = useState('');

  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);
  const [bookingSubmitError, setBookingSubmitError] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [quotationDrawerOpen, setQuotationDrawerOpen] = useState(false);
  const [quotationSubmitting, setQuotationSubmitting] = useState(false);
  const [quotationSubmitError, setQuotationSubmitError] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    client_name: '',
    client_mobile: '',
    client_address: '',
    client_city: '',
    service_type: 'General Pest Control',
    schedule_date: dayjs().format('YYYY-MM-DD'),
    notes: '',
  });
  const [quotationForm, setQuotationForm] = useState({
    customer_name: '',
    mobile: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    service_name: 'General Pest Control',
    amount: '0',
  });

  const wsCleanupRef = useRef<(() => void) | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const socketEnabledRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const pageRef = useRef(1);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const initialMessagesScrollRef = useRef(true);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  const selectedPrimaryBooking: JobCard | null = useMemo(() => {
    if (!customerPanel.history) return null;
    return customerPanel.history.upcoming?.[0] || customerPanel.history.bookings?.[0] || null;
  }, [customerPanel.history]);

  const prefillActionForms = useCallback(
    (conversation: InboxConversation, client: Client | null) => {
      const name = client?.full_name || conversation.customer_name || '';
      const phone = client?.mobile || conversation.phone || '';
      const address = client?.address || '';
      const city = client?.city || '';

      setBookingForm((prev) => ({
        ...prev,
        client_name: name,
        client_mobile: phone,
        client_address: address,
        client_city: city,
      }));
      setQuotationForm((prev) => ({
        ...prev,
        customer_name: name,
        mobile: phone,
        address,
        city: city || prev.city,
      }));
    },
    [],
  );

  const loadConversations = useCallback(
    async (reset = false) => {
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
          filter,
          search,
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
    },
    [filter, search],
  );

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
        return;
      }
      if (event.type === 'presence') {
        // optional future use
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

  const loadCustomerPanel = useCallback(
    async (conversation: InboxConversation) => {
      setRightPanelLoading(true);
      setRightPanelError('');
      try {
        const phone = conversation.phone?.replace(/[^\d+]/g, '') || '';
        const clientRes = await enhancedApiService.checkClientExists(phone.replace(/\D/g, '').slice(-10));
        const client = clientRes.exists ? clientRes.client || null : null;

        let history: CustomerHistory | null = null;
        if (client?.id) {
          history = await enhancedApiService.getCustomerHistory(client.id);
        }

        const pendingRes = await enhancedApiService.getPendingPayments({
          search: phone,
          page_size: 50,
          ordering: '-schedule_datetime',
        });
        const pendingAmount = pendingRes.results.reduce((sum, job) => {
          const v = Number.parseFloat(String((job as { pending_amount?: number | string }).pending_amount ?? 0));
          return sum + (Number.isFinite(v) ? v : 0);
        }, 0);

        setCustomerPanel({
          client,
          history,
          pendingAmount,
        });
        prefillActionForms(conversation, client);
      } catch (error) {
        logErrorForDev('WhatsAppInbox.loadCustomerPanel', error);
        setRightPanelError(getErrorMessage(error, 'Could not load customer CRM information.'));
        setCustomerPanel({ client: null, history: null, pendingAmount: 0 });
      } finally {
        setRightPanelLoading(false);
      }
    },
    [prefillActionForms],
  );

  useEffect(() => {
    if (!isCRMOperationalUser(user)) return;
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
  }, [loadConversations, user]);

  useEffect(() => {
    if (!isCRMOperationalUser(user)) return;
    reconnectAttemptRef.current = 0;
    void connectSocket();
    return () => {
      disconnectSocket();
    };
  }, [connectSocket, disconnectSocket, user]);

  useEffect(() => {
    if (!conversationDetail || !messagesContainerRef.current || !initialMessagesScrollRef.current) return;
    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    initialMessagesScrollRef.current = false;
  }, [conversationDetail]);

  const onSelectConversation = async (conversation: InboxConversation) => {
    setSelectedConversationId(conversation.id);
    setConversationDetail(null);
    setChatError('');
    await Promise.all([
      loadConversationDetail(conversation.id),
      loadCustomerPanel(conversation),
    ]);
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

  const handleSendTemplate = async () => {
    if (!selectedConversationId || !templateId.trim()) return;
    try {
      setSending(true);
      await whatsappInboxApi.sendTemplate({
        conversation_id: selectedConversationId,
        template_id: templateId.trim(),
      });
      setTemplateId('');
      notify.success('Template sent.');
    } catch (error) {
      notify.apiError(error, 'WhatsAppInbox.sendTemplate', 'Failed to send template.');
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

  const handleCreateBooking = async () => {
    try {
      setBookingSubmitError('');
      setBookingSubmitting(true);
      const payload: JobCardFormData = {
        client_name: bookingForm.client_name.trim(),
        client_mobile: bookingForm.client_mobile.trim(),
        client_email: customerPanel.client?.email || '',
        client_city: bookingForm.client_city.trim() || customerPanel.client?.city || 'Mumbai',
        client_address: bookingForm.client_address.trim(),
        client_notes: bookingForm.notes.trim(),
        job_type: 'Customer',
        commercial_type: 'home',
        is_price_estimated: false,
        service_category: 'One-Time Service',
        property_type: 'Home / Flat',
        bhk_size: '',
        is_paused: false,
        service_type: bookingForm.service_type.trim(),
        schedule_datetime: bookingForm.schedule_date,
        time_slot: '10:00 AM',
        state: customerPanel.client?.state || 'Maharashtra',
        city: bookingForm.client_city.trim() || customerPanel.client?.city || 'Mumbai',
        status: 'Pending',
        payment_status: 'Unpaid',
        assigned_to: '',
        technician: null,
        price: '0',
        reference: 'WhatsApp',
      };
      await enhancedApiService.createJobCard(payload, Boolean(customerPanel.client));
      notify.success('Booking created successfully.');
      setBookingDrawerOpen(false);
    } catch (error) {
      const msg = getErrorMessage(error, 'Failed to create booking.');
      setBookingSubmitError(msg);
      notify.apiError(error, 'WhatsAppInbox.createBooking', msg);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleCreateQuotation = async () => {
    try {
      setQuotationSubmitting(true);
      setQuotationSubmitError('');
      const amount = Number.parseFloat(quotationForm.amount || '0') || 0;
      const payload: QuotationFormData = {
        customer_name: quotationForm.customer_name.trim(),
        mobile: quotationForm.mobile.trim(),
        address: quotationForm.address.trim(),
        city: quotationForm.city.trim() || 'Mumbai',
        state: quotationForm.state.trim() || 'Maharashtra',
        quotation_type: 'Residential',
        status: 'Draft',
        discount: 0,
        tax_amount: 0,
        total_amount: amount,
        grand_total: amount,
        is_amc: false,
        visit_count: 1,
        contract_amount: amount,
        items: [
          {
            service_name: quotationForm.service_name || 'General Pest Control',
            frequency: 'One Time',
            quantity: 1,
            rate: amount,
            total: amount,
          },
        ],
        scopes: [],
        payment_terms: [],
      };
      await enhancedApiService.createQuotation(payload);
      notify.success('Quotation created successfully.');
      setQuotationDrawerOpen(false);
    } catch (error) {
      const msg = getErrorMessage(error, 'Failed to create quotation.');
      setQuotationSubmitError(msg);
      notify.apiError(error, 'WhatsAppInbox.createQuotation', msg);
    } finally {
      setQuotationSubmitting(false);
    }
  };

  const handleCreateInvoice = async () => {
    const customerName = customerPanel.client?.full_name || selectedConversation?.customer_name || 'Customer';
    const phone = customerPanel.client?.mobile || selectedConversation?.phone || '';
    const address = customerPanel.client?.address || selectedConversation?.phone || '';
    const booking = selectedPrimaryBooking;

    await downloadManualInvoicePdf({
      billedToName: customerName,
      billedToMobile: phone,
      billedToAddress: address,
      bookingCode: booking?.code || '',
      bookingCreatedAt: booking?.created_at || '',
      nextServiceDate: booking?.next_service_date || booking?.schedule_datetime || '',
      reference: 'WhatsApp Inbox',
      tax: 0,
      items: [
        {
          service: booking?.service_type || 'Service Charge',
          schedule: booking?.schedule_datetime || dayjs().format('YYYY-MM-DD'),
          technician: booking?.technician_name || '',
          amount: Number.parseFloat(String(booking?.price || 0)) || 0,
        },
      ],
    });
    notify.success('Invoice generated.');
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
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 text-green-700 rounded-lg">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900">WhatsApp Inbox</h1>
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

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr_340px] gap-3 min-h-0 flex-1">
        {/* Left panel */}
        <section className="bg-white border border-gray-200 rounded-xl flex flex-col min-h-0">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              {(['all', 'unread', 'assigned'] as ConversationFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFilter(f);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${
                    filter === f
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : 'Assigned to Me'}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or mobile"
                className="w-full h-9 pl-8 pr-3 text-sm border border-gray-300 rounded-lg"
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
                  className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 ${
                    active ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{conv.customer_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">{conv.phone}</p>
                      <p className="text-xs text-gray-600 mt-1 truncate">{conv.last_message || 'No messages yet'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-gray-400">
                        {conv.last_message_time ? dayjs(conv.last_message_time).format('hh:mm A') : '--'}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="inline-flex mt-1 min-w-[18px] h-[18px] px-1 rounded-full bg-green-600 text-white text-[10px] items-center justify-center font-bold">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
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

        {/* Center panel */}
        <section className="bg-white border border-gray-200 rounded-xl flex flex-col min-h-0">
          {!selectedConversationId ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a conversation to start.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                <div>
                  <p className="font-black text-gray-900">{selectedConversation?.customer_name}</p>
                  <p className="text-xs text-gray-500">{selectedConversation?.phone}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {typingState ? <span className="text-blue-600 font-semibold">{typingState}</span> : null}
                  <span className={socketConnected ? 'text-emerald-600' : 'text-amber-600'}>
                    {socketConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>

              <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
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
                            className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                              isOut ? 'bg-green-100 text-gray-900' : 'bg-white border border-gray-200 text-gray-800'
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

              <div className="border-t border-gray-100 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    placeholder="Template ID"
                    className="h-9 text-sm"
                  />
                  <Button type="button" onClick={handleSendTemplate} disabled={!templateId || sending}>
                    Send Template
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="text-lg hover:bg-gray-100 rounded p-1"
                      onClick={() => setComposerText((prev) => `${prev}${emoji}`)}
                      aria-label={`Insert ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50">
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
                    placeholder="Type a message…"
                    className="flex-1 h-10 resize-none px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                  <Button
                    type="button"
                    onClick={handleSendText}
                    disabled={!composerText.trim() || sending}
                    className="gap-1"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Right panel */}
        <section className="bg-white border border-gray-200 rounded-xl flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-black text-gray-900">CRM Customer Panel</h2>
            <p className="text-[11px] text-gray-500">PestControl99 business context</p>
          </div>
          <div className="px-3 py-3 flex flex-wrap gap-2 border-b border-gray-100">
            <Button type="button" size="sm" className="gap-1" onClick={() => setBookingDrawerOpen(true)} disabled={!selectedConversation}>
              <Plus className="h-3.5 w-3.5" /> Create Booking
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setQuotationDrawerOpen(true)} disabled={!selectedConversation}>
              <FileText className="h-3.5 w-3.5" /> Create Quotation
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={handleCreateInvoice} disabled={!selectedConversation}>
              <Receipt className="h-3.5 w-3.5" /> Create Invoice
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setAssignModalOpen(true)} disabled={!selectedPrimaryBooking}>
              <UserCheck className="h-3.5 w-3.5" /> Assign Technician
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setHistoryDrawerOpen(true)} disabled={!customerPanel.client}>
              <ExternalLink className="h-3.5 w-3.5" /> Open Customer
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 text-sm">
            {rightPanelLoading ? (
              <div className="text-gray-500 flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading customer details...
              </div>
            ) : rightPanelError ? (
              <ErrorAlert title="Customer panel" message={rightPanelError} />
            ) : (
              <>
                <Field label="Customer Name" value={customerPanel.client?.full_name || selectedConversation?.customer_name || '--'} />
                <Field label="Phone Number" value={customerPanel.client?.mobile || selectedConversation?.phone || '--'} />
                <Field label="Address" value={customerPanel.client?.address || '--'} />
                <Field
                  label="Service Type"
                  value={customerPanel.history?.bookings?.[0]?.service_type || '--'}
                />
                <Field label="Lead Status" value={customerPanel.client ? 'Existing Customer' : 'Lead'} />
                <Field
                  label="Booking Status"
                  value={customerPanel.history?.upcoming?.[0]?.status || customerPanel.history?.bookings?.[0]?.status || '--'}
                />
                <Field label="Previous Bookings" value={String(customerPanel.history?.bookings?.length || 0)} />
                <Field
                  label="Upcoming Booking"
                  value={
                    customerPanel.history?.upcoming?.[0]
                      ? `${customerPanel.history.upcoming[0].service_type} (${dayjs(customerPanel.history.upcoming[0].schedule_datetime).format('DD MMM')})`
                      : '--'
                  }
                />
                <Field label="Pending Amount" value={`₹${customerPanel.pendingAmount.toFixed(2)}`} />
                <Field
                  label="AMC Status"
                  value={
                    customerPanel.history?.bookings?.some((b) => b.service_category === 'AMC')
                      ? 'AMC Customer'
                      : 'Not AMC'
                  }
                />
                <Field label="Notes" value={customerPanel.client?.notes || '--'} />
              </>
            )}
          </div>
        </section>
      </div>

      <Drawer isOpen={bookingDrawerOpen} onClose={() => setBookingDrawerOpen(false)} title="Create Booking" width="w-full md:w-[560px]">
        <div className="p-4 space-y-3">
          <FormErrorBanner message={bookingSubmitError} />
          <Input label="Customer Name" value={bookingForm.client_name} onChange={(e) => setBookingForm((p) => ({ ...p, client_name: e.target.value }))} />
          <Input label="Phone Number" value={bookingForm.client_mobile} onChange={(e) => setBookingForm((p) => ({ ...p, client_mobile: e.target.value }))} />
          <Input label="Address" value={bookingForm.client_address} onChange={(e) => setBookingForm((p) => ({ ...p, client_address: e.target.value }))} />
          <Input label="City" value={bookingForm.client_city} onChange={(e) => setBookingForm((p) => ({ ...p, client_city: e.target.value }))} />
          <Input label="Service Type" value={bookingForm.service_type} onChange={(e) => setBookingForm((p) => ({ ...p, service_type: e.target.value }))} />
          <Input label="Schedule Date" type="date" value={bookingForm.schedule_date} onChange={(e) => setBookingForm((p) => ({ ...p, schedule_date: e.target.value }))} />
          <textarea
            value={bookingForm.notes}
            onChange={(e) => setBookingForm((p) => ({ ...p, notes: e.target.value }))}
            className="w-full min-h-[90px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Notes"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setBookingDrawerOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleCreateBooking} disabled={bookingSubmitting} className="gap-2">
              {bookingSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Booking
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer isOpen={quotationDrawerOpen} onClose={() => setQuotationDrawerOpen(false)} title="Create Quotation" width="w-full md:w-[560px]">
        <div className="p-4 space-y-3">
          <FormErrorBanner message={quotationSubmitError} />
          <Input label="Customer Name" value={quotationForm.customer_name} onChange={(e) => setQuotationForm((p) => ({ ...p, customer_name: e.target.value }))} />
          <Input label="Phone Number" value={quotationForm.mobile} onChange={(e) => setQuotationForm((p) => ({ ...p, mobile: e.target.value }))} />
          <Input label="Address" value={quotationForm.address} onChange={(e) => setQuotationForm((p) => ({ ...p, address: e.target.value }))} />
          <Input label="City" value={quotationForm.city} onChange={(e) => setQuotationForm((p) => ({ ...p, city: e.target.value }))} />
          <Input label="State" value={quotationForm.state} onChange={(e) => setQuotationForm((p) => ({ ...p, state: e.target.value }))} />
          <Input label="Service Name" value={quotationForm.service_name} onChange={(e) => setQuotationForm((p) => ({ ...p, service_name: e.target.value }))} />
          <Input label="Amount (INR)" value={quotationForm.amount} onChange={(e) => setQuotationForm((p) => ({ ...p, amount: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setQuotationDrawerOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleCreateQuotation} disabled={quotationSubmitting} className="gap-2">
              {quotationSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Quotation
            </Button>
          </div>
        </div>
      </Drawer>

      <AssignTechnicianModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSuccess={() => {
          notify.success('Technician assigned.');
          if (selectedConversationId) loadCustomerPanel(selectedConversation!);
        }}
        jobCard={selectedPrimaryBooking}
      />

      <Drawer isOpen={historyDrawerOpen} onClose={() => setHistoryDrawerOpen(false)} title="Customer History" width="w-full md:w-[680px]">
        <div className="p-4 space-y-3">
          {!customerPanel.history ? (
            <p className="text-sm text-gray-500">No customer history found.</p>
          ) : (
            <>
              <h3 className="text-sm font-black text-gray-800">Previous Bookings</h3>
              <div className="space-y-2">
                {customerPanel.history.bookings.slice(0, 10).map((booking) => (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-2 text-xs">
                    <p className="font-bold">{booking.code} · {booking.service_type}</p>
                    <p className="text-gray-500">
                      {dayjs(booking.schedule_datetime).format('DD MMM YYYY')} · {booking.status}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Drawer>
    </div>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="grid grid-cols-[118px_1fr] gap-2">
    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
    <span className="text-sm text-gray-800 break-words">{value || '--'}</span>
  </div>
);

export default WhatsAppInbox;

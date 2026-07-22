import React, { useEffect, useState } from 'react';
import { IdCard, Loader2, Send } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import {
  ECARD_TEMPLATE,
  isValidWhatsAppPhone,
  normalizeWhatsAppPhone,
} from '../../config/whatsappEcard';
import {
  isWhatsAppApiKeyConfigured,
  whatsAppApiKeySetupMessage,
  whatsappInboxApi,
} from '../../services/whatsappInboxApi';
import { getErrorMessage } from '../../utils/errors';
import { notify } from '../../utils/notify';

export type SendECardTarget = {
  name?: string;
  mobile?: string;
} | null;

type SendECardModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Prefill from inquiry row; user can still edit the number. */
  initial?: SendECardTarget;
};

export default function SendECardModal({ open, onOpenChange, initial }: SendECardModalProps) {
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSending(false);
    setPhone(initial?.mobile ? normalizeWhatsAppPhone(initial.mobile) : '');
  }, [open, initial?.mobile]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isWhatsAppApiKeyConfigured()) {
      setError(whatsAppApiKeySetupMessage());
      return;
    }

    const normalized = normalizeWhatsAppPhone(phone);
    if (!isValidWhatsAppPhone(normalized)) {
      setError('Enter a valid mobile number (10 digits, or with 91 country code).');
      return;
    }

    setSending(true);
    try {
      await whatsappInboxApi.sendTemplateByPhone({
        phone: normalized,
        template_name: ECARD_TEMPLATE.name,
        language: ECARD_TEMPLATE.language,
        body_params: [],
      });
      notify.success(
        `E-Card WhatsApp template sent to +${normalized}${initial?.name ? ` (${initial.name})` : ''}.`,
      );
      onOpenChange(false);
    } catch (err) {
      const message = getErrorMessage(err) || 'Failed to send WhatsApp template.';
      setError(message);
      notify.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Send E-Card"
      description={ECARD_TEMPLATE.description}
      size="sm"
    >
      <form onSubmit={handleSend} className="space-y-4">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2.5 text-xs text-emerald-900">
          <p className="font-semibold flex items-center gap-1.5">
            <IdCard className="h-3.5 w-3.5" />
            Template: {ECARD_TEMPLATE.name}
          </p>
          <p className="mt-1 text-emerald-800/80">
            Language {ECARD_TEMPLATE.language} · Meta ID {ECARD_TEMPLATE.metaId}
          </p>
          {initial?.name ? (
            <p className="mt-1.5 text-emerald-800">
              Customer: <span className="font-semibold">{initial.name}</span>
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ecard-phone">WhatsApp mobile number</Label>
          <Input
            id="ecard-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="9876543210 or 919876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={sending}
            className="font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Enter 10-digit Indian mobile (91 is added automatically) or full number with country code.
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button type="submit" disabled={sending || !phone.trim()} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

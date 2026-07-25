import React, { useEffect, useState } from 'react';
import { Link2, Loader2, Send } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import {
  TRACKED_ECARD_TEMPLATE,
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

export type TrackedECardTarget = {
  name?: string;
  mobile?: string;
  inquiryId?: number;
} | null;

type SendTrackedECardModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: TrackedECardTarget;
};

export default function SendTrackedECardModal({
  open,
  onOpenChange,
  initial,
}: SendTrackedECardModalProps) {
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
        template_name: TRACKED_ECARD_TEMPLATE.name,
        language: TRACKED_ECARD_TEMPLATE.language,
        body_params: [],
        track_ecard: true,
        customer_name: initial?.name || undefined,
        external_id: initial?.inquiryId,
        ecard_destination_url: TRACKED_ECARD_TEMPLATE.destinationUrl,
      });
      notify.success(
        `Tracked Pest-Card sent to +${normalized}${initial?.name ? ` (${initial.name})` : ''}. Clicks will show on E-Card WhatsApp Tracking.`,
      );
      onOpenChange(false);
    } catch (err) {
      const message = getErrorMessage(err) || 'Failed to send tracked WhatsApp template.';
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
      title="Pest-Card WhatsApp Track"
      description={TRACKED_ECARD_TEMPLATE.description}
      size="sm"
    >
      <form onSubmit={handleSend} className="space-y-4">
        <div className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2.5 text-xs text-sky-900">
          <p className="font-semibold flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            Template: {TRACKED_ECARD_TEMPLATE.name}
          </p>
          <p className="mt-1 text-sky-800/80">
            Language {TRACKED_ECARD_TEMPLATE.language} · track_ecard enabled
          </p>
          {initial?.inquiryId ? (
            <p className="mt-1.5 text-sky-800">
              Inquiry ID: <span className="font-semibold">{initial.inquiryId}</span>
            </p>
          ) : null}
          {initial?.name ? (
            <p className="mt-1 text-sky-800">
              Customer: <span className="font-semibold">{initial.name}</span>
            </p>
          ) : null}
          <p className="mt-1.5 text-[11px] text-sky-700/90">
            Does not change the green E-Card button — this uses the tracked brochure template only.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tracked-ecard-phone">WhatsApp mobile number</Label>
          <Input
            id="tracked-ecard-phone"
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
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" disabled={sending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={sending} className="bg-sky-700 hover:bg-sky-800">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1.5" />
                Send tracked template
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

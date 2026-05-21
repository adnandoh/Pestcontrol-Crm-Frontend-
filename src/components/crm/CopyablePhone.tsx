import React, { useCallback, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { copyToClipboard, phoneDigitsForCopy } from '../../utils/copyToClipboard';

export interface CopyablePhoneProps {
  phone: string | null | undefined;
  className?: string;
  emptyLabel?: string;
  /** Copy digits only (default true). Set false to copy displayed string. */
  digitsOnly?: boolean;
  onWhatsApp?: () => void;
  whatsAppTitle?: string;
}

const CopyablePhone: React.FC<CopyablePhoneProps> = ({
  phone,
  className,
  emptyLabel = '---',
  digitsOnly = true,
  onWhatsApp,
  whatsAppTitle = 'WhatsApp',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const raw = phone?.trim();
      if (!raw) return;
      const toCopy = digitsOnly ? phoneDigitsForCopy(raw) || raw : raw;
      const ok = await copyToClipboard(toCopy);
      if (ok) {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    },
    [phone, digitsOnly],
  );

  if (!phone?.trim()) {
    return <span className={cn('text-gray-400', className)}>{emptyLabel}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Click to copy number'}
        className={cn(
          'tabular-nums cursor-pointer transition-colors text-left',
          copied
            ? 'text-emerald-600 font-semibold'
            : 'text-blue-600 hover:underline font-medium',
          className,
        )}
      >
        {copied ? 'Copied!' : phone}
      </button>
      {onWhatsApp && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onWhatsApp();
          }}
          className="shrink-0 rounded-full p-0.5 hover:bg-green-50"
          title={whatsAppTitle}
        >
          <MessageCircle className="h-3.5 w-3.5 text-green-600" />
        </button>
      )}
    </span>
  );
};

export default CopyablePhone;

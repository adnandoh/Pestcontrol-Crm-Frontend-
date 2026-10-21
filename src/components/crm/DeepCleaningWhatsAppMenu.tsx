import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { openWhatsApp } from '../../utils/whatsapp';
import type { DeepCleaningWhatsAppItem } from '../../utils/deepCleaningWhatsApp';

/** Opens WhatsApp with the message filled in. Staff send it themselves. */
export default function DeepCleaningWhatsAppMenu({
  items,
}: {
  items: DeepCleaningWhatsAppItem[];
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return undefined;
    function close(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    function dismiss() {
      setOpen(false);
    }
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [open]);

  if (!items.length) return null;

  function toggle() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 220;
      setPosition({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      });
    }
    setOpen((current) => !current);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-[11px] font-bold text-green-700 hover:bg-green-100"
        title="Open WhatsApp. You send the message yourself."
      >
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp
      </button>
      {open ? (
        <div
          ref={menuRef}
          className="fixed z-50 w-[220px] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          style={{ top: position.top, left: position.left }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-green-50"
              onClick={() => {
                openWhatsApp(item.mobile, item.message);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../../utils/cn';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  title?: string;
  description: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastData[];
  show: (toast: Omit<ToastData, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

const VARIANT_ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />,
  error: <AlertCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden />,
  warning: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />,
  info: <Info className="h-5 w-5 shrink-0 text-blue-600" aria-hidden />,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = React.useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const value = React.useMemo(() => ({ toasts, show, dismiss }), [toasts, show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]">
          {toasts.map((toast) => (
            <ToastPrimitive.Root
              key={toast.id}
              open
              duration={toast.duration ?? (toast.variant === 'error' ? 7000 : 4500)}
              onOpenChange={(open) => {
                if (!open) dismiss(toast.id);
              }}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg',
                VARIANT_STYLES[toast.variant],
              )}
            >
              {VARIANT_ICONS[toast.variant]}
              <div className="flex-1 min-w-0">
                {toast.title ? (
                  <ToastPrimitive.Title className="text-sm font-bold mb-0.5">
                    {toast.title}
                  </ToastPrimitive.Title>
                ) : null}
                <ToastPrimitive.Description className="text-sm whitespace-pre-line leading-snug">
                  {toast.description}
                </ToastPrimitive.Description>
              </div>
              <ToastPrimitive.Close
                className="rounded-md p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          ))}
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};

export function useToastContext(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return ctx;
}

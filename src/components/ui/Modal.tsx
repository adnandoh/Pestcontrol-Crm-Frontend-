import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Solid dark scrim — not bg-background/80 (undefined / washed-out white) */}
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-900/55 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-[100] flex w-[calc(100%-1.5rem)] max-h-[min(90vh,880px)] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl outline-none duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            sizeClasses[size],
            className,
          )}
        >
          {(title || description) && (
            <div className="shrink-0 border-b border-slate-100 bg-white px-5 py-4 pr-12 sm:px-6">
              {title && (
                <Dialog.Title className="text-lg font-semibold leading-tight tracking-tight text-slate-900">
                  {title}
                </Dialog.Title>
              )}
              {description && (
                <Dialog.Description className="mt-1 text-sm leading-relaxed text-slate-500">
                  {description}
                </Dialog.Description>
              )}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 sm:px-6">
            {children}
          </div>
          <Dialog.Close className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export { Modal };

import React from 'react';
import { cn } from '../../utils/cn';

/** Shared table shell for CRM list pages — horizontal scroll + sticky header */
export const CrmTableShell: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div
    className={cn(
      'rounded-xl border border-crm-border bg-crm-surface shadow-sm overflow-hidden',
      className,
    )}
  >
    <div className="overflow-x-auto">
      <div className="min-w-[1024px]">{children}</div>
    </div>
  </div>
);

export const crmThClass =
  'px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-crm-muted bg-crm-surface-2 whitespace-nowrap';

export const crmTdClass = 'px-3 py-3 align-middle text-sm text-crm-text';

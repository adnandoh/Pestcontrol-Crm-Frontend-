import React from 'react';
import { cn } from '../../utils/cn';

export interface NotBookedBadgeProps {
  /** Show only when the inquiry mobile has no JobCard booking. */
  show?: boolean | null;
  className?: string;
}

/**
 * Compact “Not Booked” chip next to inquiry mobiles.
 * Does not intercept phone click / copy / call behaviour.
 */
const NotBookedBadge: React.FC<NotBookedBadgeProps> = ({ show, className }) => {
  if (!show) return null;

  return (
    <button
      type="button"
      tabIndex={-1}
      title="This mobile has an inquiry but no booking yet"
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border border-amber-200 bg-amber-50',
        'px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-800',
        'cursor-default select-none',
        className,
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      Not Booked
    </button>
  );
};

export default NotBookedBadge;

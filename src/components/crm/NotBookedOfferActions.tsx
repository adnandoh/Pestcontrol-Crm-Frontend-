import React from 'react';
import { MessageCircle, Phone, Globe } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  openNotBookedOfferCall,
  openNotBookedOfferWebsite,
  openNotBookedOfferWhatsApp,
  NOT_BOOKED_OFFER_CALL_DISPLAY,
  NOT_BOOKED_OFFER_WEBSITE,
} from '../../utils/notBookedOfferWhatsApp';

export interface NotBookedOfferActionsProps {
  /** Customer mobile — WhatsApp opens chat to this number. */
  mobile: string;
  /** Only render for leads without a JobCard booking. */
  show?: boolean | null;
  className?: string;
}

/**
 * WhatsApp offer + Call + Website actions for Not Booked leads.
 * WhatsApp prefills the promo template; Call / Website open business CTAs.
 */
const NotBookedOfferActions: React.FC<NotBookedOfferActionsProps> = ({
  mobile,
  show,
  className,
}) => {
  if (!show || !mobile?.trim()) return null;

  return (
    <div
      className={cn('inline-flex flex-wrap items-center gap-1', className)}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => openNotBookedOfferWhatsApp(mobile)}
        title="Share Not Booked WhatsApp offer"
        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white hover:bg-emerald-700"
      >
        <MessageCircle className="h-3 w-3" />
        Offer
      </button>
      <button
        type="button"
        onClick={openNotBookedOfferCall}
        title={`Call ${NOT_BOOKED_OFFER_CALL_DISPLAY}`}
        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white hover:bg-blue-700"
      >
        <Phone className="h-3 w-3" />
        Call
      </button>
      <button
        type="button"
        onClick={openNotBookedOfferWebsite}
        title={`Open ${NOT_BOOKED_OFFER_WEBSITE}`}
        className="inline-flex items-center gap-1 rounded-md bg-slate-700 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white hover:bg-slate-800"
      >
        <Globe className="h-3 w-3" />
        Website
      </button>
    </div>
  );
};

export default NotBookedOfferActions;

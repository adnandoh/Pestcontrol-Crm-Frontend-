import React from 'react';
import { cn } from '../../utils/cn';
import type { ServiceRateInfo } from '../../types';
import { formatCustomerPricePlusGst } from '../../utils/customerPrice';

interface ServiceRateDisplayProps {
  info?: ServiceRateInfo | null;
  fallbackPrice?: number | string | null;
  fallbackFrequency?: string | null;
  compact?: boolean;
}

const ServiceRateDisplay: React.FC<ServiceRateDisplayProps> = ({
  info,
  fallbackPrice,
  fallbackFrequency,
  compact = false,
}) => {
  const planLabel =
    info?.plan ||
    (fallbackFrequency?.toLowerCase() === 'amc' ? 'AMC' : 'One-time');

  const isAmc = planLabel.toUpperCase() === 'AMC';
  const wrapClass = cn('flex flex-col gap-1 min-w-0', !compact && 'min-w-[88px]');

  if (info?.items?.length) {
    const total = info.display_total ?? info.total;
    return (
      <div className={wrapClass}>
        <span
          className={cn(
            'inline-flex w-fit rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            isAmc ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-600',
          )}
        >
          {planLabel}
        </span>
        {info.area_label && (
          <span className="text-[10px] font-medium text-slate-500">{info.area_label}</span>
        )}
        {info.items.length === 1 ? (
          <span className="text-sm font-bold text-emerald-700 tabular-nums">
            {formatCustomerPricePlusGst(info.items[0].rate)}
          </span>
        ) : (
          <div className="space-y-0.5">
            {info.items.map((item) => (
              <div key={item.pest} className="text-[10px] text-slate-600 leading-tight">
                <span className="font-medium">{item.pest}</span>{' '}
                <span className="text-emerald-700 font-semibold tabular-nums">
                  {formatCustomerPricePlusGst(item.rate)}
                </span>
              </div>
            ))}
            {total != null && (
              <div className="text-xs font-bold text-emerald-800 border-t border-slate-100 pt-0.5 mt-0.5 tabular-nums">
                {formatCustomerPricePlusGst(total)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const amount =
    info?.display_total ??
    (fallbackPrice != null && fallbackPrice !== '' ? Number(fallbackPrice) : null);

  return (
    <div className={wrapClass}>
      <span
        className={cn(
          'inline-flex w-fit rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
          isAmc ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-600',
        )}
      >
        {planLabel}
      </span>
      {amount != null && !Number.isNaN(amount) ? (
        <span className="text-sm font-bold text-emerald-700 tabular-nums">
          {formatCustomerPricePlusGst(amount)}
        </span>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      )}
    </div>
  );
};

export default ServiceRateDisplay;

import React from 'react';
import { cn } from '../../utils/cn';
import type { ServiceRateInfo } from '../../types';

interface ServiceRateDisplayProps {
  info?: ServiceRateInfo | null;
  fallbackPrice?: number | string | null;
  fallbackFrequency?: string | null;
}

const ServiceRateDisplay: React.FC<ServiceRateDisplayProps> = ({
  info,
  fallbackPrice,
  fallbackFrequency,
}) => {
  const planLabel =
    info?.plan ||
    (fallbackFrequency?.toLowerCase() === 'amc' ? 'AMC' : 'One-time');

  const isAmc = planLabel.toUpperCase() === 'AMC';

  if (info?.items?.length) {
    const total = info.display_total ?? info.total;
    return (
      <div className="flex flex-col gap-1 min-w-[88px]">
        <span
          className={cn(
            'inline-flex w-fit rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            isAmc ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-600',
          )}
        >
          {planLabel}
        </span>
        {info.items.length === 1 ? (
          <span className="text-sm font-bold text-emerald-700 tabular-nums">
            ₹{info.items[0].rate.toLocaleString('en-IN')}
          </span>
        ) : (
          <div className="space-y-0.5">
            {info.items.map((item) => (
              <div key={item.pest} className="text-[10px] text-slate-600 leading-tight">
                <span className="font-medium">{item.pest}</span>{' '}
                <span className="text-emerald-700 font-semibold tabular-nums">
                  ₹{item.rate.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
            {total != null && (
              <div className="text-xs font-bold text-emerald-800 border-t border-slate-100 pt-0.5 mt-0.5 tabular-nums">
                ₹{total.toLocaleString('en-IN')}
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
    <div className="flex flex-col gap-1 min-w-[88px]">
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
          ₹{amount.toLocaleString('en-IN')}
        </span>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      )}
    </div>
  );
};

export default ServiceRateDisplay;

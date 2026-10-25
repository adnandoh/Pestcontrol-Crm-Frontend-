import React from 'react';
import { formatDeepCleaningMoney } from '../../constants/deepCleaning';
import type { DeepCleaningRate } from '../../types';
import {
  bestDeepCleaningRate,
  deepCleaningRateAmount,
  ratesForBooking,
  type DeepCleaningRateChoice,
} from '../../utils/deepCleaningRates';

interface Props extends DeepCleaningRateChoice {
  rates: DeepCleaningRate[];
  selectedCode?: string;
  disabled?: boolean;
  onSelect: (rate: DeepCleaningRate) => void;
}

const DeepCleaningRateChoices: React.FC<Props> = ({
  rates,
  segment,
  service,
  propertySize,
  propertyType,
  selectedCode,
  disabled,
  onSelect,
}) => {
  const choice = { segment, service, propertySize, propertyType };
  const matches = ratesForBooking(rates, choice);
  const suggested = bestDeepCleaningRate(rates, choice);

  if (!rates.length) {
    return <p className="text-sm text-slate-500">Rates are still loading.</p>;
  }
  if (!matches.length) {
    return (
      <p className="text-sm text-slate-600">
        No active rate for {service}. Add one under Deep Cleaning rates, or type the amount.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {suggested
          ? `${propertySize} · ${service}`
          : `${service} rates`}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {matches.map((rate) => {
          const selected = selectedCode ? selectedCode === rate.code : suggested?.id === rate.id;
          return (
            <button
              key={rate.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(rate)}
              className={`rounded-lg border px-3 py-2 text-left ${
                selected ? 'border-teal-600 bg-teal-50' : 'border-slate-200 bg-white'
              }`}
            >
              <span className="block text-sm font-semibold text-slate-900">{rate.package_name}</span>
              <span className="block text-sm text-teal-800">
                {formatDeepCleaningMoney(deepCleaningRateAmount(rate))} excl. GST
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">GST is extra and is confirmed before the visit.</p>
    </div>
  );
};

export default DeepCleaningRateChoices;

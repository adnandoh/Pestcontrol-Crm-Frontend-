import React from 'react';
import {
  getAreaOptionsForService,
  getPricingTypesForService,
  supportsAutoPricing,
  type PricingConfig,
  type ServiceConfigMap,
  type ServicePriceLine,
} from '../../utils/jobCardPricing';

interface PerServicePricingSectionProps {
  selectedPackages: string[];
  serviceConfigs: ServiceConfigMap;
  pricingConfig: PricingConfig;
  commercialType: string;
  priceBreakdown: ServicePriceLine[];
  totalPrice: string;
  onPlanChange: (service: string, plan: string) => void;
  onAreaChange: (service: string, area: string) => void;
  validationErrors?: string[];
}

const PerServicePricingSection: React.FC<PerServicePricingSectionProps> = ({
  selectedPackages,
  serviceConfigs,
  pricingConfig,
  commercialType,
  priceBreakdown,
  totalPrice,
  onPlanChange,
  onAreaChange,
  validationErrors = [],
}) => {
  const autoPricing = supportsAutoPricing(commercialType, pricingConfig);

  if (selectedPackages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[13px] font-bold text-gray-800 mb-2">
          Selected Services Configuration
        </h4>
        <div className="space-y-3">
          {selectedPackages.map((service) => {
            const cfg = serviceConfigs[service] || { plan: '', area: '' };
            const planOptions = getPricingTypesForService(service, pricingConfig);
            const areaOptions = getAreaOptionsForService(service, pricingConfig, commercialType);
            const line = priceBreakdown.find((l) => l.service === service);

            return (
              <div
                key={service}
                className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3"
              >
                <p className="text-sm font-black text-gray-900">{service}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1 block">
                      Service Type *
                    </label>
                    <select
                      value={cfg.plan}
                      onChange={(e) => onPlanChange(service, e.target.value)}
                      className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="">Select Type</option>
                      {planOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1 block">
                      Area *
                    </label>
                    <select
                      value={cfg.area}
                      onChange={(e) => onAreaChange(service, e.target.value)}
                      className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg bg-white"
                      disabled={!cfg.plan}
                    >
                      <option value="">Select Area</option>
                      {areaOptions.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {autoPricing && line && (
                  <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-2">
                    <span className="text-gray-600 font-semibold">
                      {cfg.plan || '—'} · {cfg.area || '—'}
                    </span>
                    <span className="font-black text-gray-900 tabular-nums">
                      {line.price > 0 ? `₹${line.price.toLocaleString('en-IN')}` : (line.note || '—')}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          {validationErrors.map((msg) => (
            <p key={msg} className="text-xs font-bold text-red-700">{msg}</p>
          ))}
        </div>
      )}

      {autoPricing && priceBreakdown.length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-white p-4">
          <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider mb-3">
            Live Pricing Summary
          </p>
          <ul className="space-y-3">
            {priceBreakdown.map((line) => (
              <li key={line.service} className="text-xs border-b border-gray-100 pb-2 last:border-0">
                <p className="font-black text-gray-800">{line.service}</p>
                <p className="text-gray-600 font-semibold">{line.plan || '—'}</p>
                <p className="text-gray-500">{line.area || '—'}</p>
                <p className="font-black text-gray-900 mt-1 tabular-nums">
                  {line.price > 0 ? `₹${line.price.toLocaleString('en-IN')}` : (line.note || '—')}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-blue-100 flex justify-between text-sm font-black text-blue-900">
            <span>Total</span>
            <span className="tabular-nums">₹{Number.parseFloat(totalPrice || '0').toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerServicePricingSection;

import React from 'react';
import { PROPERTY_LOCATIONS } from '../../constants/pricing';
import {
  formatPlanLabel,
  isAmcPlan,
  isBedBugService,
  isTermiteService,
} from '../../constants/bookingPropertyTypes';
import {
  amcPlanOptionsForService,
  finalizeServiceLinePricing,
  getAreaOptionsForService,
  oneTimePlanForService,
  roundMoney,
  summarizeServicePricing,
  type PricingConfig,
  type ServiceConfigMap,
  type ServiceItemConfig,
} from '../../utils/jobCardPricing';
import { previewServiceSchedule } from '../../utils/bookingSchedule';

interface PerServicePricingSectionProps {
  selectedPackages: string[];
  serviceConfigs: ServiceConfigMap;
  serviceItems: ServiceItemConfig[];
  pricingConfig: PricingConfig;
  commercialType: string;
  technicianSharePercent?: number;
  onPlanChange: (service: string, plan: string) => void;
  onAreaChange: (service: string, area: string) => void;
  onBaseAmountChange: (service: string, baseAmount: number) => void;
  onDiscountChange: (service: string, discount: number) => void;
  validationErrors?: string[];
  scheduleDate?: string;
  showPricingFields?: boolean;
}

function areaOptionsForService(
  service: string,
  pricingConfig: PricingConfig,
  commercialType: string,
): string[] {
  const fromPricing = getAreaOptionsForService(service, pricingConfig, commercialType);
  if (fromPricing.length > 0) return fromPricing;
  // Commercial must not fall back to residential BHK sizes — only chart areas.
  if (commercialType !== 'home' && commercialType !== 'villa') {
    return [];
  }
  if (service === 'Rodent' || /rodent/i.test(service)) {
    return ['Windows', 'Society Area', 'Commercial'];
  }
  if (service === 'Hotel / Commercial') return ['Commercial Space'];
  return [...PROPERTY_LOCATIONS];
}

function inr(n: number): string {
  return `₹${roundMoney(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const PerServicePricingSection: React.FC<PerServicePricingSectionProps> = ({
  selectedPackages,
  serviceConfigs,
  serviceItems,
  pricingConfig,
  commercialType,
  technicianSharePercent = 40,
  onPlanChange,
  onAreaChange,
  onBaseAmountChange,
  onDiscountChange,
  validationErrors = [],
  scheduleDate = '',
  showPricingFields = true,
}) => {
  if (selectedPackages.length === 0) {
    return null;
  }

  const totals = summarizeServicePricing(serviceItems);
  const techPct = Number(technicianSharePercent) || 40;
  const companyPct = Math.max(0, roundMoney(100 - techPct));

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[13px] font-bold text-gray-800 mb-1">
          Service Pricing
        </h4>
        <p className="text-[11px] text-gray-500 mb-3">
          Each selected service has its own base price and discount. Technician/company shares are calculated from that service&apos;s final price — never by splitting the combined booking total.
        </p>
        <div className="space-y-4">
          {selectedPackages.map((service) => {
            const cfg = serviceConfigs[service] || { plan: '', area: '' };
            const item = serviceItems.find((row) => row.service === service);
            const areaOptions = areaOptionsForService(service, pricingConfig, commercialType);
            // Driven by the rate card, not a hardcoded service-name list, so a
            // service offers AMC exactly when it has AMC rates.
            const amcOptions = amcPlanOptionsForService(service, pricingConfig);
            const canAmc = amcOptions.length > 0;
            const mode: 'one_time' | 'amc' = isAmcPlan(cfg.plan) ? 'amc' : 'one_time';
            const preview = cfg.plan
              ? previewServiceSchedule(service, cfg.plan, scheduleDate)
              : null;

            const base = item?.baseAmount ?? item?.amount ?? 0;
            const discount = item?.discount ?? 0;
            const finalPrice = item?.amount ?? 0;
            const discountTooHigh = discount > base + 0.001;
            const techShare = roundMoney((finalPrice * techPct) / 100);
            const companyShare = roundMoney(finalPrice - techShare);

            return (
              <div
                key={service}
                className="rounded-xl border-2 border-gray-200 bg-white p-4 space-y-3 shadow-sm"
              >
                <p className="text-sm font-black text-gray-900 border-b border-gray-100 pb-2">
                  {service}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1 block">
                      Service Mode *
                    </label>
                    {isTermiteService(service) ? (
                      <div className="h-10 flex items-center px-3 text-sm font-semibold text-gray-800 bg-amber-50 border border-amber-200 rounded-lg">
                        One Time Treatment
                      </div>
                    ) : isBedBugService(service) ? (
                      <div className="h-10 flex items-center px-3 text-sm font-semibold text-gray-800 bg-violet-50 border border-violet-200 rounded-lg">
                        2-Service Package
                      </div>
                    ) : (
                      <select
                        value={mode}
                        onChange={(e) => {
                          const nextMode = e.target.value as 'one_time' | 'amc';
                          if (nextMode === 'amc' && amcOptions[0]) {
                            onPlanChange(service, amcOptions[0].value);
                          } else {
                            onPlanChange(service, oneTimePlanForService(service, pricingConfig));
                          }
                        }}
                        className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg bg-white"
                      >
                        <option value="one_time">One Time Service</option>
                        {canAmc && <option value="amc">AMC Service</option>}
                      </select>
                    )}
                  </div>

                  <div>
                    {mode === 'amc' && canAmc ? (
                      <>
                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1 block">
                          AMC Package *
                        </label>
                        <select
                          value={cfg.plan}
                          onChange={(e) => onPlanChange(service, e.target.value)}
                          className="w-full h-10 px-3 text-sm font-medium border border-violet-300 rounded-lg bg-violet-50/40"
                        >
                          {amcOptions.map((opt: { value: string; label: string }) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : isTermiteService(service) ? (
                      <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2.5 leading-snug">
                        Includes <strong>4 free check-up visits</strong> over 2 years (auto-scheduled).
                      </div>
                    ) : isBedBugService(service) ? (
                      <div className="text-[11px] text-violet-800 bg-violet-50 border border-violet-100 rounded-lg p-2.5 leading-snug">
                        Includes <strong>2 services</strong> — 2nd visit auto-scheduled after 15 days.
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-500 pt-6">
                        {cfg.plan ? formatPlanLabel(service, cfg.plan) : '—'}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1 block">
                      Area / Property Size *
                    </label>
                    <select
                      value={cfg.area}
                      onChange={(e) => onAreaChange(service, e.target.value)}
                      className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="">Select area</option>
                      {cfg.area && !areaOptions.includes(cfg.area) && (
                        <option value={cfg.area}>{cfg.area}</option>
                      )}
                      {areaOptions.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                    {areaOptions.length === 0 && (
                      <p className="text-[10px] font-semibold text-amber-700 mt-1">
                        No Pricing Master areas for this service under the selected property type.
                        Pick a chart service that matches (e.g. hotel cockroach tiers, or Integrated IPM for offices).
                      </p>
                    )}
                  </div>
                </div>

                {/* Plan is enough to enter price — commercial Done bookings often
                    still need manual Base/Discount before a chart area is picked. */}
                {showPricingFields && cfg.plan && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1 block">
                          Base Price ₹
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={base}
                          onChange={(e) => onBaseAmountChange(service, Number(e.target.value) || 0)}
                          className="w-full h-10 px-3 text-sm font-semibold border border-gray-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1 block">
                          Discount ₹
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          max={base}
                          value={discount}
                          onChange={(e) => onDiscountChange(service, Number(e.target.value) || 0)}
                          className={`w-full h-10 px-3 text-sm font-semibold border rounded-lg bg-white ${
                            discountTooHigh ? 'border-red-400' : 'border-gray-300'
                          }`}
                        />
                        {discountTooHigh && (
                          <p className="text-[10px] font-bold text-red-600 mt-1">
                            Discount cannot be greater than the service price.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-100">
                      <span className="text-[11px] font-bold text-gray-600 uppercase">Final Price</span>
                      <span className="text-lg font-black text-emerald-900">{inr(finalPrice)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded bg-white border border-emerald-100 px-2 py-1.5">
                        <div className="text-[9px] font-bold text-gray-500 uppercase">
                          Technician Share ({techPct}%)
                        </div>
                        <div className="font-extrabold text-emerald-900">{inr(techShare)}</div>
                      </div>
                      <div className="rounded bg-white border border-emerald-100 px-2 py-1.5">
                        <div className="text-[9px] font-bold text-gray-500 uppercase">
                          Company Share ({companyPct}%)
                        </div>
                        <div className="font-extrabold text-emerald-900">{inr(companyShare)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {cfg.plan && cfg.area && preview && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-block text-[9px] font-black uppercase tracking-wider bg-violet-600 text-white px-2 py-0.5 rounded">
                        {preview.visitType}
                      </span>
                      <span className="text-[11px] font-bold text-gray-700">
                        {preview.totalVisits} visit{preview.totalVisits > 1 ? 's' : ''} total
                      </span>
                      {preview.intervalHint && (
                        <span className="text-[10px] font-semibold text-violet-700">
                          ({preview.intervalHint})
                        </span>
                      )}
                    </div>

                    {!scheduleDate ? (
                      <p className="text-[11px] text-amber-700 font-semibold">
                        ↑ Set <strong>Booking Date</strong> in Assignment & Payment above to see upcoming visit dates.
                      </p>
                    ) : preview.upcomingVisits.length > 1 ? (
                      <div>
                        <p className="text-[10px] font-black text-violet-800 uppercase mb-1.5">
                          Auto-generated upcoming visits
                        </p>
                        <ul className="space-y-1 max-h-32 overflow-y-auto">
                          {preview.upcomingVisits.slice(1).map((v: { visitNumber: number; date: string; label: string }) => (
                            <li key={v.visitNumber} className="text-[11px] text-gray-700 flex justify-between gap-2">
                              <span>
                                Visit {v.visitNumber} · <span className="font-semibold">{v.label}</span>
                              </span>
                              <span className="font-bold text-violet-800 shrink-0">{v.date}</span>
                            </li>
                          ))}
                        </ul>
                        {preview.nextScheduledVisit && (
                          <p className="text-[11px] font-bold text-violet-900 mt-2 pt-2 border-t border-violet-200">
                            Next scheduled visit: {preview.nextScheduledVisit}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-600">Single visit — no follow-ups scheduled.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showPricingFields && serviceItems.length > 0 && (
        <div className="rounded-xl border-2 border-gray-800 bg-gray-900 text-white p-4 space-y-2">
          <h5 className="text-[11px] font-black uppercase tracking-widest text-gray-300">Booking Total</h5>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Subtotal</span>
            <span className="font-bold">{inr(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Total Discount</span>
            <span className="font-bold text-amber-300">− {inr(totals.totalDiscount)}</span>
          </div>
          <div className="flex justify-between text-base pt-2 border-t border-gray-700">
            <span className="font-black">Final Amount</span>
            <span className="font-black text-emerald-300">{inr(totals.finalAmount)}</span>
          </div>
          {selectedPackages.length > 1 && (
            <p className="text-[10px] text-gray-400 pt-1">
              Shares above are per service on that service&apos;s final price (not {inr(totals.finalAmount)} ÷ {selectedPackages.length}).
            </p>
          )}
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          {validationErrors.map((msg) => (
            <p key={msg} className="text-xs font-bold text-red-700">{msg}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default PerServicePricingSection;

// Re-export helper for callers that need clamp without importing utils twice
export { finalizeServiceLinePricing };

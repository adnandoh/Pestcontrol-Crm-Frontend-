import React from 'react';
import { PROPERTY_LOCATIONS } from '../../constants/pricing';
import {
  formatPlanLabel,
  getAmcPackageOptions,
  isAmcPlan,
  isBedBugService,
  isTermiteService,
  oneTimePlanValue,
  supportsAmcMode,
} from '../../constants/bookingPropertyTypes';
import {
  getAreaOptionsForService,
  type PricingConfig,
  type ServiceConfigMap,
} from '../../utils/jobCardPricing';
import { previewServiceSchedule } from '../../utils/bookingSchedule';

interface PerServicePricingSectionProps {
  selectedPackages: string[];
  serviceConfigs: ServiceConfigMap;
  pricingConfig: PricingConfig;
  commercialType: string;
  onPlanChange: (service: string, plan: string) => void;
  onAreaChange: (service: string, area: string) => void;
  validationErrors?: string[];
  scheduleDate?: string;
}

function areaOptionsForService(
  service: string,
  pricingConfig: PricingConfig,
  commercialType: string,
): string[] {
  const fromPricing = getAreaOptionsForService(service, pricingConfig, commercialType);
  if (fromPricing.length > 0) return fromPricing;
  if (service === 'Rodent') return ['Windows', 'Society Area', 'Commercial'];
  if (service === 'Hotel / Commercial') return ['Commercial Space'];
  return [...PROPERTY_LOCATIONS];
}

const PerServicePricingSection: React.FC<PerServicePricingSectionProps> = ({
  selectedPackages,
  serviceConfigs,
  pricingConfig,
  commercialType,
  onPlanChange,
  onAreaChange,
  validationErrors = [],
  scheduleDate = '',
}) => {
  if (selectedPackages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[13px] font-bold text-gray-800 mb-1">
          Selected Services Configuration
        </h4>
        <p className="text-[11px] text-gray-500 mb-3">
          Choose <strong>One Time</strong> or <strong>AMC package</strong> per service. Set booking date in Assignment & Payment to preview upcoming visits.
        </p>
        <div className="space-y-4">
          {selectedPackages.map((service) => {
            const cfg = serviceConfigs[service] || { plan: '', area: '' };
            const areaOptions = areaOptionsForService(service, pricingConfig, commercialType);
            const canAmc = supportsAmcMode(service);
            const mode: 'one_time' | 'amc' = isAmcPlan(cfg.plan) ? 'amc' : 'one_time';
            const amcOptions = getAmcPackageOptions(service);
            const preview = cfg.plan
              ? previewServiceSchedule(service, cfg.plan, scheduleDate)
              : null;

            return (
              <div
                key={service}
                className="rounded-xl border-2 border-gray-200 bg-white p-4 space-y-3 shadow-sm"
              >
                <p className="text-sm font-black text-gray-900 border-b border-gray-100 pb-2">
                  {service}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* One Time vs AMC */}
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wide mb-1 block">
                      Service Mode *
                    </label>
                    {isTermiteService(service) ? (
                      <div className="h-10 flex items-center px-3 text-sm font-semibold text-gray-800 bg-amber-50 border border-amber-200 rounded-lg">
                        One Time Treatment
                      </div>
                    ) : isBedBugService(service) ? (
                      <div className="h-10 flex items-center px-3 text-sm font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg">
                        One Time Service
                      </div>
                    ) : (
                      <select
                        value={mode}
                        onChange={(e) => {
                          const nextMode = e.target.value as 'one_time' | 'amc';
                          if (nextMode === 'amc' && amcOptions[0]) {
                            onPlanChange(service, amcOptions[0].value);
                          } else {
                            onPlanChange(service, oneTimePlanValue(service));
                          }
                        }}
                        className="w-full h-10 px-3 text-sm font-medium border border-gray-300 rounded-lg bg-white"
                      >
                        <option value="one_time">One Time Service</option>
                        {canAmc && <option value="amc">AMC Service</option>}
                      </select>
                    )}
                  </div>

                  {/* AMC package or termite note */}
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
                      {areaOptions.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Schedule preview */}
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

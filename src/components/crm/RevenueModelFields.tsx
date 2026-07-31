import type { JobCardFormData, PackageTier, PaymentModel } from '../../types';
import { previewVisitPayout, type RevenueEconomics } from '../../utils/revenuePayoutPreview';

interface RevenueModelFieldsProps {
  formData: JobCardFormData;
  onChange: (field: keyof JobCardFormData, value: string | number | null) => void;
  /** Show live pool estimate (create/edit). */
  showPreview?: boolean;
  eligiblePartnerCount?: number;
  readOnlySnapshots?: {
    payout_status?: string;
    visit_revenue_amount?: number | string;
    technician_pool_amount?: number | string;
    company_share_amount?: number | string;
    visit_payout_amount?: number | string;
  };
}

function inferEconomics(formData: JobCardFormData): RevenueEconomics {
  if (formData.payment_model === 'salaried') return 'salaried';
  const isAmc =
    formData.service_category === 'AMC' ||
    formData.is_amc_main_booking ||
    formData.is_followup_visit ||
    formData.included_in_amc;
  if (isAmc) return 'amc';
  const contractual =
    formData.job_type === 'Society' ||
    ['hotel', 'society', 'office', 'other'].includes(formData.commercial_type || '');
  if (contractual) return 'contractual';
  return 'one_time';
}

export default function RevenueModelFields({
  formData,
  onChange,
  showPreview = true,
  eligiblePartnerCount = 1,
  readOnlySnapshots,
}: RevenueModelFieldsProps) {
  const economics = inferEconomics(formData);
  const billable = Number.parseFloat(String(formData.price || '0')) || 0;
  const preview = previewVisitPayout({
    billableAmount: billable,
    technicianSharePercent: Number(formData.technician_share_percent ?? 40),
    plannedVisitCount: formData.planned_visit_count,
    maxCycle: formData.max_cycle,
    economics,
    eligiblePartnerCount,
  });

  const isLegacy = readOnlySnapshots?.payout_status === 'legacy_exempt';

  return (
    <div className="md:col-span-3 mt-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-[12px] font-extrabold text-emerald-800 uppercase tracking-widest">
          Revenue Model (40/60)
        </h5>
        {isLegacy && (
          <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
            Legacy — no 40/60
          </span>
        )}
      </div>

      {!isLegacy && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-bold text-gray-700 mb-1 block">Package Tier</label>
            <select
              value={formData.package_tier || ''}
              onChange={(e) => onChange('package_tier', e.target.value as PackageTier | '')}
              className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="">—</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-700 mb-1 block">Payment Model</label>
            <select
              value={formData.payment_model || 'revenue_sharing'}
              onChange={(e) => onChange('payment_model', e.target.value as PaymentModel)}
              className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="revenue_sharing">Revenue Sharing (40/60)</option>
              <option value="salaried">Salaried (no visit ledger)</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-700 mb-1 block">Tech Share %</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={formData.technician_share_percent ?? 40}
              onChange={(e) => {
                const tech = Number(e.target.value);
                onChange('technician_share_percent', tech);
                onChange('company_share_percent', Math.max(0, round2(100 - tech)));
              }}
              className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-700 mb-1 block">Planned Visits</label>
            <input
              type="number"
              min={1}
              value={formData.planned_visit_count ?? formData.max_cycle ?? ''}
              onChange={(e) =>
                onChange(
                  'planned_visit_count',
                  e.target.value === '' ? null : Number(e.target.value),
                )
              }
              placeholder={economics === 'one_time' ? '1 (one-time)' : 'e.g. 10'}
              className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg bg-white"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-700 mb-1 block">Discount ₹</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={formData.discount_amount ?? 0}
              onChange={(e) => onChange('discount_amount', Number(e.target.value) || 0)}
              className="w-full h-9 px-2 text-sm border border-gray-300 rounded-lg bg-white"
            />
          </div>
        </div>
      )}

      {showPreview && !isLegacy && formData.payment_model !== 'salaried' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <PreviewStat label="Visit revenue" value={preview.visitRevenue} />
          <PreviewStat label="Partner share (40%)" value={preview.technicianPool} />
          <PreviewStat label="Company (60%)" value={preview.companyShare} />
          <PreviewStat
            label={preview.held ? 'Status' : 'Per partner'}
            value={
              preview.held
                ? 'Held (no partners)'
                : preview.perPartnerShares.map((s: number) => `₹${s.toFixed(2)}`).join(' · ')
            }
            isText
          />
        </div>
      )}

      {readOnlySnapshots?.payout_status && (
        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">
          Payout status: {readOnlySnapshots.payout_status}
          {readOnlySnapshots.visit_payout_amount != null &&
            ` · Lead snapshot ₹${readOnlySnapshots.visit_payout_amount}`}
        </p>
      )}
    </div>
  );
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function PreviewStat({
  label,
  value,
  isText,
}: {
  label: string;
  value: number | string;
  isText?: boolean;
}) {
  return (
    <div className="rounded bg-white border border-emerald-100 px-2 py-1.5">
      <div className="text-[9px] font-bold text-gray-500 uppercase">{label}</div>
      <div className="font-extrabold text-emerald-900">
        {isText ? value : `₹${Number(value).toFixed(2)}`}
      </div>
    </div>
  );
}

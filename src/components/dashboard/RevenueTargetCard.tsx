import React, { useMemo } from 'react';
import { MoreVertical, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { DashboardStatisticsResponse } from '../../types';

const formatCurrency = (value: number) =>
  `₹${Math.round(value).toLocaleString('en-IN')}`;

const formatCompact = (value: number) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
};

interface SemiCircleGaugeProps {
  percent: number;
  growthPct?: number;
  loading?: boolean;
}

const SemiCircleGauge: React.FC<SemiCircleGaugeProps> = ({ percent, growthPct = 0, loading }) => {
  const radius = 86;
  const stroke = 14;
  const cx = 110;
  const cy = 110;
  const arcLength = Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = arcLength - (clamped / 100) * arcLength;

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      <svg viewBox="0 0 220 130" className="h-auto w-full" aria-hidden={loading}>
        <defs>
          <linearGradient id="revenueGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#465fff" />
            <stop offset="100%" stopColor="#7591ff" />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#eef2ff"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="dark:stroke-gray-700"
        />
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="url(#revenueGaugeGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={loading ? arcLength : offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out drop-shadow-sm"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-2 flex flex-col items-center justify-center text-center">
        {loading ? (
          <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
        ) : (
          <>
            <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              {clamped.toFixed(2)}%
            </span>
            {!loading && (
              <span
                className={cn(
                  'mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  growthPct >= 0
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
                )}
              >
                {growthPct >= 0 ? '+' : ''}
                {growthPct.toFixed(0)}%
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface KpiFooterItemProps {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

const KpiFooterItem: React.FC<KpiFooterItemProps> = ({ label, value, trend = 'neutral', loading }) => (
  <div className="flex flex-1 flex-col items-center justify-center px-3 py-4 text-center">
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
    {loading ? (
      <div className="mt-2 h-6 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
    ) : (
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-lg font-bold text-gray-900 dark:text-gray-50">{value}</span>
        {trend === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
        {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
      </div>
    )}
  </div>
);

export interface RevenueTargetCardProps {
  stats: DashboardStatisticsResponse | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const RevenueTargetCard: React.FC<RevenueTargetCardProps> = ({
  stats,
  loading = false,
  error,
  onRetry,
}) => {
  const target = stats?.revenue_target ?? 500000;
  const monthRevenue = stats?.month_revenue ?? 0;
  const todayRevenue = stats?.today_revenue ?? 0;
  const achievementPct = stats?.month_achievement_pct ?? 0;
  const revenueGrowthPct = stats?.revenue_growth_pct ?? 0;
  const todayGrowthPct = stats?.today_growth_pct ?? 0;

  const monthLabel = useMemo(
    () =>
      new Date().toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  if (error && !stats) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-lg dark:border-gray-700 dark:bg-crm-surface">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(15,23,42,0.12)] dark:border-gray-700 dark:bg-crm-surface">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-5 dark:border-gray-700/80">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">Monthly Target</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Target you&apos;ve set for each month
          </p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {monthLabel}
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800"
          aria-label="Monthly target options"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-6 py-5 pb-6">
        <SemiCircleGauge percent={achievementPct} growthPct={revenueGrowthPct} loading={loading} />
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 bg-gray-50/70 dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900/20">
        <KpiFooterItem
          label="Target"
          value={formatCompact(target)}
          trend={monthRevenue >= target ? 'up' : monthRevenue > 0 ? 'down' : 'neutral'}
          loading={loading}
        />
        <KpiFooterItem
          label="Revenue"
          value={formatCompact(monthRevenue)}
          trend={revenueGrowthPct >= 0 ? 'up' : revenueGrowthPct < 0 ? 'down' : 'neutral'}
          loading={loading}
        />
        <KpiFooterItem
          label="Today"
          value={formatCompact(todayRevenue)}
          trend={todayGrowthPct >= 0 ? 'up' : todayGrowthPct < 0 ? 'down' : 'neutral'}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default RevenueTargetCard;

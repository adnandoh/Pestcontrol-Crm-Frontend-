import { useEffect, useState } from 'react';
import { enhancedApiService } from '../services/api.enhanced';

/**
 * Revenue Model v2 UI gate.
 * Backend flag is authoritative when the API responds.
 * VITE_REVENUE_MODEL_V2 is only a fallback when the feature-flags call fails
 * (local UI work offline) — it must not override a successful backend=false.
 */
export function useRevenueModelV2(): boolean {
  const viteFallback = import.meta.env.VITE_REVENUE_MODEL_V2 === 'true';
  const [enabled, setEnabled] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    enhancedApiService
      .getFeatureFlags()
      .then((flags) => {
        if (!cancelled) {
          setEnabled(Boolean(flags.REVENUE_MODEL_V2));
          setResolved(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEnabled(viteFallback);
          setResolved(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [viteFallback]);

  // Avoid flashing Settlements nav before flag resolves when vite is false
  if (!resolved && !viteFallback) return false;
  if (!resolved && viteFallback) return true;
  return enabled;
}

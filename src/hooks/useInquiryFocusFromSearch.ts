import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { showAlert } from '../utils/notify';

/**
 * When global search navigates with ?focus=<id>, load that record on page 1
 * and scroll it into view (no manual pagination).
 */
export function useInquiryFocusFromSearch(onFocus: (focusId: string) => Promise<void>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get('focus');
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusId || handledRef.current === focusId) return;

    let cancelled = false;
    handledRef.current = focusId;

    (async () => {
      try {
        await onFocus(focusId);
        if (cancelled) return;
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('focus');
            return next;
          },
          { replace: true },
        );
        requestAnimationFrame(() => {
          document
            .getElementById(`inquiry-row-${focusId}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      } catch (err) {
        handledRef.current = null;
        const msg = err instanceof Error ? err.message : 'Record not found';
        showAlert(`Could not open inquiry: ${msg}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [focusId, onFocus, setSearchParams]);
}

export function inquiryRowAnchorId(id: number | string): string {
  return `inquiry-row-${id}`;
}

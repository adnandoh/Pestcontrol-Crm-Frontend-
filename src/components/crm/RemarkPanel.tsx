import React, { useState, useCallback } from 'react';
import { History, MessageSquarePlus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { enhancedApiService } from '../../services/api.enhanced';
import { cn } from '../../utils/cn';
import { Modal } from '../ui/Modal';
import type { InquiryRemarkEntry, LatestRemarkSummary, PaginatedResponse } from '../../types';
import { showAlert } from '../../utils/notify';

export type RemarkSourceType = 'crm' | 'website';

interface RemarkPanelProps {
  sourceType: RemarkSourceType;
  entityId: number;
  latestRemark?: LatestRemarkSummary | null;
  remarkCount?: number;
  /** Table row: compact preview + modals. Detail: same but slightly wider. */
  variant?: 'table' | 'detail';
  /** Tighter layout for dense data tables (e.g. website leads). */
  compact?: boolean;
  onRemarkAdded?: (entry: InquiryRemarkEntry, newCount: number) => void;
}

const formatRemarkDate = (iso?: string | null) => {
  if (!iso) return '';
  try {
    return format(new Date(iso), 'd MMM · h:mm a');
  } catch {
    return '';
  }
};

const RemarkPanel: React.FC<RemarkPanelProps> = ({
  sourceType,
  entityId,
  latestRemark,
  remarkCount = 0,
  variant = 'table',
  compact = false,
  onRemarkAdded,
}) => {
  const isTable = variant === 'table';
  const isDense = isTable && compact;

  const [composerOpen, setComposerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [history, setHistory] = useState<InquiryRemarkEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(remarkCount);
  const [toast, setToast] = useState<string | null>(null);

  const count = Math.max(remarkCount, historyTotal, latestRemark ? 1 : 0);
  const previewText = latestRemark?.remark?.trim() || '';

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res: PaginatedResponse<InquiryRemarkEntry> =
        sourceType === 'crm'
          ? await enhancedApiService.getCRMInquiryRemarks(entityId, { page: 1, page_size: 20 })
          : await enhancedApiService.getWebsiteLeadRemarks(entityId, { page: 1, page_size: 20 });
      setHistory(res.results);
      setHistoryTotal(res.count);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  }, [entityId, sourceType]);

  const openHistory = () => {
    setHistoryOpen(true);
    if (history.length === 0) loadHistory();
  };

  const handleSave = async () => {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    try {
      const entry =
        sourceType === 'crm'
          ? await enhancedApiService.createCRMInquiryRemark(entityId, { remark: text })
          : await enhancedApiService.createWebsiteLeadRemark(entityId, { remark: text });
      const newCount = count + 1;
      setHistoryTotal(newCount);
      setDraft('');
      setComposerOpen(false);
      showToast('Remark added');
      onRemarkAdded?.(entry, newCount);
    } catch (e: unknown) {
      showAlert(e instanceof Error ? e.message : 'Failed to save remark');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        'relative w-full',
        isDense ? 'max-w-none' : isTable ? 'max-w-[260px]' : 'max-w-md',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {toast && (
        <div className="absolute -top-8 left-0 z-20 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white shadow-md">
          ✓ {toast}
        </div>
      )}

      {/* Compact preview */}
      <div
        className={cn(
          'rounded-lg border border-slate-200/80 bg-slate-50/50',
          isDense ? 'px-1.5 py-1.5' : 'px-2.5 py-2',
        )}
      >
        {previewText ? (
          <>
            <p
              className={cn(
                'leading-snug text-slate-800',
                isDense ? 'text-[11px] line-clamp-1' : 'text-xs line-clamp-2',
              )}
            >
              {previewText}
            </p>
            {!isDense && (
              <p className="mt-1 text-[10px] text-slate-500">
                <span className="font-medium text-slate-600">
                  {latestRemark?.created_by_name || 'Staff'}
                </span>
                {latestRemark?.created_at && (
                  <span className="text-slate-400"> · {formatRemarkDate(latestRemark.created_at)}</span>
                )}
              </p>
            )}
          </>
        ) : (
          <p className={cn('text-slate-400 italic', isDense ? 'text-[10px]' : 'text-xs')}>
            No remarks yet
          </p>
        )}

        <div className={cn('flex flex-wrap items-center', isDense ? 'mt-1 gap-1' : 'mt-2 gap-1.5')}>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            title="Add remark"
            className={cn(
              'inline-flex items-center rounded-md bg-white font-semibold text-blue-700 shadow-sm ring-1 ring-slate-200 hover:bg-blue-50',
              isDense ? 'gap-0.5 px-1.5 py-0.5 text-[9px]' : 'gap-1 px-2 py-1 text-[10px]',
            )}
          >
            <MessageSquarePlus className={isDense ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            Add
          </button>
          {count > 0 && (
            <button
              type="button"
              onClick={openHistory}
              title="Remark history"
              className={cn(
                'inline-flex items-center rounded-md bg-white font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100',
                isDense ? 'gap-0.5 px-1.5 py-0.5 text-[9px]' : 'gap-1 px-2 py-1 text-[10px]',
              )}
            >
              <History className={isDense ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
              {isDense ? count : `History (${count})`}
            </button>
          )}
        </div>
      </div>

      {/* Add remark modal */}
      <Modal
        open={composerOpen}
        onOpenChange={setComposerOpen}
        title="New remark"
        description="Follow-up notes are saved to history — previous remarks are never overwritten."
        size="md"
      >
        <div className="space-y-3 pt-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Call summary, customer response, callback time..."
            className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 min-h-[120px] max-h-[160px]"
            rows={5}
            autoFocus
          />
          <p className="text-xs text-slate-400">{draft.length} characters</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setComposerOpen(false);
                setDraft('');
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save remark
            </button>
          </div>
        </div>
      </Modal>

      {/* History modal */}
      <Modal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title="Remark history"
        description={`${count} remark${count === 1 ? '' : 's'} on this lead`}
        size="lg"
      >
        <div className="max-h-[min(60vh,420px)] overflow-y-auto pt-2 space-y-3">
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : history.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No remarks found</p>
          ) : (
            history.map((r, idx) => (
              <div
                key={r.id}
                className={cn(
                  'rounded-lg border px-3 py-2.5',
                  idx === 0 ? 'border-blue-200 bg-blue-50/40' : 'border-slate-100 bg-white',
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {idx === 0 ? 'Latest' : formatRemarkDate(r.created_at)}
                  </span>
                  {idx === 0 && (
                    <span className="text-[10px] text-slate-500">{formatRemarkDate(r.created_at)}</span>
                  )}
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{r.remark}</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {r.created_by_name || 'Staff'}
                  {r.remark_type ? ` · ${r.remark_type}` : ''}
                </p>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};

export default RemarkPanel;

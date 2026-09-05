import React, { useEffect, useState } from 'react';
import { MessageSquarePlus, MessageSquareText, Loader2 } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import { Modal } from '../ui/Modal';
import { Button } from '../ui';
import { cn } from '../../utils/cn';
import { showAlert } from '../../utils/notify';
import type { Quotation } from '../../types';

interface QuotationRemarkButtonProps {
  quotation: Quotation;
  onSaved: (updated: Quotation) => void;
}

const QuotationRemarkButton: React.FC<QuotationRemarkButtonProps> = ({
  quotation,
  onSaved,
}) => {
  const existing = (quotation.notes || '').trim();
  const hasRemark = Boolean(existing);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(existing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft((quotation.notes || '').trim());
  }, [open, quotation.notes]);

  const handleSave = async () => {
    const next = draft.trim();
    setSaving(true);
    try {
      const updated = await enhancedApiService.updateQuotationRemark(quotation.id, next);
      onSaved(updated);
      setOpen(false);
      showAlert(next ? (hasRemark ? 'Remark updated' : 'Remark added') : 'Remark cleared');
    } catch (e: any) {
      console.error(e);
      showAlert(e?.message || 'Could not save remark. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        title={hasRemark ? 'Edit remark' : 'Add remark'}
        aria-label={hasRemark ? 'Edit remark' : 'Add remark'}
        className={cn(
          'h-8 gap-1.5 rounded-lg px-2.5',
          hasRemark
            ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800'
            : 'hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700',
        )}
        onClick={() => setOpen(true)}
      >
        {hasRemark ? (
          <MessageSquareText className="h-3.5 w-3.5" />
        ) : (
          <MessageSquarePlus className="h-3.5 w-3.5" />
        )}
        <span className="text-[10px] font-bold uppercase tracking-tight">
          {hasRemark ? 'Edit Remark' : 'Remark'}
        </span>
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={hasRemark ? 'Edit Remark' : 'Add Remark'}
        description={`${quotation.quotation_no} · ${quotation.customer_name || quotation.company_name || 'Customer'}`}
        size="md"
      >
        <div className="space-y-4">
          {hasRemark ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Current remark</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{existing}</p>
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-500">
              {hasRemark ? 'Update remark' : 'Remark'}
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              placeholder="Add follow-up notes, customer discussion, next steps…"
              className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/20"
              autoFocus
            />
            <p className="mt-1.5 text-[11px] text-gray-400">
              Leave empty and save to clear the remark.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
              onClick={handleSave}
              disabled={saving || draft.trim() === existing}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {hasRemark ? 'Save changes' : 'Add remark'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default QuotationRemarkButton;

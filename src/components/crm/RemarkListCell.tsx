import React from 'react';
import type { CRMInquiry, Inquiry, InquiryRemarkEntry } from '../../types';
import RemarkPanel from './RemarkPanel';

type RowEntity = CRMInquiry | Inquiry;

interface RemarkListCellProps {
  sourceType: 'crm' | 'website';
  row: RowEntity;
  onUpdate: (id: number, patch: Partial<RowEntity>) => void;
  compact?: boolean;
}

const RemarkListCell: React.FC<RemarkListCellProps> = ({ sourceType, row, onUpdate, compact }) => {
  const handleRemarkAdded = (entry: InquiryRemarkEntry, newCount: number) => {
    onUpdate(row.id, {
      remark_count: newCount,
      remark: entry.remark,
      latest_remark: {
        id: entry.id,
        remark: entry.remark,
        remark_type: entry.remark_type,
        created_by_name: entry.created_by_name,
        created_at: entry.created_at,
      },
    });
  };

  return (
    <RemarkPanel
      sourceType={sourceType}
      entityId={row.id}
      latestRemark={row.latest_remark}
      remarkCount={row.remark_count ?? (row.latest_remark ? 1 : 0)}
      variant="table"
      compact={compact}
      onRemarkAdded={handleRemarkAdded}
    />
  );
};

export default RemarkListCell;

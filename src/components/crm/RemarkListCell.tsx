import React from 'react';
import type { BookingReportClient, CRMInquiry, Inquiry, InquiryRemarkEntry } from '../../types';
import RemarkPanel, { type RemarkSourceType } from './RemarkPanel';

type InquiryRow = CRMInquiry | Inquiry;

interface RemarkListCellProps {
  sourceType: RemarkSourceType;
  row: InquiryRow | BookingReportClient;
  onUpdate: (id: number, patch: Record<string, unknown>) => void;
  compact?: boolean;
}

const RemarkListCell: React.FC<RemarkListCellProps> = ({ sourceType, row, onUpdate, compact }) => {
  const remarkCount =
    sourceType === 'booking_report'
      ? (row as BookingReportClient).remarks_count ?? ((row as BookingReportClient).latest_remark ? 1 : 0)
      : (row as InquiryRow).remark_count ?? ((row as InquiryRow).latest_remark ? 1 : 0);

  const handleRemarkAdded = (entry: InquiryRemarkEntry, newCount: number) => {
    const latest = {
      id: entry.id,
      remark: entry.remark,
      remark_type: entry.remark_type,
      created_by_name: entry.created_by_name,
      created_at: entry.created_at,
    };

    if (sourceType === 'booking_report') {
      onUpdate(row.id, {
        remarks_count: newCount,
        latest_remark: latest,
      });
      return;
    }

    onUpdate(row.id, {
      remark_count: newCount,
      remark: entry.remark,
      latest_remark: latest,
    });
  };

  return (
    <RemarkPanel
      sourceType={sourceType}
      entityId={row.id}
      latestRemark={row.latest_remark}
      remarkCount={remarkCount}
      variant="table"
      compact={compact}
      onRemarkAdded={handleRemarkAdded}
    />
  );
};

export default RemarkListCell;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { enhancedApiService } from '../../services/api.enhanced';
import type { JobCard, JobCardTechnicianParticipation, Technician } from '../../types';
import { payoutStatusLabel, previewVisitPayout } from '../../utils/revenuePayoutPreview';

interface JobCrewPanelProps {
  job: JobCard;
  onJobUpdated?: (job: JobCard) => void;
}

export default function JobCrewPanel({ job, onJobUpdated }: JobCrewPanelProps) {
  const [participants, setParticipants] = useState<JobCardTechnicianParticipation[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const locked = job.payout_status === 'approved' || job.payout_status === 'paid';
  const isLegacy = job.payout_status === 'legacy_exempt';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [crew, techs] = await Promise.all([
        enhancedApiService.getJobCardParticipants(job.id),
        enhancedApiService.getActiveTechnicians({ fresh: true }),
      ]);
      setParticipants(crew);
      setTechnicians(techs || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load crew');
    } finally {
      setLoading(false);
    }
  }, [job.id]);

  useEffect(() => {
    if (!isLegacy) load();
    else setLoading(false);
  }, [load, isLegacy]);

  const eligibleCount = useMemo(
    () =>
      participants.filter(
        (p) =>
          p.is_payout_eligible &&
          p.technician_type !== 'salaried' &&
          (p.attendance_status === 'checked_in' || p.attendance_status === 'completed'),
      ).length ||
      participants.filter((p) => p.is_payout_eligible && p.technician_type !== 'salaried').length,
    [participants],
  );

  const economics =
    job.payment_model === 'salaried'
      ? 'salaried'
      : job.service_category === 'AMC' || job.is_amc_main_booking || job.included_in_amc
        ? 'amc'
        : job.job_type === 'Society' ||
            ['hotel', 'society', 'office', 'other'].includes(job.commercial_type)
          ? 'contractual'
          : 'one_time';

  const preview = previewVisitPayout({
    billableAmount: Number(job.total_amount || job.price || 0),
    technicianSharePercent: Number(job.technician_share_percent ?? 40),
    plannedVisitCount: job.planned_visit_count,
    maxCycle: job.max_cycle,
    economics,
    eligiblePartnerCount: Math.max(eligibleCount, job.technician ? 1 : 0),
  });

  const addCrew = async () => {
    if (!selectedTechId || locked) return;
    setBusy(true);
    setError('');
    try {
      await enhancedApiService.addJobCardParticipant(job.id, {
        technician_id: Number(selectedTechId),
        role: 'crew',
      });
      setSelectedTechId('');
      await load();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Failed to add technician');
    } finally {
      setBusy(false);
    }
  };

  const updateAttendance = async (
    participantId: number,
    attendance_status: JobCardTechnicianParticipation['attendance_status'],
  ) => {
    if (locked) return;
    setBusy(true);
    try {
      await enhancedApiService.updateJobCardParticipant(job.id, participantId, {
        attendance_status,
      });
      await load();
    } catch (err) {
      console.error(err);
      setError('Failed to update attendance');
    } finally {
      setBusy(false);
    }
  };

  const removeCrew = async (participantId: number) => {
    if (locked) return;
    setBusy(true);
    try {
      await enhancedApiService.removeJobCardParticipant(job.id, participantId);
      await load();
    } catch (err) {
      console.error(err);
      setError('Failed to remove');
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: 'recalculate' | 'hold' | 'approve') => {
    setBusy(true);
    setError('');
    try {
      if (action === 'recalculate') {
        if (job.payout_status === 'cancelled') {
          setError('Cancelled payouts cannot be recalculated');
          return;
        }
        const result = await enhancedApiService.recalculateJobCardPayout(job.id);
        const refreshed = await enhancedApiService.getJobCard(job.id);
        onJobUpdated?.(refreshed);
        await load();
        if (result.skipped) setError(result.reason || 'Skipped');
      } else if (action === 'hold') {
        const updated = await enhancedApiService.holdJobCardPayout(job.id);
        onJobUpdated?.(updated);
        await load();
      } else {
        const updated = await enhancedApiService.approveJobCardPayout(job.id);
        onJobUpdated?.(updated);
        await load();
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (isLegacy) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[12px] font-bold text-amber-900 uppercase tracking-wide">
        Legacy booking — 40/60 revenue sharing does not apply.
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
        <h4 className="text-[13px] font-extrabold text-blue-600 uppercase tracking-widest">
          Crew & Payout
        </h4>
        <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-700 px-2 py-1 rounded">
          {payoutStatusLabel(job.payout_status)}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        <Stat label="Visit revenue" value={`₹${preview.visitRevenue.toFixed(2)}`} />
        <Stat label="Partner share (40%)" value={`₹${preview.technicianPool.toFixed(2)}`} />
        <Stat label="Company" value={`₹${preview.companyShare.toFixed(2)}`} />
        <Stat
          label="Split preview"
          value={
            preview.held
              ? 'Held'
              : preview.perPartnerShares.map((s) => `₹${s.toFixed(2)}`).join(' / ')
          }
        />
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 font-bold uppercase">Loading crew…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-gray-50 text-left uppercase text-gray-500">
                <th className="px-2 py-1.5">Technician</th>
                <th className="px-2 py-1.5">Role</th>
                <th className="px-2 py-1.5">Type</th>
                <th className="px-2 py-1.5">Attendance</th>
                <th className="px-2 py-1.5">Payout</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-3 text-gray-400 italic">
                    No crew rows yet. Lead is synced on payout calculate; add contractual crew below.
                  </td>
                </tr>
              ) : (
                participants.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-2 py-1.5 font-bold">
                      {p.technician_name}
                      <div className="text-[9px] text-gray-400">{p.technician_mobile}</div>
                    </td>
                    <td className="px-2 py-1.5 uppercase">{p.role}</td>
                    <td className="px-2 py-1.5">
                      {p.technician_type === 'salaried' ? (
                        <span className="text-slate-600 font-bold">Salaried</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">Partner</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        disabled={locked || busy}
                        value={p.attendance_status}
                        onChange={(e) =>
                          updateAttendance(
                            p.id,
                            e.target.value as JobCardTechnicianParticipation['attendance_status'],
                          )
                        }
                        className="h-7 text-[11px] border rounded px-1"
                      >
                        <option value="assigned">Assigned</option>
                        <option value="checked_in">Checked in</option>
                        <option value="completed">Completed</option>
                        <option value="absent">Absent</option>
                      </select>
                    </td>
                    <td className="px-2 py-1.5 font-bold">
                      {p.technician_type === 'salaried'
                        ? 'Salary only'
                        : `₹${Number(p.payout_amount_snapshot || 0).toFixed(2)}`}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {!locked && p.role !== 'lead' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeCrew(p.id)}
                          className="text-red-600 font-bold uppercase text-[10px]"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!locked && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[180px]">
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
              Add crew technician
            </label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="w-full h-9 text-sm border rounded-lg px-2"
            >
              <option value="">Select technician…</option>
              {technicians
                .filter((t) => !participants.some((p) => p.technician === t.id))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.technician_type || 'partner'})
                  </option>
                ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!selectedTechId || busy}
            onClick={addCrew}
            className="h-9 px-4 bg-blue-700 text-white text-[11px] font-extrabold uppercase rounded-lg disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={
            busy ||
            locked ||
            job.payout_status === 'cancelled' ||
            job.payout_status === 'legacy_exempt'
          }
          onClick={() => runAction('recalculate')}
          className="h-8 px-3 border border-blue-600 text-blue-700 text-[10px] font-extrabold uppercase rounded disabled:opacity-50"
          title="Save the booking first if you changed share % or visit count"
        >
          Recalculate payout
        </button>
        <button
          type="button"
          disabled={busy || locked || !['pending', 'not_applicable', 'held'].includes(job.payout_status || '')}
          onClick={() => runAction('hold')}
          className="h-8 px-3 border border-amber-600 text-amber-700 text-[10px] font-extrabold uppercase rounded disabled:opacity-50"
        >
          Hold
        </button>
        <button
          type="button"
          disabled={busy || !['pending', 'held'].includes(job.payout_status || '')}
          onClick={() => runAction('approve')}
          className="h-8 px-3 bg-emerald-700 text-white text-[10px] font-extrabold uppercase rounded disabled:opacity-50"
        >
          Approve payout
        </button>
      </div>

      {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-gray-100 bg-gray-50 px-2 py-1.5">
      <div className="text-[9px] font-bold text-gray-500 uppercase">{label}</div>
      <div className="font-extrabold text-gray-800 break-all">{value}</div>
    </div>
  );
}

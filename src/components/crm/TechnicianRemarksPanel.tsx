import { useEffect, useState } from 'react';
import { Loader2, MessageSquareWarning, Plus, Trash2 } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import type { TechnicianRemark } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import ClockTimePicker from '../ui/ClockTimePicker';
import { toClockDisplay, toStorageTime } from '../../utils/clockTime';

const fieldClass =
  'w-full h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600';
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700';

interface Props {
  technicianId: number;
}

function formatRemarkStamp(remark: TechnicianRemark): string {
  // toStorageTime also trims the seconds the API includes on a TimeField.
  const at = toStorageTime(remark.remark_time);
  const parsed = new Date(`${remark.remark_date}T${at}`);
  if (Number.isNaN(parsed.getTime())) {
    return `${remark.remark_date} ${at}`;
  }
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function nowDefaults() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

export default function TechnicianRemarksPanel({ technicianId }: Props) {
  const [remarks, setRemarks] = useState<TechnicianRemark[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const defaults = nowDefaults();
  const [text, setText] = useState('');
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    enhancedApiService
      .getTechnicianRemarks(technicianId)
      .then((rows) => {
        if (!cancelled) setRemarks(rows);
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!cancelled) setError('Could not load remarks.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [technicianId]);

  const addRemark = async () => {
    const remark = text.trim();
    if (!remark) {
      setError('Enter a remark before saving.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await enhancedApiService.addTechnicianRemark(technicianId, {
        remark,
        remark_date: date,
        remark_time: time,
      });
      // The list is newest-first, and a backdated remark may not belong at the
      // top, so re-sort rather than unshifting.
      setRemarks((prev) =>
        [created, ...prev].sort((a, b) =>
          `${b.remark_date}T${b.remark_time}`.localeCompare(
            `${a.remark_date}T${a.remark_time}`,
          ),
        ),
      );
      const next = nowDefaults();
      setText('');
      setDate(next.date);
      setTime(next.time);
    } catch (err: unknown) {
      console.error(err);
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Could not save the remark.');
    } finally {
      setSaving(false);
    }
  };

  const removeRemark = async (remarkId: number) => {
    const previous = remarks;
    setRemarks((prev) => prev.filter((r) => r.id !== remarkId));
    try {
      await enhancedApiService.deleteTechnicianRemark(technicianId, remarkId);
    } catch (err: unknown) {
      console.error(err);
      setRemarks(previous);
      setError('Could not delete the remark.');
    }
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4 border-b border-gray-100 pb-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
          <MessageSquareWarning className="h-5 w-5 text-red-600" />
          Remarks
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Dated notes about this technician. The date and time are when the thing
          happened, so a past incident can be written up later.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="technician-remark-text">
            Remark
          </label>
          <textarea
            id="technician-remark-text"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Reached the site 40 minutes late"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="technician-remark-date">
            Date
          </label>
          <Input
            id="technician-remark-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          {/* No htmlFor: the clock picker is a button, not a labelable input. */}
          <label className={labelClass}>Time</label>
          <ClockTimePicker
            value={toClockDisplay(time)}
            onChange={(val) => setTime(toStorageTime(val))}
            placeholder="Select time"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}

      <div className="mt-4 flex justify-end">
        {/* type="button": this panel sits inside the technician <form>, and a
            default submit button would save the whole technician instead. */}
        <Button
          type="button"
          onClick={addRemark}
          disabled={saving || !text.trim()}
          className="gap-2 bg-blue-700 hover:bg-blue-800"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Remark
        </Button>
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading remarks…
          </div>
        ) : remarks.length === 0 ? (
          <p className="py-2 text-sm text-gray-400 italic">No remarks yet.</p>
        ) : (
          <ul className="space-y-2">
            {remarks.map((remark) => (
              <li
                key={remark.id}
                className="group flex items-start justify-between gap-3 rounded-md border border-red-100 bg-red-50/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs leading-relaxed text-red-700 break-words">
                    {remark.remark}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {formatRemarkStamp(remark)}
                    {remark.created_by_name ? ` · ${remark.created_by_name}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeRemark(remark.id)}
                  aria-label="Delete remark"
                  className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

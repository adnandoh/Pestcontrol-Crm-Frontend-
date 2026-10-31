import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, RefreshCw, Users } from 'lucide-react';
import CopyablePhone from './CopyablePhone';
import { enhancedApiService } from '../../services/api.enhanced';
import type { TodayTechnicianReport as Report } from '../../types';
import { cn } from '../../utils/cn';

function formatToday(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusClass(status: string): string {
  if (status === 'Done') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'On Process') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'Pending') return 'bg-orange-50 text-orange-700 border-orange-200';
  if (status === 'Upcoming') return 'bg-violet-50 text-violet-700 border-violet-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

/** Bookings scheduled today, grouped by the active technician who owns them. */
const TodayTechnicianReport: React.FC = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setReport(await enhancedApiService.getTodayTechnicianReport());
    } catch {
      setError('Could not load today\'s technician report.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !report) {
    return (
      <div className="bg-white border border-gray-200 rounded-sm py-16 text-center text-sm font-bold text-gray-500">
        Loading today's technician report…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-sm py-16 text-center space-y-3">
        <p className="text-sm font-bold text-red-600">{error}</p>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase bg-blue-800 text-white rounded"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  const data = report!;
  const areaCount = new Set(
    data.technicians.flatMap((tech) => tech.locations.map((item) => item.toLowerCase())),
  ).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-sm px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Today</p>
          <p className="mt-1 text-sm font-black text-gray-900">{formatToday(data.date)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-sm px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Technicians on jobs</p>
          <p className="mt-1 text-sm font-black text-gray-900">{data.technician_count}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-sm px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bookings · Areas</p>
          <p className="mt-1 text-sm font-black text-gray-900">
            {data.booking_count} {data.booking_count === 1 ? 'booking' : 'bookings'} · {areaCount} {areaCount === 1 ? 'area' : 'areas'}
          </p>
        </div>
      </div>

      {data.technicians.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-sm py-16 text-center">
          <Users className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-black text-gray-700">No technicians have bookings today</p>
          <p className="mt-1 text-xs font-semibold text-gray-500">
            Active technicians appear here once a booking scheduled for today is assigned to them.
          </p>
        </div>
      ) : (
        data.technicians.map((tech) => (
          <section key={tech.id} className="bg-white border border-gray-200 rounded-sm overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-black text-gray-900">{tech.name}</h2>
                <div className="mt-1 flex items-center gap-1.5 text-blue-700">
                  <Phone className="h-3.5 w-3.5" />
                  <CopyablePhone phone={tech.mobile} className="text-[13px] font-bold" />
                </div>
              </div>
              <div className="sm:text-right">
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-blue-800">
                  {tech.booking_count} {tech.booking_count === 1 ? 'booking' : 'bookings'}
                </span>
                {tech.locations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 sm:justify-end">
                    {tech.locations.map((location) => (
                      <span
                        key={location}
                        className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-bold text-gray-700"
                      >
                        <MapPin className="h-3 w-3 text-gray-400" />
                        {location}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[12px]">
                <thead className="bg-white text-[10px] font-black uppercase tracking-wider text-gray-400">
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2">Booking</th>
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Mobile</th>
                    <th className="px-4 py-2">Service</th>
                    <th className="px-4 py-2">Price</th>
                    <th className="px-4 py-2">Location / Area</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tech.jobs.map((job) => (
                    <tr key={job.id} className="border-b border-gray-50 last:border-b-0">
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => navigate(`/jobcards/edit/${job.id}`)}
                          className="font-black text-blue-700 hover:underline"
                        >
                          #{job.id}
                        </button>
                        {job.time_slot && (
                          <div className="mt-0.5 text-[11px] font-semibold text-gray-500">{job.time_slot}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top font-bold text-gray-900">{job.customer_name || '—'}</td>
                      <td className="px-4 py-3 align-top">
                        <CopyablePhone phone={job.customer_mobile} className="font-bold text-blue-700" />
                      </td>
                      <td className="px-4 py-3 align-top font-semibold text-gray-800">{job.service_type || '—'}</td>
                      <td className="px-4 py-3 align-top font-black text-gray-900">{job.price_label}</td>
                      <td className="px-4 py-3 align-top font-semibold text-gray-700">{job.location || '—'}</td>
                      <td className="px-4 py-3 align-top">
                        <span className={cn('inline-flex rounded border px-2 py-0.5 text-[10px] font-black uppercase', statusClass(job.status))}>
                          {job.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export default TodayTechnicianReport;

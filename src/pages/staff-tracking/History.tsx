import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import StaffTrackingMap from '../../components/staff-tracking/StaffTrackingMap';
import { enhancedApiService } from '../../services/api.enhanced';
import type { StaffTrackingProfile } from '../../types';

const todayIso = () => new Date().toISOString().slice(0, 10);

const HistoryPage: React.FC = () => {
  const [profiles, setProfiles] = useState<StaffTrackingProfile[]>([]);
  const [technicianId, setTechnicianId] = useState<number | ''>('');
  const [date, setDate] = useState(todayIso());
  const [distanceKm, setDistanceKm] = useState<string | null>(null);
  const [pings, setPings] = useState<Array<{ lat: number; lng: number }>>([]);
  const [staffName, setStaffName] = useState('');

  useEffect(() => {
    enhancedApiService.getStaffTrackingProfiles().then(setProfiles).catch(console.error);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!technicianId) return;
    try {
      const data = await enhancedApiService.getStaffTrackingHistory(Number(technicianId), date);
      setStaffName(data.name);
      setDistanceKm(data.distance_km);
      setPings(
        data.pings.map((p) => ({
          lat: Number(p.latitude),
          lng: Number(p.longitude),
        })),
      );
    } catch (error) {
      console.error('History load error:', error);
      setPings([]);
    }
  }, [technicianId, date]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const polyline = useMemo(
    () => (pings.length >= 2 ? [{ path: pings, color: '#2563eb' }] : []),
    [pings],
  );

  const markers = useMemo(() => {
    if (!pings.length) return [];
    const first = pings[0];
    const last = pings[pings.length - 1];
    return [
      { id: 'start', lat: first.lat, lng: first.lng, title: 'Start', color: '#16a34a' },
      { id: 'end', lat: last.lat, lng: last.lng, title: 'Last', color: '#dc2626' },
    ];
  }, [pings]);

  return (
    <div className="space-y-6 pb-10">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <History className="h-6 w-6 text-purple-600" />
          Location History
        </h1>
        <p className="text-sm text-gray-500 font-bold italic">Route playback and distance per staff per day</p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <label className="text-xs font-bold text-gray-600 min-w-[200px]">
          Staff
          <select
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value ? Number(e.target.value) : '')}
            className="block mt-1 w-full border rounded-lg px-3 py-2 text-sm font-semibold"
          >
            <option value="">Select staff...</option>
            {profiles.map((p) => (
              <option key={p.technician_id} value={p.technician_id}>
                {p.name} ({p.mobile})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-gray-600">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="block mt-1 border rounded-lg px-3 py-2 text-sm"
          />
        </label>
        <button
          onClick={loadHistory}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg"
        >
          <Search className="h-4 w-4" />
          Load route
        </button>
      </div>

      {staffName && (
        <p className="text-sm font-bold text-gray-700">
          {staffName} · {date} · {distanceKm != null ? `${Number(distanceKm).toFixed(1)} km` : '—'} · {pings.length} pings
        </p>
      )}

      <StaffTrackingMap markers={markers} polylines={polyline} height="560px" />
    </div>
  );
};

export default HistoryPage;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin, RefreshCw, Battery, Clock } from 'lucide-react';
import { Card, CardContent } from '../../components/ui';
import StaffTrackingMap from '../../components/staff-tracking/StaffTrackingMap';
import { enhancedApiService } from '../../services/api.enhanced';
import { STATUS_COLORS } from '../../utils/staffTrackingMap';
import { cn } from '../../utils/cn';
import type { StaffTrackingLive } from '../../types';

const statusLabel: Record<string, string> = {
  on_duty: 'On duty',
  checked_in_idle: 'Checked in (idle)',
  off_duty: 'Off duty',
};

const LiveMapPage: React.FC = () => {
  const [staff, setStaff] = useState<StaffTrackingLive[]>([]);
  const [selected, setSelected] = useState<StaffTrackingLive | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLive = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await enhancedApiService.getStaffTrackingLive();
      setStaff(data);
    } catch (error) {
      console.error('Live map fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLive();
    const interval = window.setInterval(fetchLive, 30000);
    return () => window.clearInterval(interval);
  }, [fetchLive]);

  const markers = useMemo(
    () =>
      staff
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({
          id: s.technician_id,
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          title: s.name,
          color: STATUS_COLORS[s.status] || '#2563eb',
        })),
    [staff],
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6 text-green-600" />
            Live Staff Map
          </h1>
          <p className="text-sm text-gray-500 font-bold italic">Real-time field staff locations (auto-refresh 30s)</p>
        </div>
        <button
          onClick={fetchLive}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-50"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <StaffTrackingMap
            markers={markers}
            onMarkerClick={(m) => {
              const row = staff.find((s) => s.technician_id === m.id);
              if (row) setSelected(row);
            }}
            height="520px"
          />
        </div>

        <div className="space-y-3 max-h-[520px] overflow-y-auto">
          {staff.map((person) => (
            <Card
              key={person.technician_id}
              className={cn(
                'cursor-pointer transition-shadow hover:shadow-md',
                selected?.technician_id === person.technician_id && 'ring-2 ring-blue-500',
              )}
              onClick={() => setSelected(person)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-gray-900">{person.name}</p>
                    <p className="text-xs text-gray-500">{person.mobile} · {person.city || '—'}</p>
                  </div>
                  <span
                    className="text-[10px] font-black uppercase px-2 py-1 rounded-full text-white"
                    style={{ backgroundColor: STATUS_COLORS[person.status] || '#6b7280' }}
                  >
                    {statusLabel[person.status] || person.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600 font-semibold">
                  {person.check_in_at && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> In: {new Date(person.check_in_at).toLocaleTimeString()}
                    </span>
                  )}
                  {person.battery_percent != null && (
                    <span className="inline-flex items-center gap-1">
                      <Battery className="h-3 w-3" /> {person.battery_percent}%
                    </span>
                  )}
                  {person.distance_today_km != null && (
                    <span>{Number(person.distance_today_km).toFixed(1)} km today</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && staff.length === 0 && (
            <p className="text-sm text-gray-500 font-semibold p-4">No tracking profiles yet. Run backfill on backend.</p>
          )}
        </div>
      </div>

      {selected && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-black text-lg">{selected.name}</h3>
            <p className="text-sm text-gray-600">
              Last ping: {selected.last_ping_at ? new Date(selected.last_ping_at).toLocaleString() : '—'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveMapPage;

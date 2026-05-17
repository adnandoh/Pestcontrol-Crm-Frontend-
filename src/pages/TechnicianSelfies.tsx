import React, { useEffect, useState } from 'react';
import { Camera, Search, Loader2 } from 'lucide-react';
import { enhancedApiService } from '../services/api.enhanced';
import type { PartnerJobSelfie } from '../types';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageLoading } from '../components/ui';
import dayjs from 'dayjs';

const TechnicianSelfies: React.FC = () => {
  const [items, setItems] = useState<PartnerJobSelfie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');

  const fetchSelfies = async (bookingId?: number) => {
    try {
      setLoading(true);
      const res = await enhancedApiService.getPartnerSelfies({
        page_size: 100,
        booking_id: bookingId,
      });
      setItems(res.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSelfies();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = searchId.trim() ? Number(searchId.trim()) : undefined;
    fetchSelfies(id);
  };

  if (loading && items.length === 0) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Camera className="h-7 w-7 text-[#1e5a9e]" />
          Technician selfies
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Selfies captured when technicians start jobs in the Partner App
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <Input
          placeholder="Filter by booking ID..."
          value={searchId}
          onChange={(e) => setSearchId(e.target.value.replace(/\D/g, ''))}
          className="flex-1"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-lg bg-[#1e5a9e] px-4 py-2 text-sm font-medium text-white hover:bg-[#174a82]"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e5a9e]" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">
          <Camera className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          No selfies found yet
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((row) => (
            <Card key={row.id} className="overflow-hidden border-gray-100 shadow-sm">
              <div className="aspect-[4/3] bg-gray-100 relative">
                {row.selfie_url ? (
                  <img
                    src={row.selfie_url}
                    alt={`Selfie booking ${row.id}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    No image
                  </div>
                )}
              </div>
              <div className="p-4 space-y-1">
                <p className="font-bold text-gray-900">
                  Booking #{row.id}
                  {row.code ? ` · ${row.code}` : ''}
                </p>
                <p className="text-sm text-gray-600">{row.client_name}</p>
                <p className="text-xs text-gray-500">
                  {row.technician_name || row.partner_name || 'Technician'}
                </p>
                <p className="text-xs font-medium text-[#1e5a9e]">
                  Started:{' '}
                  {row.started_at
                    ? dayjs(row.started_at).format('DD MMM YYYY, hh:mm A')
                    : '—'}
                </p>
                <span className="inline-block mt-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  {row.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TechnicianSelfies;

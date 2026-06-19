import React, { useCallback, useEffect, useState } from 'react';
import { Users, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent } from '../../components/ui';
import { enhancedApiService } from '../../services/api.enhanced';
import { cn } from '../../utils/cn';
import type { StaffTrackingProfile } from '../../types';

const DirectoryPage: React.FC = () => {
  const [profiles, setProfiles] = useState<StaffTrackingProfile[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await enhancedApiService.getStaffTrackingProfiles();
      setProfiles(data);
    } catch (error) {
      console.error('Staff directory error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = profiles.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.mobile.includes(search),
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Staff Directory
          </h1>
          <p className="text-sm text-gray-500 font-bold italic">Field staff enrolled in GPS tracking</p>
        </div>
        <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or mobile..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((profile) => (
          <Card key={profile.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-gray-900">{profile.name}</p>
                  <p className="text-xs text-gray-500">{profile.mobile}</p>
                </div>
                <span
                  className={cn(
                    'text-[10px] font-black uppercase px-2 py-1 rounded-full',
                    profile.tracking_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600',
                  )}
                >
                  {profile.tracking_enabled ? 'Tracking on' : 'Off'}
                </span>
              </div>
              <p className="text-sm text-gray-600 font-semibold">City: {profile.city || '—'}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DirectoryPage;

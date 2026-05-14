import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2,
  XCircle,
  Shield
} from 'lucide-react';
import { 
  Card, 
  Button, 
  Input, 
  Badge, 
  Modal,
  PageLoading,
  ConfirmationModal
} from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { enhancedApiService } from '../services/api.enhanced';
import type { City, Location as MasterLocation } from '../types';
import { cn } from '../utils/cn';

const MasterLocations: React.FC = () => {
  const [locations, setLocations] = useState<MasterLocation[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MasterLocation | null>(null);
  const [bulkJson, setBulkJson] = useState('');
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    is_active: true
  });
  const [bulkMode, setBulkMode] = useState<'json' | 'simple'>('simple');
  const [defaultCityId, setDefaultCityId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [locationsRes, citiesRes] = await Promise.all([
        enhancedApiService.getMasterLocations({ search: searchQuery, page_size: 1000 }),
        enhancedApiService.getCities({ page_size: 500 })
      ]);
      setLocations(locationsRes.results);
      setCities(citiesRes.results);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedLocation) {
        await enhancedApiService.updateMasterLocation(selectedLocation.id, formData);
      } else {
        await enhancedApiService.createMasterLocation(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving location:', error);
      alert('FAILED TO SAVE LOCATION');
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let data: any[] = [];
      
      if (bulkMode === 'json') {
        let parsed: any;
        try {
          parsed = JSON.parse(bulkJson);
        } catch {
          alert('INVALID JSON FORMAT. PLEASE CHECK YOUR INPUT.');
          return;
        }
        if (!Array.isArray(parsed)) {
          alert('JSON DATA MUST BE AN ARRAY. USE [ ... ]');
          return;
        }

        // Auto-detect: if array of strings, convert to objects
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          if (!defaultCityId) {
            alert('YOU PASTED A LIST OF NAMES. PLEASE SELECT A DEFAULT CITY FIRST.');
            return;
          }
          data = parsed
            .map((s: any) => (typeof s === 'string' ? s.trim() : null))
            .filter(Boolean)
            .map((name: string) => ({ name, city: parseInt(defaultCityId), is_active: true }));
        } else {
          // Validate each item is an object
          const invalidItems = parsed.filter((item: any) => typeof item !== 'object' || item === null || Array.isArray(item));
          if (invalidItems.length > 0) {
            alert(`${invalidItems.length} ITEMS ARE NOT VALID OBJECTS. EACH ITEM MUST BE {"name": "...", "city": 1}`);
            return;
          }
          data = parsed;
        }
      } else {
        // Simple mode: split by lines
        const names = bulkJson.split('\n').map(n => n.trim()).filter(n => n.length > 0);
        if (names.length === 0) {
          alert('PLEASE ENTER AT LEAST ONE LOCATION NAME');
          return;
        }
        if (!defaultCityId) {
          alert('PLEASE SELECT A DEFAULT CITY');
          return;
        }
        data = names.map(name => ({
          name,
          city: parseInt(defaultCityId),
          is_active: true
        }));
      }

      if (data.length === 0) {
        alert('NO VALID LOCATIONS TO ADD.');
        return;
      }

      await enhancedApiService.bulkCreateMasterLocations(data);
      setIsBulkModalOpen(false);
      setBulkJson('');
      fetchData();
      alert(`SUCCESSFULLY ADDED ${data.length} LOCATIONS`);
    } catch (error: any) {
      console.error('Error bulk adding locations:', error);
      const msg = error?.response?.data ? JSON.stringify(error.response.data).slice(0, 200) : error.message;
      alert('BULK ADD FAILED: ' + (msg || 'PLEASE CHECK YOUR DATA'));
    }
  };

  const handleDelete = async () => {
    if (!selectedLocation) return;
    try {
      await enhancedApiService.deleteMasterLocation(selectedLocation.id);
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  const openEditModal = (loc: MasterLocation) => {
    setSelectedLocation(loc);
    setFormData({
      name: loc.name,
      city: loc.city.toString(),
      is_active: loc.is_active
    });
    setIsModalOpen(true);
  };

  if (loading && locations.length === 0) return <PageLoading />;

  if (!user?.is_superuser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="h-20 w-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center shadow-inner">
          <Shield className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Access Restricted</h2>
        <p className="text-sm text-gray-500 max-w-xs font-medium uppercase tracking-wider">
          Only Super Administrators can access Master Management.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <MapPin className="h-7 w-7 text-blue-600" />
            MASTER LOCATIONS
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1 uppercase tracking-wider">
            Manage specific areas/locations for bookings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsBulkModalOpen(true)}
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50 uppercase text-[10px] font-black"
          >
            BULK ADD
          </Button>
          <Button 
            onClick={() => {
              setSelectedLocation(null);
              setFormData({ name: '', city: cities[0]?.id.toString() || '', is_active: true });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 uppercase text-[10px] font-black"
          >
            <Plus className="h-4 w-4 mr-2" />
            ADD NEW LOCATION
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="SEARCH LOCATIONS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-200 focus:ring-blue-500 rounded-xl uppercase text-xs font-bold tracking-tight"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Location Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">City</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <p className="text-gray-400 font-bold uppercase italic">No locations found</p>
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 font-black text-gray-900 uppercase tracking-tight">{loc.name}</td>
                    <td className="px-6 py-4 font-bold text-gray-600 uppercase tracking-tighter">{loc.city_name}</td>
                    <td className="px-6 py-4">
                      <Badge variant={loc.is_active ? 'success' : 'secondary'} className="uppercase text-[9px] font-black">
                        {loc.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openEditModal(loc)}
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedLocation(loc);
                            setIsDeleteModalOpen(true);
                          }}
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={selectedLocation ? "EDIT LOCATION" : "ADD NEW LOCATION"}
        size="md"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4 p-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Location Name</label>
            <Input 
              required
              placeholder="ENTER LOCATION NAME..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded-xl border-gray-200 uppercase text-xs font-bold tracking-tight"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">City</label>
            <select
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full rounded-xl border-gray-200 h-10 px-3 uppercase text-xs font-bold tracking-tight bg-white border"
            >
              <option value="">SELECT CITY</option>
              {cities.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.state_name})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</label>
            <div className="flex items-center gap-3 mt-1">
               <button
                type="button"
                onClick={() => setFormData({ ...formData, is_active: true })}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all",
                  formData.is_active 
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm" 
                    : "border-gray-100 text-gray-400"
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_active: false })}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all",
                  !formData.is_active 
                    ? "border-red-600 bg-red-50 text-red-700 shadow-sm" 
                    : "border-gray-100 text-gray-400"
                )}
              >
                <XCircle className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Inactive</span>
              </button>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} className="uppercase text-[10px] font-black">Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 shadow-lg shadow-blue-100 uppercase text-[10px] font-black">
              {selectedLocation ? 'Update Location' : 'Create Location'}
            </Button>
          </div>
        </form>
      </Modal>
      
      <Modal
        open={isBulkModalOpen}
        onOpenChange={setIsBulkModalOpen}
        title="BULK ADD LOCATIONS"
        size="lg"
      >
        <form onSubmit={handleBulkAdd} className="space-y-4 p-4">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setBulkMode('simple')}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all",
                bulkMode === 'simple' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Simple List
            </button>
            <button
              type="button"
              onClick={() => setBulkMode('json')}
              className={cn(
                "flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all",
                bulkMode === 'json' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              JSON Expert
            </button>
          </div>

          {/* Show city selector in both modes */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              {bulkMode === 'simple' ? 'Default City (FOR ALL LOCATIONS)' : 'Default City (USED IF PASTING NAMES LIST)'}
            </label>
            <select
              value={defaultCityId}
              onChange={(e) => setDefaultCityId(e.target.value)}
              required={bulkMode === 'simple'}
              className="w-full rounded-xl border-gray-200 h-10 px-3 uppercase text-xs font-bold tracking-tight bg-white border"
            >
              <option value="">SELECT CITY</option>
              {cities.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.state_name})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              {bulkMode === 'simple' ? 'Location Names (ONE PER LINE)' : 'JSON DATA — Array of objects OR just paste names (one per line)'}
            </label>
            <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tight">
              {bulkMode === 'simple' 
                ? 'Paste names — one per line. e.g. Vasant Vihar [Enter] Hiranandani' 
                : 'Supports: [{"name":"X","city":1}] or just "Name1" "Name2" (select city above)'
              }
            </p>
            <textarea
              required
              placeholder={bulkMode === 'simple' ? "Vasant Vihar\nHiranandani\nMajiwada" : '[{"name": "Vasant Vihar", "city": 1, "is_active": true}]'}
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              className="w-full h-64 p-4 rounded-xl border border-gray-200 font-mono text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={() => setIsBulkModalOpen(false)} className="uppercase text-[10px] font-black">Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 shadow-lg shadow-blue-100 uppercase text-[10px] font-black">
              Process Bulk Upload
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="DELETE LOCATION?"
        message={`ARE YOU SURE YOU WANT TO REMOVE ${selectedLocation?.name}?`}
        type="danger"
      />
    </div>
  );
};

export default MasterLocations;

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
import type { City, State } from '../types';
import { cn } from '../utils/cn';

const MasterCities: React.FC = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [bulkJson, setBulkJson] = useState('');
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    is_active: true
  });
  const [bulkMode, setBulkMode] = useState<'json' | 'simple'>('simple');
  const [defaultStateId, setDefaultStateId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [citiesRes, statesRes] = await Promise.all([
        enhancedApiService.getCities({ search: searchQuery, page_size: 1000 }),
        enhancedApiService.getStates({ page_size: 500 })
      ]);
      setCities(citiesRes.results);
      setStates(statesRes.results);
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
      if (selectedCity) {
        await enhancedApiService.updateCity(selectedCity.id, formData);
      } else {
        await enhancedApiService.createCity(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving city:', error);
      alert('FAILED TO SAVE CITY');
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
          if (!defaultStateId) {
            alert('YOU PASTED A LIST OF NAMES. PLEASE SELECT A DEFAULT STATE FIRST.');
            return;
          }
          data = parsed
            .map((s: any) => (typeof s === 'string' ? s.trim() : null))
            .filter(Boolean)
            .map((name: string) => ({ name, state: parseInt(defaultStateId), is_active: true }));
        } else {
          const invalidItems = parsed.filter((item: any) => typeof item !== 'object' || item === null || Array.isArray(item));
          if (invalidItems.length > 0) {
            alert(`${invalidItems.length} ITEMS ARE NOT VALID OBJECTS. EACH ITEM MUST BE {"name": "...", "state": 1}`);
            return;
          }
          data = parsed;
        }
      } else {
        // Simple mode: split by lines
        const names = bulkJson.split('\n').map(n => n.trim()).filter(n => n.length > 0);
        if (names.length === 0) {
          alert('PLEASE ENTER AT LEAST ONE CITY NAME');
          return;
        }
        if (!defaultStateId) {
          alert('PLEASE SELECT A DEFAULT STATE');
          return;
        }
        data = names.map(name => ({
          name,
          state: parseInt(defaultStateId),
          is_active: true
        }));
      }

      if (data.length === 0) {
        alert('NO VALID CITIES TO ADD.');
        return;
      }

      await enhancedApiService.bulkCreateCities(data);
      setIsBulkModalOpen(false);
      setBulkJson('');
      fetchData();
      alert(`SUCCESSFULLY ADDED ${data.length} CITIES`);
    } catch (error: any) {
      console.error('Error bulk adding cities:', error);
      const msg = error?.response?.data ? JSON.stringify(error.response.data).slice(0, 200) : error.message;
      alert('BULK ADD FAILED: ' + (msg || 'PLEASE CHECK YOUR DATA'));
    }
  };

  const handleDelete = async () => {
    if (!selectedCity) return;
    try {
      await enhancedApiService.deleteCity(selectedCity.id);
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting city:', error);
    }
  };

  const openEditModal = (city: City) => {
    setSelectedCity(city);
    setFormData({
      name: city.name,
      state: city.state.toString(),
      is_active: city.is_active
    });
    setIsModalOpen(true);
  };

  if (loading && cities.length === 0) return <PageLoading />;

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
            MASTER CITIES
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1 uppercase tracking-wider">
            Manage cities for the booking system
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
              setSelectedCity(null);
              setFormData({ name: '', state: states[0]?.id.toString() || '', is_active: true });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 uppercase text-[10px] font-black"
          >
            <Plus className="h-4 w-4 mr-2" />
            ADD NEW CITY
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="SEARCH CITIES..."
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
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">City Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">State</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <p className="text-gray-400 font-bold uppercase italic">No cities found</p>
                  </td>
                </tr>
              ) : (
                cities.map((city) => (
                  <tr key={city.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 font-black text-gray-900 uppercase tracking-tight">{city.name}</td>
                    <td className="px-6 py-4 font-bold text-gray-600 uppercase tracking-tighter">{city.state_name}</td>
                    <td className="px-6 py-4">
                      <Badge variant={city.is_active ? 'success' : 'secondary'} className="uppercase text-[9px] font-black">
                        {city.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openEditModal(city)}
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedCity(city);
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
        title={selectedCity ? "EDIT CITY" : "ADD NEW CITY"}
        size="md"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4 p-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">City Name</label>
            <Input 
              required
              placeholder="ENTER CITY NAME..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded-xl border-gray-200 uppercase text-xs font-bold tracking-tight"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">State</label>
            <select
              required
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full rounded-xl border-gray-200 h-10 px-3 uppercase text-xs font-bold tracking-tight bg-white border"
            >
              <option value="">SELECT STATE</option>
              {states.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.country_name})</option>
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
              {selectedCity ? 'Update City' : 'Create City'}
            </Button>
          </div>
        </form>
      </Modal>
      
      <Modal
        open={isBulkModalOpen}
        onOpenChange={setIsBulkModalOpen}
        title="BULK ADD CITIES"
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

          {bulkMode === 'simple' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Default State (FOR ALL CITIES)</label>
              <select
                required
                value={defaultStateId}
                onChange={(e) => setDefaultStateId(e.target.value)}
                className="w-full rounded-xl border-gray-200 h-10 px-3 uppercase text-xs font-bold tracking-tight bg-white border"
              >
                <option value="">SELECT STATE</option>
                {states.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.country_name})</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              {bulkMode === 'simple' ? 'City Names (ONE PER LINE)' : 'JSON DATA (ARRAY OF OBJECTS)'}
            </label>
            <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tight">
              {bulkMode === 'simple' 
                ? 'Just paste names like: Mumbai [Enter] Pune [Enter] Thane' 
                : 'Format: [{"name": "City Name", "state": 1, "is_active": true}]'
              }
            </p>
            <textarea
              required
              placeholder={bulkMode === 'simple' ? "Mumbai\nPune\nThane" : '[{"name": "Thane", "state": 1, "is_active": true}]'}
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
        title="DELETE CITY?"
        message={`ARE YOU SURE YOU WANT TO REMOVE ${selectedCity?.name}? THIS MAY AFFECT ASSOCIATED LOCATIONS.`}
        type="danger"
      />
    </div>
  );
};

export default MasterCities;

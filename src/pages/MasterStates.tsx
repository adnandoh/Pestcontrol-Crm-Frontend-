import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2,
  XCircle,
  Shield,
  Map
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
import type { State, Country } from '../types';
import { cn } from '../utils/cn';

const MasterStates: React.FC = () => {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [bulkJson, setBulkJson] = useState('');
  const [bulkMode, setBulkMode] = useState<'json' | 'simple'>('simple');
  const [defaultCountryId, setDefaultCountryId] = useState('1');
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    country: '1',
    is_active: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const statesRes = await enhancedApiService.getStates({ search: searchQuery });
      setStates(statesRes.results);
      // Country is fixed to India (ID 1)
      setDefaultCountryId('1');
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
      if (selectedState) {
        await enhancedApiService.updateState(selectedState.id, formData);
      } else {
        await enhancedApiService.createState(formData);
      }
      setIsModalOpen(false);
      fetchData();
      alert('STATE SAVED SUCCESSFULLY');
    } catch (error: any) {
      console.error('Error saving state:', error);
      alert('FAILED TO SAVE STATE');
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let data: any[] = [];
      
      if (bulkMode === 'json') {
        data = JSON.parse(bulkJson);
        if (!Array.isArray(data)) {
          alert('JSON DATA MUST BE AN ARRAY');
          return;
        }
      } else {
        const names = bulkJson.split('\n').map(n => n.trim()).filter(n => n.length > 0);
        if (names.length === 0) {
          alert('PLEASE ENTER AT LEAST ONE STATE NAME');
          return;
        }
        if (!defaultCountryId) {
          alert('PLEASE SELECT A DEFAULT COUNTRY');
          return;
        }
        data = names.map(name => ({
          name,
          country: parseInt(defaultCountryId),
          is_active: true
        }));
      }

      const invalidItems = data.filter(item => typeof item !== 'object' || item === null);
      if (invalidItems.length > 0) {
        alert(`ERROR: ${invalidItems.length} ITEMS ARE INVALID. PLEASE CHECK FORMAT.`);
        return;
      }

      await enhancedApiService.bulkCreateStates(data);
      setIsBulkModalOpen(false);
      setBulkJson('');
      fetchData();
      alert(`SUCCESSFULLY ADDED ${data.length} STATES`);
    } catch (error: any) {
      console.error('Error bulk adding states:', error);
      alert('BULK ADD FAILED: ' + (error.message || 'CHECK FORMAT'));
    }
  };

  const handleDelete = async () => {
    if (!selectedState) return;
    try {
      await enhancedApiService.deleteState(selectedState.id);
      setIsDeleteModalOpen(false);
      fetchData();
      alert('STATE DELETED');
    } catch (error) {
      console.error('Error deleting state:', error);
      alert('FAILED TO DELETE STATE');
    }
  };

  const openEditModal = (state: State) => {
    setSelectedState(state);
    setFormData({
      name: state.name,
      country: state.country.toString(),
      is_active: state.is_active
    });
    setIsModalOpen(true);
  };

  if (loading && states.length === 0) return <PageLoading />;

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
            <Map className="h-7 w-7 text-blue-600" />
            MASTER STATES
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1 uppercase tracking-wider">
            Manage states within India
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => {
              setIsBulkModalOpen(true);
              setDefaultCountryId('1');
            }}
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50 uppercase text-[10px] font-black"
          >
            BULK ADD
          </Button>
          <Button 
            onClick={() => {
              setSelectedState(null);
              setFormData({ name: '', country: '1', is_active: true });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 uppercase text-[10px] font-black"
          >
            <Plus className="h-4 w-4 mr-2" />
            ADD NEW STATE
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="SEARCH STATES..."
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
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">State Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {states.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <p className="text-gray-400 font-bold uppercase italic">No states found</p>
                  </td>
                </tr>
              ) : (
                states.map((state) => (
                  <tr key={state.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 font-black text-gray-900 uppercase tracking-tight">{state.name}</td>
                    <td className="px-6 py-4">
                      <Badge variant={state.is_active ? 'success' : 'secondary'} className="uppercase text-[9px] font-black">
                        {state.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openEditModal(state)}
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedState(state);
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
        title={selectedState ? "EDIT STATE" : "ADD NEW STATE"}
        size="md"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4 p-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">State Name</label>
            <Input 
              required
              placeholder="ENTER STATE NAME..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded-xl border-gray-200 uppercase text-xs font-bold tracking-tight"
            />
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
              {selectedState ? 'Update State' : 'Create State'}
            </Button>
          </div>
        </form>
      </Modal>
      
      <Modal
        open={isBulkModalOpen}
        onOpenChange={setIsBulkModalOpen}
        title="BULK ADD STATES"
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

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              {bulkMode === 'simple' ? 'State Names (ONE PER LINE)' : 'JSON DATA (ARRAY OF OBJECTS)'}
            </label>
            <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tight">
              {bulkMode === 'simple' 
                ? 'Just paste names like: Maharashtra [Enter] Gujarat [Enter] Goa' 
                : 'Format: [{"name": "State Name", "country": 1, "is_active": true}]'
              }
            </p>
            <textarea
              required
              placeholder={bulkMode === 'simple' ? "Maharashtra\nGujarat\nGoa" : '[{"name": "Maharashtra", "country": 1, "is_active": true}]'}
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
        title="DELETE STATE?"
        message={`ARE YOU SURE YOU WANT TO REMOVE ${selectedState?.name}? THIS MAY AFFECT ASSOCIATED CITIES.`}
        type="danger"
      />
    </div>
  );
};

export default MasterStates;

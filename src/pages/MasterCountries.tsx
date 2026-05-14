import React, { useState, useEffect } from 'react';
import { 
  Globe, 
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
import type { Country } from '../types';
import { cn } from '../utils/cn';

const MasterCountries: React.FC = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    is_active: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await enhancedApiService.getCountries({ search: searchQuery });
      setCountries(res.results);
    } catch (error) {
      console.error('Error fetching countries:', error);
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
      if (selectedCountry) {
        await enhancedApiService.updateCountry(selectedCountry.id, formData);
      } else {
        await enhancedApiService.createCountry(formData);
      }
      setIsModalOpen(false);
      fetchData();
      alert('COUNTRY SAVED SUCCESSFULLY');
    } catch (error: any) {
      console.error('Error saving country:', error);
      alert('FAILED TO SAVE COUNTRY');
    }
  };

  const handleDelete = async () => {
    if (!selectedCountry) return;
    try {
      await enhancedApiService.deleteCountry(selectedCountry.id);
      setIsDeleteModalOpen(false);
      fetchData();
      alert('COUNTRY DELETED');
    } catch (error) {
      console.error('Error deleting country:', error);
      alert('FAILED TO DELETE COUNTRY');
    }
  };

  const openEditModal = (country: Country) => {
    setSelectedCountry(country);
    setFormData({
      name: country.name,
      code: country.code || '',
      is_active: country.is_active
    });
    setIsModalOpen(true);
  };

  if (loading && countries.length === 0) return <PageLoading />;

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
            <Globe className="h-7 w-7 text-blue-600" />
            MASTER COUNTRIES
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1 uppercase tracking-wider">
            Manage countries for the geographic system
          </p>
        </div>
        <Button 
          onClick={() => {
            setSelectedCountry(null);
            setFormData({ name: '', code: '', is_active: true });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 uppercase text-[10px] font-black"
        >
          <Plus className="h-4 w-4 mr-2" />
          ADD NEW COUNTRY
        </Button>
      </div>

      <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="SEARCH COUNTRIES..."
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
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Country Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Code</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {countries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <p className="text-gray-400 font-bold uppercase italic">No countries found. Please add India first.</p>
                  </td>
                </tr>
              ) : (
                countries.map((country) => (
                  <tr key={country.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 font-black text-gray-900 uppercase tracking-tight">
                      {country.name}
                      {country.id === 1 && <Badge className="ml-2 bg-blue-100 text-blue-700">DEFAULT</Badge>}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-600 uppercase tracking-tighter">{country.code || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={country.is_active ? 'success' : 'secondary'} className="uppercase text-[9px] font-black">
                        {country.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openEditModal(country)}
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedCountry(country);
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
        title={selectedCountry ? "EDIT COUNTRY" : "ADD NEW COUNTRY"}
        size="md"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4 p-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Country Name</label>
            <Input 
              required
              placeholder="e.g. India"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded-xl border-gray-200 uppercase text-xs font-bold tracking-tight"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Country Code (Optional)</label>
            <Input 
              placeholder="e.g. IN"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
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
              {selectedCountry ? 'Update Country' : 'Create Country'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="DELETE COUNTRY?"
        message={`ARE YOU SURE YOU WANT TO REMOVE ${selectedCountry?.name}? THIS MAY AFFECT ASSOCIATED STATES.`}
        type="danger"
      />
    </div>
  );
};

export default MasterCountries;

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  User,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Hash,
  Contact2
} from 'lucide-react';
import {
  Button,
  Card,
  Input,
  Badge
} from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import type { Technician } from '../types';
import { cn } from '../utils/cn';

const Technicians: React.FC = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    age: '',
    alternative_mobile: '',
    is_active: true
  });

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const response = await enhancedApiService.getTechnicians();
      setTechnicians(response.results);
    } catch (error) {
      console.error('Failed to fetch technicians:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingTech) {
        await enhancedApiService.updateTechnician(editingTech.id, {
          ...formData,
          age: formData.age ? parseInt(formData.age) : undefined
        });
      } else {
        await enhancedApiService.createTechnician({
          ...formData,
          age: formData.age ? parseInt(formData.age) : undefined
        });
      }
      setIsModalOpen(false);
      resetForm();
      fetchTechnicians();
    } catch (error) {
      console.error('Failed to save technician:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      mobile: '',
      age: '',
      alternative_mobile: '',
      is_active: true
    });
    setEditingTech(null);
  };

  const handleEdit = (tech: Technician) => {
    setEditingTech(tech);
    setFormData({
      name: tech.name,
      mobile: tech.mobile,
      age: tech.age?.toString() || '',
      alternative_mobile: tech.alternative_mobile || '',
      is_active: tech.is_active
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this technician?')) {
      try {
        await enhancedApiService.deleteTechnician(id);
        fetchTechnicians();
      } catch (error) {
        console.error('Failed to delete technician:', error);
      }
    }
  };

  const filteredTechs = technicians.filter(tech =>
    tech.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tech.mobile.includes(searchTerm)
  );

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10">
      {/* 1. Header Area */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">View Technicians</h1>
          <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
            Total {filteredTechs.length} Staff
          </span>
        </div>
        <Button 
          onClick={() => { resetForm(); setIsModalOpen(true); }} 
          className="bg-blue-700 hover:bg-blue-800 h-8 text-[11px] font-extrabold shadow-lg px-6 uppercase tracking-wider"
        >
          <Plus className="h-4 w-4 mr-1" /> Create Technician
        </Button>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white p-3 border border-gray-200 shadow-xs flex items-end gap-3 rounded">
        <div className="flex-1">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Search By Name / Mobile</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Name, Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none transition-all h-8 font-semibold"
            />
          </div>
        </div>
      </div>

      {/* 3. Table Results */}
      <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full table-auto border-collapse text-[11px]">
            <thead className="bg-[#f8f9fa] sticky top-0 z-10 border-b border-gray-200 text-gray-600 uppercase">
              <tr className="divide-x divide-gray-200">
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Initials</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Name</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Mobile Info</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Age</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Join Date</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Status</th>
                <th className="px-3 py-2 text-center font-extrabold tracking-tight italic">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Loading Results...</span>
                  </td>
                </tr>
              ) : filteredTechs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-gray-400 font-bold uppercase italic">
                    No Technicians Found
                  </td>
                </tr>
              ) : filteredTechs.map((tech) => (
                <tr key={tech.id} className="hover:bg-gray-50/80 transition-colors divide-x divide-gray-100">
                  <td className="px-3 py-2.5">
                    <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold shadow-inner", tech.is_active ? "bg-emerald-500" : "bg-gray-400")}>
                      {tech.name.charAt(0).toUpperCase()}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-gray-800 uppercase">{tech.name}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-gray-600">{tech.mobile}</div>
                    {tech.alternative_mobile && <div className="text-[9px] font-bold text-gray-400 uppercase">Alt: {tech.alternative_mobile}</div>}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-gray-600">{tech.age || '---'}</td>
                  <td className="px-3 py-2.5 font-bold text-gray-600">{new Date(tech.created_at).toLocaleDateString('en-GB')}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 ring-inset ${
                      tech.is_active ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-gray-50 text-gray-700 ring-gray-600/20'
                    }`}>
                      {tech.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEdit(tech)} className="p-1.5 bg-gray-100 hover:bg-blue-100 rounded transition-all group">
                        <Edit2 className="h-3 w-3 text-gray-400 group-hover:text-blue-600" />
                      </button>
                      <button onClick={() => handleDelete(tech.id)} className="p-1.5 bg-gray-100 hover:bg-red-100 rounded transition-all group">
                        <Trash2 className="h-3 w-3 text-gray-400 group-hover:text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <Card className="relative w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden border-none animate-in fade-in zoom-in duration-300">
            <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-widest italic">{editingTech ? 'Edit Technician' : 'Add New Technician'}</h2>
                <p className="text-[9px] text-blue-100 font-semibold tracking-tighter mt-0.5">Please fill in all mandatory personnel details</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-extrabold text-gray-500 mb-1.5 block uppercase tracking-widest">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="ENTER FULL NAME"
                      className="pl-9 h-10 text-xs font-black border-gray-200 focus:border-blue-500 uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 mb-1.5 block uppercase tracking-widest">Mobile Number *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <Input
                        name="mobile"
                        required
                        value={formData.mobile}
                        onChange={handleInputChange}
                        placeholder="9999999999"
                        className="pl-9 h-10 text-xs font-black border-gray-200 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 mb-1.5 block uppercase tracking-widest">Age</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <Input
                        name="age"
                        type="number"
                        value={formData.age}
                        onChange={handleInputChange}
                        placeholder="00"
                        className="pl-9 h-10 text-xs font-black border-gray-200 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 mb-1.5 block uppercase tracking-widest">Alternative Number</label>
                  <div className="relative">
                    <Contact2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      name="alternative_mobile"
                      value={formData.alternative_mobile}
                      onChange={handleInputChange}
                      placeholder="ENTER SECONDARY NUMBER"
                      className="pl-9 h-10 text-xs font-black border-gray-200 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                  />
                  <label htmlFor="is_active" className="text-[10px] font-black text-gray-700 uppercase tracking-widest cursor-pointer select-none flex items-center gap-2">
                    Mark as Active / Available for assignment
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 h-10 text-[11px] font-black uppercase tracking-wider border-gray-300 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="flex-1 h-10 text-[11px] font-black uppercase tracking-wider bg-blue-700 hover:bg-blue-800 shadow-xl shadow-blue-100 transition-all active:scale-95"
                >
                  {submitting ? 'Saving...' : editingTech ? 'Update Personnel' : 'Register Technician'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Technicians;

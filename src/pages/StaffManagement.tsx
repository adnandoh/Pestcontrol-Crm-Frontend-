import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Key, 
  Edit2, 
  Trash2, 
  Shield, 
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  Button, 
  Input, 
  Badge, 
  Modal,
  PageLoading,
  ConfirmationModal
} from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { enhancedApiService } from '../services/api.enhanced';
import type { StaffUser } from '../types';
import { cn } from '../utils/cn';

const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    password: '',
    role: 'Staff' as 'Super Admin' | 'Staff',
    is_active: true
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await enhancedApiService.getStaff({ q: searchQuery });
      setStaff(response.results);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStaff();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedStaff) {
        // Only include password if it's not empty (resetting)
        const updateData: any = {
          name: formData.name,
          mobile: formData.mobile,
          is_active: formData.is_active,
          role: formData.role
        };
        await enhancedApiService.updateStaff(selectedStaff.id, updateData);
      } else {
        await enhancedApiService.createStaff(formData);
      }
      setIsModalOpen(false);
      fetchStaff();
    } catch (error: any) {
      console.error('Error saving staff:', error);
      const errorData = error.details || error.response?.data;
      const validationError = errorData?.mobile?.[0] || errorData?.name?.[0] || errorData?.password?.[0];
      const errorMessage = validationError || errorData?.error || errorData?.detail || error.message || 'FAILED TO SAVE STAFF MEMBER';
      alert(errorMessage.toUpperCase());
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !newPassword) return;
    try {
      await enhancedApiService.resetStaffPassword(selectedStaff.id, newPassword);
      setIsResetModalOpen(false);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      const errorData = error.details || error.response?.data;
      const errorMessage = errorData?.error || errorData?.detail || error.message || 'FAILED TO RESET PASSWORD';
      alert(errorMessage.toUpperCase());
    }
  };

  const handleDelete = async () => {
    if (!selectedStaff) return;
    try {
      await enhancedApiService.deleteStaff(selectedStaff.id);
      setIsDeleteModalOpen(false);
      fetchStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
    }
  };

  const openEditModal = (member: StaffUser) => {
    setSelectedStaff(member);
    setFormData({
      name: member.name,
      mobile: member.mobile,
      password: '',
      role: member.role_display,
      is_active: member.is_active
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const openResetModal = (member: StaffUser) => {
    setSelectedStaff(member);
    setShowResetPassword(false);
    setIsResetModalOpen(true);
  };

  if (loading && staff.length === 0) return <PageLoading />;

  if (!user?.is_superuser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="h-20 w-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center shadow-inner">
          <Shield className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Access Restricted</h2>
        <p className="text-sm text-gray-500 max-w-xs font-medium uppercase tracking-wider">
          Only Super Administrators can access the Staff Management module.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" />
            STAFF MANAGEMENT
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1 uppercase tracking-wider">
            Manage your team roles and access credentials
          </p>
        </div>
        <Button 
          onClick={() => {
            setSelectedStaff(null);
            setFormData({ name: '', mobile: '', password: '', role: 'Staff', is_active: true });
            setShowPassword(false);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          ADD NEW STAFF
        </Button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Members</p>
                <h3 className="text-3xl font-black text-gray-900">{staff.length}</h3>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-blue-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">Super Admins</p>
                <h3 className="text-3xl font-black text-gray-900">
                  {staff.filter(s => s.role_display === 'Super Admin').length}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-purple-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Active Now</p>
                <h3 className="text-3xl font-black text-gray-900">
                  {staff.filter(s => s.is_active).length}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table Card */}
      <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="SEARCH STAFF BY NAME OR MOBILE..."
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
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Member Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Mobile Number</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Date Joined</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-12 w-12 text-gray-200" />
                      <p className="text-gray-400 font-bold uppercase italic">No staff members found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-sm group-hover:scale-110 transition-transform">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{member.name}</p>
                          <p className="text-[10px] text-gray-500 font-bold tracking-widest">ID: #{member.id.toString().padStart(4, '0')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700 font-extrabold tracking-tighter">
                        <Smartphone className="h-3 w-3 text-blue-500" />
                        {member.mobile}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        className={cn(
                          "uppercase text-[9px] font-black border-none",
                          member.role_display === 'Super Admin' 
                            ? "bg-purple-100 text-purple-700" 
                            : "bg-blue-100 text-blue-700"
                        )}
                      >
                        {member.role_display === 'Super Admin' ? <ShieldCheck className="h-3 w-3 mr-1" /> : <Shield className="h-3 w-3 mr-1" />}
                        {member.role_display}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("h-1.5 w-1.5 rounded-full", member.is_active ? "bg-emerald-500 shadow-emerald-200" : "bg-red-500 shadow-red-200")} />
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", member.is_active ? "text-emerald-600" : "text-red-600")}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-gray-600 tracking-tight">
                      {new Date(member.date_joined).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openResetModal(member)}
                          className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50 rounded-lg"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openEditModal(member)}
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setSelectedStaff(member);
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

      {/* Create/Edit Modal */}
      <Modal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={selectedStaff ? "EDIT STAFF MEMBER" : "ADD NEW STAFF MEMBER"}
        size="md"
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4 p-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Full Name</label>
            <Input 
              required
              placeholder="ENTER STAFF NAME..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded-xl border-gray-200 uppercase text-xs font-bold tracking-tight"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mobile Number (Login ID)</label>
            <Input 
              required
              placeholder="ENTER 10-DIGIT MOBILE..."
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className="rounded-xl border-gray-200 font-black tracking-tighter"
              maxLength={10}
            />
          </div>
          
          {!selectedStaff && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Login Password</label>
              <div className="relative">
                <Input 
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="CREATE A SECURE PASSWORD..."
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="rounded-xl border-gray-200 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Role</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'Staff' })}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                  formData.role === 'Staff' 
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm" 
                    : "border-gray-100 hover:border-gray-200 text-gray-500"
                )}
              >
                <Shield className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Staff</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'Super Admin' })}
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                  formData.role === 'Super Admin' 
                    ? "border-purple-600 bg-purple-50 text-purple-700 shadow-sm" 
                    : "border-gray-100 hover:border-gray-200 text-gray-500"
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Super Admin</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Account Status</label>
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
              {selectedStaff ? 'Update Member' : 'Create Staff Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={isResetModalOpen}
        onOpenChange={setIsResetModalOpen}
        title="RESET STAFF PASSWORD"
        size="sm"
      >
        <form onSubmit={handleResetPassword} className="p-6 space-y-4 text-center">
          <div className="h-16 w-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-sm border border-amber-100">
            <Key className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
              RESET PASSWORD FOR {selectedStaff?.name}
            </h3>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-medium">
              Enter a new secure password for this user
            </p>
          </div>
          
          <div className="relative mt-4">
            <Input 
              required
              type={showResetPassword ? "text" : "password"}
              placeholder="NEW PASSWORD..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-xl border-gray-200 text-center pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowResetPassword(!showResetPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsResetModalOpen(false)} className="flex-1 uppercase text-[10px] font-black">CANCEL</Button>
            <Button type="submit" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-100 uppercase text-[10px] font-black">
              RESET NOW
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="DELETE STAFF MEMBER?"
        message={`ARE YOU SURE YOU WANT TO REMOVE ${selectedStaff?.name}? THIS ACTION WILL PERMANENTLY REVOKE THEIR CRM ACCESS.`}
        type="danger"
      />
    </div>
  );
};

export default StaffManagement;

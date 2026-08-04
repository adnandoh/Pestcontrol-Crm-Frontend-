import React, { useEffect, useState } from 'react';
import CopyablePhone from '../components/crm/CopyablePhone';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Key,
  Pencil,
  ShieldCheck,
  Smartphone,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { PageLoading } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import type { StaffSummary, StaffUser } from '../types';
import { cn } from '../utils/cn';
import { roleBadgeClass, STAFF_ROLE_OPTIONS } from '../constants/staffRoles';

const PAGE_SIZE = 10;

const EMPTY_SUMMARY: StaffSummary = {
  total: 0,
  active: 0,
  super_admins: 0,
  technicians: 0,
  blog_users: 0,
};

const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<StaffSummary>(EMPTY_SUMMARY);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await enhancedApiService.getStaff({
        search: searchQuery || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setStaff(response.results);
      setTotalCount(response.count ?? 0);
      setSummary(response.summary ?? EMPTY_SUMMARY);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchStaff, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, roleFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, totalCount);

  if (loading && staff.length === 0) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-[#1e5a9e]" />
            Staff management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage team logins and access roles (Super Admin only)
          </p>
        </div>
        <Link to="/staff/add">
          <Button className="bg-[#2d8a2f] hover:bg-[#246b27] text-white gap-2 shadow-sm">
            <UserPlus className="h-4 w-4" />
            Add employee
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Total</p>
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
        </Card>
        <Card className="p-4 border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{summary.active}</p>
        </Card>
        <Card className="p-4 border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Super admins</p>
          <p className="text-2xl font-bold text-purple-600">{summary.super_admins}</p>
        </Card>
        <Card className="p-4 border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Technicians</p>
          <p className="text-2xl font-bold text-amber-600">{summary.technicians}</p>
        </Card>
        <Card className="p-4 border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Blog users</p>
          <p className="text-2xl font-bold text-[#2d8a2f]">{summary.blog_users}</p>
        </Card>
      </div>

      <Card className="border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/80 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm min-w-[160px]"
            >
              <option value="all">All roles</option>
              {STAFF_ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500 whitespace-nowrap">
              Showing {pageStart}-{pageEnd} of {totalCount}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Mobile</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-gray-500">
                    <Users className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    No employees found
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/80">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#1e5a9e] text-white flex items-center justify-center text-sm font-bold shrink-0">
                          {(member.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{member.name || '—'}</p>
                          <p className="text-xs text-gray-400">
                            ID #{String(member.id).padStart(4, '0')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                        <Smartphone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <CopyablePhone phone={member.mobile} className="text-sm text-gray-700" />
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border w-fit',
                            roleBadgeClass(member.role_display),
                          )}
                        >
                          {member.role_display === 'Super Admin' && (
                            <ShieldCheck className="h-3 w-3" />
                          )}
                          {member.role_display}
                        </span>
                        {member.role_display === 'Technician' && (
                          <span
                            className={cn(
                              'text-[10px] font-semibold uppercase tracking-wide',
                              member.partner_app_ready ? 'text-emerald-600' : 'text-amber-600',
                            )}
                          >
                            {member.partner_app_ready ? 'App linked' : 'App not linked'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-medium',
                          member.is_active ? 'text-emerald-600' : 'text-red-600',
                        )}
                      >
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            member.is_active ? 'bg-emerald-500' : 'bg-red-500',
                          )}
                        />
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {new Date(member.date_joined).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/staff/edit/${member.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-[#1e5a9e]"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link to={`/staff/edit/${member.id}#password`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-amber-600"
                            title="Reset password"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-4 py-3">
            <p className="text-xs font-medium text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0 border-gray-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const pageNumber = start + i;
                  if (pageNumber > totalPages) return null;
                  return (
                    <Button
                      key={pageNumber}
                      variant={page === pageNumber ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setPage(pageNumber)}
                      className={cn(
                        'h-8 w-8 p-0 text-xs font-semibold',
                        page === pageNumber ? 'bg-[#1e5a9e] text-white hover:bg-[#174a82]' : '',
                      )}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8 p-0 border-gray-200"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

    </div>
  );
};

export default StaffManagement;

import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Calendar, 
  User, 
  Activity, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  Button, 
  Input, 
  Badge, 
  PageLoading,
  Select
} from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { enhancedApiService } from '../services/api.enhanced';
import { ActivityLog } from '../types';
import { cn } from '../utils/cn';

const ActivityLogs: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        search: searchQuery,
      };
      if (filterAction) params.action = filterAction;
      
      const response = await enhancedApiService.getActivityLogs(params);
      setLogs(response.results);
      setTotalPages(Math.ceil(response.count / 10));
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, page, filterAction]);

  const getActionColor = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('create')) return 'bg-emerald-100 text-emerald-700';
    if (a.includes('update')) return 'bg-blue-100 text-blue-700';
    if (a.includes('delete') || a.includes('cancel')) return 'bg-red-100 text-red-700';
    if (a.includes('reset')) return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading && logs.length === 0) return <PageLoading />;

  if (!user?.is_superuser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="h-20 w-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-inner">
          <History className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Access Restricted</h2>
        <p className="text-sm text-gray-500 max-w-xs font-medium uppercase tracking-wider">
          Only Super Administrators can access the system activity logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <History className="h-7 w-7 text-indigo-600" />
            ACTIVITY LOGS
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1 uppercase tracking-wider">
            Audit trail of all actions performed by your staff members
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => fetchLogs()}
            className="border-gray-200 text-gray-600 hover:bg-gray-50 uppercase text-[10px] font-black"
          >
            <Clock className="h-4 w-4 mr-2" />
            Refresh Feed
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[250px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="SEARCH LOGS BY ACTION OR STAFF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-200 rounded-xl uppercase text-xs font-bold tracking-tight h-10"
              />
            </div>
            
            <div className="w-full md:w-48">
               <Select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="h-10 rounded-xl border-gray-200 uppercase text-[10px] font-black tracking-widest"
              >
                <option value="">ALL ACTIONS</option>
                <option value="Created Booking">BOOKINGS</option>
                <option value="Created Inquiry">INQUIRIES</option>
                <option value="Created Complaint">COMPLAINTS</option>
                <option value="Updated Booking">UPDATES</option>
                <option value="Reset password">PASSWORD RESETS</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-none shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Staff Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Action Performed</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Ref ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Additional Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-bold uppercase italic">
                    <div className="flex flex-col items-center gap-2">
                       <FileText className="h-12 w-12 text-gray-200" />
                       No activity logs found matching your filters
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-indigo-50/20 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600 tracking-tight">
                        <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                        {log.created_at}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-black text-xs uppercase shadow-inner border border-gray-200">
                          {log.staff_name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <span className="font-black text-gray-900 uppercase tracking-tight text-xs">{log.staff_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={cn("uppercase text-[9px] font-black px-2.5 py-1 border-none", getActionColor(log.action))}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {log.booking_id ? (
                        <div className="flex items-center gap-1.5 text-blue-600 font-black text-xs group/link">
                          <span className="tracking-tighter bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{log.booking_id}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </div>
                      ) : (
                        <span className="text-gray-300 text-[10px] uppercase font-bold italic tracking-widest">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[11px] text-gray-500 font-medium tracking-tight truncate max-w-xs uppercase">
                        {log.details || '-'}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              Showing Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="h-8 w-8 p-0 rounded-lg border-gray-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const p = i + 1;
                  return (
                    <Button
                      key={p}
                      variant={page === p ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setPage(p)}
                      className={cn("h-8 w-8 p-0 rounded-lg text-[10px] font-black", page === p ? "bg-indigo-600" : "")}
                    >
                      {p}
                    </Button>
                  );
                })}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="h-8 w-8 p-0 rounded-lg border-gray-200"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {/* Legend Footer */}
      <div className="flex items-center gap-6 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 shadow-inner">
        <div className="flex items-center gap-2">
           <AlertCircle className="h-4 w-4 text-gray-400" />
           <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Activity Legend:</span>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-[9px] font-bold text-gray-600 uppercase">Creation</span></div>
           <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-[9px] font-bold text-gray-600 uppercase">Update</span></div>
           <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500" /><span className="text-[9px] font-bold text-gray-600 uppercase">System / Security</span></div>
           <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-500" /><span className="text-[9px] font-bold text-gray-600 uppercase">Deletion / Cancellation</span></div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Eye, Search } from 'lucide-react';
import {
  Button,
  PageLoading,
  Pagination
} from '../components/ui';
import { ClientForm } from '../components/forms';

import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { Client, PaginatedResponse } from '../types';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
    current: 1,
    pageSize: 10,
    totalPages: 0
  });

  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
  const [showClientForm, setShowClientForm] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load clients
  const loadClients = async (page = 1, currentSearch = searchInput) => {
    try {
      setLoading(true);

      const params: any = {
        page,
        page_size: pagination.pageSize,
        ordering: '-created_at'
      };

      if (currentSearch.trim()) {
        params.search = currentSearch.trim();
      }

      const response: PaginatedResponse<Client> = await enhancedApiService.getClients(params);

      setClients(response.results);
      setPagination(prev => ({
        ...prev,
        count: response.count,
        next: response.next,
        previous: response.previous,
        current: page,
        totalPages: Math.max(1, Math.ceil(response.count / prev.pageSize))
      }));
    } catch (err: any) {
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input change with debouncing
  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      loadClients(1, value);
    }, 500);
    
    setSearchTimeout(newTimeout);
  };

  const handleSearchSubmit = () => {
    loadClients(1, searchInput);
  };

  // Initial load
  useEffect(() => {
    loadClients();
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, []);



  // Handle pagination
  const handlePageChange = (page: number) => {
    loadClients(page);
  };

  // Handle page size change
  const handlePageSizeChange = (pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize }));
    loadClients(1);
  };

  // Handle add client
  const handleAddClient = () => {
    setSelectedClient(undefined);
    setShowClientForm(true);
  };

  // Handle edit client
  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowClientForm(true);
  };

  // Handle client form save
  const handleClientSave = (_client: Client) => {
    setShowClientForm(false);
    setSelectedClient(undefined);
    loadClients(pagination.current);
  };

  // Handle client form cancel
  const handleClientCancel = () => {
    setShowClientForm(false);
    setSelectedClient(undefined);
  };

  if (loading && clients.length === 0) {
    return <PageLoading text="Loading clients..." />;
  }

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10">
      {/* 1. Header Area */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">View Clients</h1>
          <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
            Total {pagination.count} Profiles
          </span>
        </div>
        <Button 
          onClick={handleAddClient} 
          className="bg-blue-700 hover:bg-blue-800 h-8 text-[11px] font-extrabold shadow-lg px-6 uppercase tracking-wider"
        >
          <Plus className="h-4 w-4 mr-1" /> Create Client
        </Button>
      </div>

      {/* 2. Filter Bar - Simple implementation for now as only pagination/search might be relevant */}
      <div className="bg-white p-3 border border-gray-200 shadow-xs flex items-end gap-3 rounded">
        <div className="flex-1">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Search Directory</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Name, Phone, Email..."
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
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
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Client Name</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Contact Data</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Service Area</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Status</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Created</th>
                <th className="px-3 py-2 text-center font-extrabold tracking-tight italic">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                   <td colSpan={6} className="py-20 text-center">
                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                     <span className="text-[10px] font-bold text-gray-400 uppercase">Loading Results...</span>
                   </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                   <td colSpan={6} className="py-20 text-center text-gray-400 font-bold uppercase italic text-sm tracking-tight opacity-70">No Clients Found</td>
                </tr>
              ) : clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50/80 transition-colors divide-x divide-gray-100">
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-gray-800 uppercase leading-tight truncate max-w-[200px]">{client.full_name}</div>
                    {client.notes && <div className="text-[9px] font-bold text-gray-400 italic line-clamp-1">{client.notes}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-gray-600">{client.mobile}</div>
                    {client.email && <div className="text-[9px] font-bold text-gray-400 lowercase">{client.email}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-gray-600 uppercase italic">{client.city || '---'}</div>
                    {client.address && <div className="text-[9px] font-bold text-gray-400 uppercase line-clamp-1 truncate max-w-[200px]">{client.address}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 ring-inset", 
                      client.is_active ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-gray-50 text-gray-700 ring-gray-600/20'
                    )}>
                      {client.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-gray-500 italic uppercase tracking-tighter">
                    {new Date(client.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => navigate(`/clients/${client.id}`)} className="p-1.5 bg-gray-100 hover:bg-blue-100 rounded transition-all group" title="View Profile">
                        <Eye className="h-3 w-3 text-gray-400 group-hover:text-blue-600" />
                      </button>
                      <button onClick={() => handleEditClient(client)} className="p-1.5 bg-gray-100 hover:bg-amber-100 rounded transition-all group" title="Edit Client">
                        <Edit className="h-3 w-3 text-gray-400 group-hover:text-amber-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.current}
        totalPages={Math.max(1, pagination.totalPages)}
        totalItems={pagination.count}
        itemsPerPage={pagination.pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        showPageSizeSelector={false}
        showGoToPage={true}
      />

      {/* Client Form Modal */}
      {showClientForm && (
        <ClientForm
          client={selectedClient}
          onSave={handleClientSave}
          onCancel={handleClientCancel}
          isOpen={showClientForm}
        />
      )}
    </div>
  );
};

export default Clients;
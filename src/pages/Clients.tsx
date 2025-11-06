import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Eye } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  PageLoading,
  Pagination
} from '../components/ui';
import { ClientForm } from '../components/forms';

import { enhancedApiService } from '../services/api.enhanced';
import type { Client, PaginatedResponse } from '../types';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Load clients
  const loadClients = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        page_size: pagination.pageSize,
        ordering: '-created_at'
      };

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
      setError(err.message || 'Failed to load clients');
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadClients();
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
  const handleClientSave = (client: Client) => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">

        <div className="flex items-center space-x-3">
          <Button size="sm" onClick={handleAddClient}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>



      {/* Error Message */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="text-red-600 text-center">{error}</div>
          </CardContent>
        </Card>
      )}

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Clients ({pagination.count})
            </span>
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary-600" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No clients found</p>
              <Button className="mt-4" size="md" onClick={handleAddClient}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Client
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {client.full_name}
                          </div>
                          {client.notes && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {client.notes}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{client.mobile}</div>
                        {client.email && (
                          <div className="text-sm text-gray-500">{client.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{client.city || '-'}</div>
                        {client.address && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {client.address}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={client.is_active ? 'default' : 'secondary'}>
                          {client.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(client.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/clients/${client.id}`)}
                            title="View Client Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClient(client)}
                            title="Edit Client"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
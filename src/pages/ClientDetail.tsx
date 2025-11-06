import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  FileText,
  Plus
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  PageLoading
} from '../components/ui';
import { ClientForm } from '../components/forms';
import { enhancedApiService } from '../services/api.enhanced';
import type { Client } from '../types';

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Load client details
  const loadClient = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const clientData = await enhancedApiService.getClient(parseInt(id));
      setClient(clientData);
    } catch (err: any) {
      setError(err.message || 'Failed to load client details');
      console.error('Error loading client:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [id]);

  // Handle delete client
  const handleDeleteClient = async () => {
    if (!client || !confirm('Are you sure you want to deactivate this client?')) return;

    try {
      await enhancedApiService.deleteClient(client.id);
      navigate('/clients');
    } catch (err: any) {
      alert('Failed to delete client: ' + err.message);
    }
  };

  // Handle edit client
  const handleEditClient = () => {
    setShowEditForm(true);
  };

  // Handle client form save
  const handleClientSave = (updatedClient: Client) => {
    setClient(updatedClient);
    setShowEditForm(false);
  };

  // Handle client form cancel
  const handleClientCancel = () => {
    setShowEditForm(false);
  };

  if (loading) {
    return <PageLoading text="Loading client details..." />;
  }

  if (error || !client) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-red-600 mb-4">
              {error || 'Client not found'}
            </div>
            <Button onClick={() => navigate('/clients')}>
              Return to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/clients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{client.full_name}</h1>
            <p className="text-gray-600">Client Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleEditClient}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Client
          </Button>
          <Button
            variant="outline"
            onClick={handleDeleteClient}
            className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Deactivate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-900 font-medium">{client.full_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={client.is_active ? 'default' : 'secondary'}>
                      {client.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Mobile Number</label>
                  <div className="flex items-center mt-1">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-gray-900">{client.mobile}</p>
                    <Button variant="ghost" size="sm" className="ml-2">
                      <a href={`tel:${client.mobile}`} className="text-primary-600">
                        Call
                      </a>
                    </Button>
                  </div>
                </div>
                {client.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email Address</label>
                    <div className="flex items-center mt-1">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <p className="text-gray-900">{client.email}</p>
                      <Button variant="ghost" size="sm" className="ml-2">
                        <a href={`mailto:${client.email}`} className="text-primary-600">
                          Email
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          {(client.city || client.address) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.city && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">City</label>
                    <p className="text-gray-900">{client.city}</p>
                  </div>
                )}
                {client.address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Full Address</label>
                    <p className="text-gray-900">{client.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900 whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Create Job Card
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                View Job History
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Service
              </Button>
            </CardContent>
          </Card>

          {/* Client Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Client Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Job Cards</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Services</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Last Service</span>
                <span className="text-sm text-gray-500">Never</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Paid</span>
                <span className="font-semibold text-green-600">₹0</span>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Client ID</label>
                <p className="text-gray-900 font-mono">#{client.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created Date</label>
                <p className="text-gray-900">
                  {new Date(client.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-gray-900">
                  {new Date(client.updated_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Client Form Modal */}
      <ClientForm
        client={client}
        isOpen={showEditForm}
        onSave={handleClientSave}
        onCancel={handleClientCancel}
      />
    </div>
  );
};

export default ClientDetail;
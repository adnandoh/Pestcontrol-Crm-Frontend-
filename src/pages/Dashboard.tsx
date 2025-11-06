import React, { useEffect, useState } from 'react';
import {
  Users,
  MessageSquare,
  ClipboardList,
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, Button, PageLoading } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import type { DashboardStatisticsResponse } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatisticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const dashboardStats = await enhancedApiService.getDashboardStatistics();
      setStats(dashboardStats);
    } catch (error: any) {
      setError('Failed to load dashboard statistics');
      console.error('Dashboard error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchStats();
  };

  if (isLoading && !stats) {
    return <PageLoading text="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Overview of your pest control business</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600 mr-2" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Inquiries Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Total Inquiries</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.total_inquiries || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Cards Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Total Job Cards</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.total_job_cards || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.total_clients || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Renewals Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Renewals</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.renewals || 0}
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
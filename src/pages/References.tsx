import React, { useEffect, useState } from 'react';
import { enhancedApiService } from '../services/api.enhanced';
import { FileText, Download, TrendingUp, Users, BarChart3, ArrowUpDown } from 'lucide-react';

interface ReferenceData {
  reference_name: string;
  reference_count: number;
}

interface ReferenceReport {
  report_data: ReferenceData[];
  generated_at: string;
  total_entries: number;
}

const References: React.FC = () => {
  const [referenceReport, setReferenceReport] = useState<ReferenceReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<'name' | 'count'>('count');

  useEffect(() => {
    fetchReferenceReport();
  }, []);

  const fetchReferenceReport = async () => {
    try {
      setReportLoading(true);
      setReportError(null);
      const data = await enhancedApiService.getReferenceReport();
      
      // Transform the data to match our interface
      const transformedData: ReferenceReport = {
        report_data: Array.isArray(data) ? data : [],
        generated_at: new Date().toISOString(),
        total_entries: Array.isArray(data) ? data.length : 0
      };
      
      setReferenceReport(transformedData);
    } catch (err: any) {
      setReportError(err.message || 'Failed to fetch reference report');
      console.error('Error fetching reference report:', err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleSort = (type: 'name' | 'count') => {
    if (sortBy === type) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortOrder(type === 'count' ? 'desc' : 'asc');
    }
  };

  const getSortedData = () => {
    if (!referenceReport?.report_data) return [];
    
    return [...referenceReport.report_data].sort((a, b) => {
      if (sortBy === 'count') {
        return sortOrder === 'desc' 
          ? b.reference_count - a.reference_count
          : a.reference_count - b.reference_count;
      } else {
        return sortOrder === 'asc'
          ? a.reference_name.localeCompare(b.reference_name)
          : b.reference_name.localeCompare(a.reference_name);
      }
    });
  };

  const getStatistics = () => {
    if (!referenceReport?.report_data) return { total: 0, active: 0, totalReferences: 0 };
    
    const data = referenceReport.report_data;
    const totalReferences = data.reduce((sum, item) => sum + item.reference_count, 0);
    const activeReferences = data.filter(item => item.reference_count > 0).length;
    
    return {
      total: data.length,
      active: activeReferences,
      totalReferences
    };
  };

  const stats = getStatistics();
  const sortedData = getSortedData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">References</h1>
        <button
          onClick={fetchReferenceReport}
          disabled={reportLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="h-4 w-4" />
          {reportLoading ? 'Loading...' : 'Refresh Report'}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Reference Types</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active References</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total References</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalReferences}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reference Report Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Reference Report</h2>
            </div>
          </div>
        </div>

        <div className="p-6">
          {reportError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{reportError}</p>
              <button
                onClick={fetchReferenceReport}
                className="mt-2 text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          ) : reportLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading reference report...</span>
            </div>
          ) : sortedData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Reference Name
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('count')}
                    >
                      <div className="flex items-center gap-2">
                        Count
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedData.map((reference, index) => {
                    const percentage = stats.totalReferences > 0 
                      ? ((reference.reference_count / stats.totalReferences) * 100).toFixed(1)
                      : '0.0';
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900 capitalize">
                              {reference.reference_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {reference.reference_count}
                            </span>
                            {reference.reference_count > 0 && (
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min((reference.reference_count / Math.max(...sortedData.map(r => r.reference_count))) * 100, 100)}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            reference.reference_count > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {reference.reference_count > 0 ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No reference data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default References;
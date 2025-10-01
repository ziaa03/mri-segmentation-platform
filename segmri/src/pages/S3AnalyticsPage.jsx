import React, { useState, useEffect } from 'react';

const S3AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('storage');

  // Mock S3 data
  const s3Data = {
    buckets: [
      {
        name: 'production-backups',
        region: 'us-east-1',
        totalObjects: 12543,
        totalSize: '2.4 TB',
        lastModified: '2024-01-15',
        storageClass: 'Standard-IA',
        cost: '$45.23'
      },
      {
        name: 'web-assets',
        region: 'us-west-2',
        totalObjects: 8921,
        totalSize: '156.7 GB',
        lastModified: '2024-01-20',
        storageClass: 'Standard',
        cost: '$12.67'
      },
    ],
    metrics: {
      storage: [45, 52, 48, 61, 55, 58, 62, 59, 54, 49, 52, 48],
      requests: [1200, 1450, 1320, 1580, 1420, 1650, 1720, 1680, 1520, 1480, 1420, 1380],
      transfer: [45, 52, 38, 62, 55, 68, 72, 65, 58, 52, 48, 42]
    },
    summary: {
      totalBuckets: 24,
      totalStorage: '20.2 TB',
      totalObjects: '195K',
      monthlyCost: '$245.89',
      averageObjectSize: '105.6 KB'
    }
  };

  const getMetricColor = (metric) => {
    const colors = {
      storage: 'bg-blue-500',
      requests: 'bg-green-500',
      transfer: 'bg-purple-500'
    };
    return colors[metric] || 'bg-blue-500';
  };

  const getMetricLabel = (metric) => {
    const labels = {
      storage: 'Storage Usage',
      requests: 'Total Requests',
      transfer: 'Data Transfer'
    };
    return labels[metric] || 'Storage Usage';
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">S3 Analytics</h1>
            <p className="text-gray-600">Monitor and analyze Amazon S3 storage and performance metrics</p>
          </div>
          <div className="flex space-x-4">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="storage">Storage Metrics</option>
              <option value="requests">Request Analytics</option>
              <option value="transfer">Data Transfer</option>
            </select>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Buckets</p>
                <p className="text-2xl font-bold text-gray-800">{s3Data.summary.totalBuckets}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Storage</p>
                <p className="text-2xl font-bold text-gray-800">{s3Data.summary.totalStorage}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Objects</p>
                <p className="text-2xl font-bold text-gray-800">{s3Data.summary.totalObjects}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Cost</p>
                <p className="text-2xl font-bold text-orange-500">{s3Data.summary.monthlyCost}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800">{getMetricLabel(selectedMetric)}</h2>
            <div className="text-sm text-gray-500">
              Last {timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : '30 days'}
            </div>
          </div>
          <div className="h-64 flex items-end space-x-2">
            {s3Data.metrics[selectedMetric].map((value, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t ${getMetricColor(selectedMetric)} transition-all duration-300`}
                  style={{ 
                    height: selectedMetric === 'storage' ? `${value}%` : 
                           selectedMetric === 'requests' ? `${(value / 2000) * 100}%` : 
                           `${value}%` 
                  }}
                ></div>
                <div className="text-xs text-gray-500 mt-2">{index}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Buckets Table */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">S3 Buckets</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bucket Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Objects
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Storage Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {s3Data.buckets.map((bucket) => (
                  <tr key={bucket.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{bucket.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bucket.region}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(bucket.totalObjects)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {bucket.totalSize}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bucket.storageClass === 'Standard' ? 'bg-green-100 text-green-800' :
                        bucket.storageClass === 'Standard-IA' ? 'bg-blue-100 text-blue-800' :
                        bucket.storageClass === 'Intelligent-Tiering' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {bucket.storageClass}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                      {bucket.cost}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {bucket.lastModified}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Statistics */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Request Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">GET Requests</span>
                <span className="text-sm font-medium text-gray-900">1,245,678</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">PUT Requests</span>
                <span className="text-sm font-medium text-gray-900">234,567</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">DELETE Requests</span>
                <span className="text-sm font-medium text-gray-900">12,345</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="text-sm font-medium text-green-600">99.8%</span>
              </div>
            </div>
          </div>

          {/* Cost Analysis */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Cost Analysis</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Storage Cost</span>
                <span className="text-sm font-medium text-gray-900">$156.78</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Request Cost</span>
                <span className="text-sm font-medium text-gray-900">$45.23</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Data Transfer</span>
                <span className="text-sm font-medium text-gray-900">$43.88</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-sm font-bold text-orange-600">$245.89</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default S3AnalyticsPage;
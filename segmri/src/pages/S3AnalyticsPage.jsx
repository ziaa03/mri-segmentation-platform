import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';

const S3AnalyticsPage = () => {
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState('');
  const [metrics, setMetrics] = useState({
    bucketSize: '0 GB',
    objectCount: '0',
    allRequests: '0',
    getRequests: '0',
    putRequests: '0'
  });
  const [storageData, setStorageData] = useState([]);
  const [requestData, setRequestData] = useState([]);
  const [timeRange, setTimeRange] = useState('7d');

  // Mock buckets data
  const mockBuckets = [
    'production-assets',
    'development-backups',
    'user-uploads',
    'logs-archive',
    'static-website'
  ];

  // Mock storage metrics over time
  const generateStorageData = () => {
    const data = [];
    const baseDate = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        bucketSize: Math.random() * 500 + 100,
        objectCount: Math.floor(Math.random() * 100000) + 50000
      });
    }
    return data;
  };

  // Mock request metrics over time
  const generateRequestData = () => {
    const data = [];
    const baseDate = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        allRequests: Math.floor(Math.random() * 10000) + 5000,
        getRequests: Math.floor(Math.random() * 8000) + 4000,
        putRequests: Math.floor(Math.random() * 2000) + 500
      });
    }
    return data;
  };

  // Initialize data
  useEffect(() => {
    setBuckets(mockBuckets);
    setSelectedBucket(mockBuckets[0]);
    setMetrics({
      bucketSize: '245.7 GB',
      objectCount: '124,567',
      allRequests: '89,432',
      getRequests: '78,945',
      putRequests: '8,123'
    });
    setStorageData(generateStorageData());
    setRequestData(generateRequestData());
  }, []);

  // Handle bucket selection
  const handleBucketChange = (bucket) => {
    setSelectedBucket(bucket);
    setMetrics({
      bucketSize: `${(Math.random() * 500 + 50).toFixed(1)} GB`,
      objectCount: Math.floor(Math.random() * 200000).toLocaleString(),
      allRequests: Math.floor(Math.random() * 100000).toLocaleString(),
      getRequests: Math.floor(Math.random() * 90000).toLocaleString(),
      putRequests: Math.floor(Math.random() * 15000).toLocaleString()
    });
  };

  // Metric card component
  const MetricCard = ({ title, value, subtitle, color }) => {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="mb-2">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`h-1 w-12 rounded-full ${color}`}></div>
      </div>
    );
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <span className="font-medium">{entry.value.toLocaleString()}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">S3 Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor your S3 bucket performance and usage metrics</p>
        </div>

        {/* Bucket Selector and Controls */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex-1 w-full lg:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                S3 Bucket
              </label>
              <select
                value={selectedBucket}
                onChange={(e) => handleBucketChange(e.target.value)}
                className="w-full lg:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              >
                {buckets.map((bucket) => (
                  <option key={bucket} value={bucket}>
                    {bucket}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Time Range:</label>
              <div className="flex space-x-1">
                {['1d', '7d', '30d', '90d'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-200 ${
                      timeRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <MetricCard
            title="Bucket Size"
            value={metrics.bucketSize}
            subtitle="Total storage"
            color="bg-blue-500"
          />
          <MetricCard
            title="Object Count"
            value={metrics.objectCount}
            subtitle="Total objects"
            color="bg-green-500"
          />
          <MetricCard
            title="All Requests"
            value={metrics.allRequests}
            subtitle="Total requests"
            color="bg-purple-500"
          />
          <MetricCard
            title="GET Requests"
            value={metrics.getRequests}
            subtitle="Read operations"
            color="bg-cyan-500"
          />
          <MetricCard
            title="PUT Requests"
            value={metrics.putRequests}
            subtitle="Write operations"
            color="bg-orange-500"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {/* Storage Metrics Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Storage Metrics</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Bucket Size (GB)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Object Count</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={storageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="bucketSize"
                  name="Bucket Size (GB)"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="objectCount"
                  name="Object Count"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Request Metrics Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Request Metrics</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span>All Requests</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                  <span>GET Requests</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>PUT Requests</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={requestData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="allRequests"
                  name="All Requests"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="getRequests"
                  name="GET Requests"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="putRequests"
                  name="PUT Requests"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Bucket Info */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Current Bucket</h3>
              <p className="text-gray-600 mt-1">{selectedBucket}</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default S3AnalyticsPage;
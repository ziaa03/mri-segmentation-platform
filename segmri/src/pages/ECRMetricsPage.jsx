// File: src/pages/ECRMetricsPage.jsx
import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../api/AxiosInstance';

const ECRMetricsPage = () => {
  const [metrics, setMetrics] = useState({
    repositorySize: [],
    imageCount: [],
    backendRepositorySize: [],
    backendImageCount: [],
    frontendRepositorySize: [],
    frontendImageCount: []
  });
  const [error, setError] = useState(null);

  // Helper: format timestamp + values
  const formatMetrics = (timestamps, values, unit = '') =>
    timestamps.map((t, i) => {
      const rawValue = parseFloat(values[i]);

      const fullDateTime = new Date(t).toLocaleString('en-MY', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      const timeOnly = new Date(t).toLocaleTimeString('en-MY', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      let displayValue;
      if (unit === 'Bytes' && rawValue > 1_000_000_000) {
        displayValue = (rawValue / 1_000_000_000).toFixed(2) + ' GB';
      } else if (unit === 'Bytes' && rawValue > 1_000_000) {
        displayValue = (rawValue / 1_000_000).toFixed(2) + ' MB';
      } else {
        displayValue = `${rawValue.toFixed(2)} ${unit}`;
      }

      return {
        timestamp: timeOnly,
        value: rawValue,
        displayValue,
        fullDateTime
      };
    });



  // Fetch all metrics
  const fetchEcrMetrics = async () => {
    try {
      setError(null);

      const [
        repoSizeRes,
        imgCountRes,
        backendRepoSizeRes,
        backendImgCountRes,
        frontendRepoSizeRes,
        frontendImgCountRes
      ] = await Promise.all([
        api.get('/ecr/repository-size'),
        api.get('/ecr/image-count'),
        api.get('/ecr/backend/repository-size'),
        api.get('/ecr/backend/image-count'),
        api.get('/ecr/frontend/repository-size'),
        api.get('/ecr/frontend/image-count')
      ]);

      setMetrics({
        repositorySize: formatMetrics(repoSizeRes.data.timestamps, repoSizeRes.data.values, 'Bytes'),
        imageCount: formatMetrics(imgCountRes.data.timestamps, imgCountRes.data.values, 'Images'),
        backendRepositorySize: formatMetrics(backendRepoSizeRes.data.timestamps, backendRepoSizeRes.data.values, 'Bytes'),
        backendImageCount: formatMetrics(backendImgCountRes.data.timestamps, backendImgCountRes.data.values, 'Images'),
        frontendRepositorySize: formatMetrics(frontendRepoSizeRes.data.timestamps, frontendRepoSizeRes.data.values, 'Bytes'),
        frontendImageCount: formatMetrics(frontendImgCountRes.data.timestamps, frontendImgCountRes.data.values, 'Images')
      });
    } catch (err) {
      console.error(err);
      setError('Failed to fetch ECR metrics from CloudWatch API');
    } 
  };

  useEffect(() => {
    fetchEcrMetrics();
  }, []);

  // Chart component
  const MetricChart = ({ title, data, color = '#8884d8' }) => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            No data fetched
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' GB';
                  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + ' MB';
                  return value.toFixed(0);
                }}
              />
              <Tooltip
                formatter={(value, name, props) => [props.payload.displayValue, title]}
                labelFormatter={(label, payload) =>
                  `Time: ${payload?.[0]?.payload?.fullDateTime || label}`
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center">
        <p className="text-red-600 font-semibold text-lg mb-3">Error</p>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchEcrMetrics}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-left mb-10">
          <h1 className="text-3xl font-bold text-gray-900">ECR Metrics</h1>
          <p className="mt-2 text-gray-600">Monitoring repository storage and image counts</p>
        </div>

        {/* Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricChart title="ECR Repository Size (Legacy)" data={metrics.repositorySize} color="#0088fe" />
          <MetricChart title="ECR Image Count (Legacy)" data={metrics.imageCount} color="#ff7300" />
          <MetricChart title="Backend Repository Size" data={metrics.backendRepositorySize} color="#82ca9d" />
          <MetricChart title="Backend Image Count" data={metrics.backendImageCount} color="#8884d8" />
          <MetricChart title="Frontend Repository Size" data={metrics.frontendRepositorySize} color="#ffc658" />
          <MetricChart title="Frontend Image Count" data={metrics.frontendImageCount} color="#ff8042" />
        </div>

        {/* Refresh Button */}
        <div className="mt-10 text-center">
          <button
            onClick={fetchEcrMetrics}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Refresh Metrics
          </button>
        </div>
      </div>
    </div>
  );
};

export default ECRMetricsPage;
// cpu page with no charts, only tables to show fetched data

import React, { useState, useEffect } from 'react';
import api from "../api/AxiosInstance";

const CpuDebugPage = () => {
  const [metrics, setMetrics] = useState({
    cpuUtilization: [],
    networkIn: [],
    networkOut: [],
    diskRead: [],
    diskWrite: []
  });
  const [error, setError] = useState(null);

  // Fetch metrics from backend endpoints
  const fetchCloudWatchMetrics = async () => {
    try {
      setError(null);

      // Parallel fetch all metrics from backend
      const [
        cpuRes,
        netInRes,
        netOutRes,
        diskReadRes,
        diskWriteRes
      ] = await Promise.all([
        api.get('/metrics/cpu-utilization'),
        api.get('/metrics/network-in'),
        api.get('/metrics/network-out'),
        api.get('/metrics/disk-read'),
        api.get('/metrics/disk-write')
      ]);

      // Helper function to format backend data into timestamp/value pairs
      const formatMetrics = (timestamps, values, unit = '') =>
        timestamps.map((t, i) => ({
          timestamp: t,
          value: `${values[i]}${unit}`
        }));

      setMetrics({
        cpuUtilization: formatMetrics(cpuRes.data.timestamps, cpuRes.data.values, '%'),
        networkIn: formatMetrics(netInRes.data.timestamps, netInRes.data.values, ' MB/s'),
        networkOut: formatMetrics(netOutRes.data.timestamps, netOutRes.data.values, ' MB/s'),
        diskRead: formatMetrics(diskReadRes.data.timestamps, diskReadRes.data.values, ' IOPS'),
        diskWrite: formatMetrics(diskWriteRes.data.timestamps, diskWriteRes.data.values, ' IOPS')
      });

    } catch (err) {
      console.error(err);
      setError('Failed to fetch metrics from CloudWatch API');
    } 
  };

  useEffect(() => {
    fetchCloudWatchMetrics();
  }, []);

  // Table component for each metric
  const MetricTable = ({ title, metricKey }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {metrics[metricKey]?.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                  {item.timestamp}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchCloudWatchMetrics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AWS CloudWatch Metrics</h1>
          <p className="mt-2 text-gray-600">Real-time monitoring of EC2 instance metrics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricTable title="CPU Utilization" metricKey="cpuUtilization" />
          <MetricTable title="Network In" metricKey="networkIn" />
          <MetricTable title="Network Out" metricKey="networkOut" />
          <MetricTable title="Disk Read" metricKey="diskRead" />
          <MetricTable title="Disk Write" metricKey="diskWrite" />
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={fetchCloudWatchMetrics}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Refresh Metrics
          </button>
        </div>
      </div>
    </div>
  );
};

export default CpuDebugPage;
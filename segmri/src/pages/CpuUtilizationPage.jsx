import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from "../api/AxiosInstance";

const CpuUtilizationPage = () => {
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
      const formatMetrics = (timestamps, values, unit = '', converter = null) =>
        timestamps.map((t, i) => {
          let rawValue = parseFloat(values[i]);
          let convertedValue = converter ? parseFloat(converter(rawValue)) : rawValue;

          // Convert to local readable date/time (e.g., "10/10/2025, 11:37:00 AM")
          const localTime = new Date(t).toLocaleString('en-MY', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });

          // Convert MB/s to MB (make readable)
          let displayValue;
          if (unit.includes('KB/s') || unit.includes('MB/s')) {
            const valueInMB = rawValue / 1000; // convert large MB/s to MB
            displayValue = `${valueInMB.toFixed(1)} MB`;
          } else {
            displayValue = `${convertedValue}${unit}`;
          }

          return {
            timestamp: localTime,       // formatted human-readable time
            value: rawValue,            // original number
            displayValue,               // formatted (e.g., "7.1 MB")
            numericValue: convertedValue
          };
        });

      // Apply formatted metrics
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
    } finally {
      // setLoading(false);
    }
  };


  useEffect(() => {
    fetchCloudWatchMetrics();
  }, []);

  // Chart component for each metric
  const MetricChart = ({ title, metricKey, color = "#8884d8" }) => {
    if (!metrics[metricKey] || metrics[metricKey].length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            No data available
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
              data={metrics[metricKey]}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 12 }}
                tickFormatter={(timestamp) => {
                  return new Date(timestamp).toLocaleTimeString('en-MY', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });
                }}
                angle={-30}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  // Convert large numbers into readable MB/GB/IOPS values
                  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed              (1) + ' GB';
                  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + '               MB';
                  if (value >= 1_000) return (value / 1_000).toFixed(1) + ' K';
                  return value.toFixed(1);
                }}
              />
              <Tooltip
                formatter={(value, name, props) => {
                  const { payload } = props;
                  return [payload.displayValue, title];
                }}
                labelFormatter={(label) => `Time: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="numericValue"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 6 }}
                name={title}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

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
        <div className="text-left mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CPU and EC2 Monitoring</h1>
          <p className="mt-2 text-gray-600">Real-time monitoring of EC2 instance metrics</p>
        </div>

        {/* Charts Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Metrics Visualization</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricChart title="CPU Utilization" metricKey="cpuUtilization" color="#8884d8" />
            <MetricChart title="Network In" metricKey="networkIn" color="#82ca9d" />
            <MetricChart title="Network Out" metricKey="networkOut" color="#ffc658" />
            <MetricChart title="Disk Read" metricKey="diskRead" color="#ff8042" />
            <MetricChart title="Disk Write" metricKey="diskWrite" color="#0088fe" />
          </div>
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

export default CpuUtilizationPage;
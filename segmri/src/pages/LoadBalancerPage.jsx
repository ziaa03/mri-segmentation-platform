import React, { useState, useEffect } from "react";
import api from "../api/AxiosInstance";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function AlbMetricsDashboard() {
  const [metricsData, setMetricsData] = useState({
    requestCount: [],
    targetResponseTime: [],
    http4xxElb: [],
    http4xxTarget: [],
  });

  const [healthyHosts, setHealthyHosts] = useState(0);
  const [unhealthyHosts, setUnhealthyHosts] = useState(0);

  // Fetch all ALB metrics
  const fetchAlbMetrics = async () => {
    try {
      const [
        requestCountRes,
        responseTimeRes,
        http4xxElbRes,
        http4xxTargetRes,
        healthyRes,
        unhealthyRes,
      ] = await Promise.all([
        api.get("/metrics/alb/request-count"),
        api.get("/metrics/alb/target-response-time"),
        api.get("/metrics/alb/http-4xx-elb"),
        api.get("/metrics/alb/http-4xx-target"),
        api.get("/metrics/alb/healthy-hosts"),
        api.get("/metrics/alb/unhealthy-hosts"),
      ]);

      // Convert timestamps + values → Recharts-friendly format
      const toChartData = (timestamps, values) =>
        timestamps.map((t, i) => ({
          timestamp: new Date(t).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          value: values[i],
        }));

      setMetricsData({
        requestCount: toChartData(
          requestCountRes.data.timestamps,
          requestCountRes.data.values
        ),
        targetResponseTime: toChartData(
          responseTimeRes.data.timestamps,
          responseTimeRes.data.values
        ),
        http4xxElb: toChartData(
          http4xxElbRes.data.timestamps,
          http4xxElbRes.data.values
        ),
        http4xxTarget: toChartData(
          http4xxTargetRes.data.timestamps,
          http4xxTargetRes.data.values
        ),
      });

      // For healthy/unhealthy hosts → use latest value
      const getLatestValue = (res) =>
        res?.data?.values?.length > 0
          ? res.data.values[res.data.values.length - 1]
          : 0;

      setHealthyHosts(getLatestValue(healthyRes));
      setUnhealthyHosts(getLatestValue(unhealthyRes));
    } catch (error) {
      console.error("Error fetching ALB metrics:", error);
    }
  };

  // Load once at mount
  useEffect(() => {
    fetchAlbMetrics();
  }, []);

  const graphMetrics = [
    {
      title: "Request Count",
      color: "#3b82f6",
      data: metricsData.requestCount,
    },
    {
      title: "Target Response Time (s)",
      color: "#10b981",
      data: metricsData.targetResponseTime,
    },
    {
      title: "HTTP 4XX (ELB)",
      color: "#f59e0b",
      data: metricsData.http4xxElb,
    },
    {
      title: "HTTP 4XX (Target)",
      color: "#ef4444",
      data: metricsData.http4xxTarget,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header Section */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Load Balancer Metrics
          </h1>
          <p className="text-gray-600">
            Application Load Balancer performance overview
          </p>
        </div>
      </header>

      {/* Host Status Cards */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Healthy Hosts</p>
            <p className="text-3xl font-semibold text-gray-900">
              {healthyHosts}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-red-500 rounded-full animate-ping"></div>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Unhealthy Hosts</p>
            <p className="text-3xl font-semibold text-gray-900">
              {unhealthyHosts}
            </p>
          </div>
        </div>
      </div>

      {/* Graph Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {graphMetrics.map((metric, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {metric.title}
              </h3>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metric.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="timestamp"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={metric.color}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="mt-10 text-center">
        <button
          onClick={fetchAlbMetrics}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Refresh Metrics
        </button>
      </div>
    </div>
  );
}
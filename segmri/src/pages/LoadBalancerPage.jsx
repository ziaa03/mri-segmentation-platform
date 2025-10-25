import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { RotateCcw } from "lucide-react"; // refresh icon

// --- Mock data ---
const initialDummyData = [
  { timestamp: "10:00", value: 120 },
  { timestamp: "10:05", value: 180 },
  { timestamp: "10:10", value: 160 },
  { timestamp: "10:15", value: 220 },
  { timestamp: "10:20", value: 190 },
  { timestamp: "10:25", value: 210 },
];

const graphMetrics = [
  { title: "Request Count", color: "#3b82f6", current: "2.4K" },
  { title: "Target Response Time", color: "#10b981", current: "0.24s", unit: "s" },
  { title: "HTTP 4XX (ELB)", color: "#f59e0b", current: "42" },
  { title: "HTTP 4XX (Target)", color: "#ef4444", current: "18" },
];

export default function AlbMetricsDashboard() {
  const [data, setData] = useState(initialDummyData);

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
            <p className="text-3xl font-semibold text-gray-900">8</p>
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
            <p className="text-3xl font-semibold text-gray-900">2</p>
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
              <p
                className="text-2xl font-bold"
                style={{ color: metric.color }}
              >
              </p>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
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
          // onClick={fetchEcrMetrics}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Refresh Metrics
        </button>
      </div>

    </div>
  );
}
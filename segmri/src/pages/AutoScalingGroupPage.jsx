import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Server,
  BarChart3,
  Cpu,
  Clock,
  Layers,
  TrendingUp,
} from "lucide-react";
import api from "../api/AxiosInstance";

const AutoScalingGroupPage = () => {
  const [metrics, setMetrics] = useState({
    minSize: 0,
    maxSize: 0,
    desiredCapacity: 0,
    inServiceInstances: 0,
    pendingInstances: 0,
    totalInstances: 0,
  });

  // Fetch all ASG metrics
  // Fetch all ASG metrics
  const fetchASGMetrics = async () => {
    try {
      const [
        minSizeRes,
        maxSizeRes,
        desiredRes,
        inServiceRes,
        pendingRes,
        totalRes,
      ] = await Promise.all([
        api.get("/metrics/asg/min-size"),
        api.get("/metrics/asg/max-size"),
        api.get("/metrics/asg/desired-capacity"),
        api.get("/metrics/asg/in-service"),
        api.get("/metrics/asg/pending"),
        api.get("/metrics/asg/total"),
      ]);
    
      // Helper function to safely extract the last value
      const getLastValue = (res) =>
        Array.isArray(res.data.values) && res.data.values.length > 0
          ? res.data.values[res.data.values.length - 1]
          : 0;
  
      setMetrics({
        minSize: getLastValue(minSizeRes),
        maxSize: getLastValue(maxSizeRes),
        desiredCapacity: getLastValue(desiredRes),
        inServiceInstances: getLastValue(inServiceRes),
        pendingInstances: getLastValue(pendingRes),
        totalInstances: getLastValue(totalRes),
      });
    } catch (error) {
      console.error("Error fetching ASG metrics:", error);
      alert("Failed to fetch ASG metrics. Please check backend connection.");
    }
  };

  // Automatically fetch metrics when component mounts
  useEffect(() => {
    fetchASGMetrics();
  }, []);

  const capacityMetrics = [
    {
      label: "Min Size",
      value: metrics.minSize,
      icon: <BarChart3 className="w-5 h-5 text-blue-500" />,
      description: "Minimum instances",
    },
    {
      label: "Desired Capacity",
      value: metrics.desiredCapacity,
      icon: <Cpu className="w-5 h-5 text-purple-500" />,
      description: "Target instances",
    },
    {
      label: "Max Size",
      value: metrics.maxSize,
      icon: <TrendingUp className="w-5 h-5 text-red-500" />,
      description: "Maximum instances",
    },
  ];

  const instanceMetrics = [
    {
      label: "In Service",
      value: metrics.inServiceInstances,
      icon: <Server className="w-5 h-5" />,
      description: "Healthy instances",
      status: "healthy",
    },
    {
      label: "Pending",
      value: metrics.pendingInstances,
      icon: <Clock className="w-5 h-5" />,
      description: "Initializing instances",
      status: "warning",
    },
    {
      label: "Total",
      value: metrics.totalInstances,
      icon: <Layers className="w-5 h-5" />,
      description: "All instances",
      status: "neutral",
    },
  ];

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Auto Scaling Group
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor and manage your EC2 auto scaling configuration
            </p>
          </div>
        </div>

        {/* Capacity Configuration Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Capacity Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {capacityMetrics.map((metric) => (
              <div
                key={metric.label}
                className="p-4 border border-gray-200 rounded-lg bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-gray-100 text-gray-600">
                      {metric.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {metric.label}
                    </span>
                  </div>
                </div>
                <p className="text-base text-gray-500 mb-1">
                  {metric.description}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Instance Status Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Instance Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {instanceMetrics.map((metric) => (
              <div
                key={metric.label}
                className="p-4 border border-gray-200 rounded-lg bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1 rounded ${
                        metric.status === "healthy"
                          ? "bg-green-100 text-green-600"
                          : metric.status === "warning"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {metric.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {metric.label}
                    </span>
                  </div>
                </div>
                <p className="text-base text-gray-500 mb-1">
                  {metric.description}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchASGMetrics}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Metrics
        </button>
      </div>
    </div>
  );
};

export default AutoScalingGroupPage;
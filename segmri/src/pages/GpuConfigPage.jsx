import React, { useEffect, useState } from "react";
import api from "../api/AxiosInstance";

const GpuConfigPage = () => {
  const [gpuStatus, setGpuStatus] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [gpuConfig, setGpuConfig] = useState(null);
  const [editConfig, setEditConfig] = useState(false);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // API Calls (unchanged)
  const fetchGpuStatus = async () => {
    try {
      const res = await api.get("/status/gpu-status");
      setGpuStatus(res.data.details);
    } catch (err) {
      setError("Failed to fetch GPU status");
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const res = await api.get("/status/gpu-system-status");
      setSystemStatus(res.data.details);
    } catch (err) {
      setError("Failed to fetch System status");
    }
  };

  const fetchGpuConfig = async () => {
    try {
      const res = await api.get("/admintools/gpu-config");
      if (res.data.success) {
        setGpuConfig(res.data.gpuHost);
        setFormData(res.data.gpuHost);
      } else {
        setError("No GPU configuration found");
      }
    } catch (err) {
      setError("Failed to fetch GPU configuration");
    }
  };

  const updateGpuConfig = async () => {
    try {
      const res = await api.patch("/admintools/gpu-config", formData);
      if (res.data.success) {
        setGpuConfig(res.data.gpuHost);
        setMessage("Configuration updated successfully!");
        setEditConfig(false);
      } else {
        setError(res.data.message || "Failed to update configuration");
      }
    } catch (err) {
      setError("Error updating configuration");
    }
  };

  const reloadGpuConfig = async () => {
    try {
      const res = await api.post("/admintools/gpu-config/reload");
      if (res.data.success) {
        fetchGpuConfig();
        setMessage("GPU configuration reloaded successfully!");
      } else {
        setError(res.data.message || "Failed to reload configuration");
      }
    } catch (err) {
      setError("Error reloading configuration");
    }
  };

  const forceJwtRegeneration = async () => {
    try {
      const res = await api.post("/admintools/gpu-config/force-jwt-regeneration");
      if (res.data.success) {
        setMessage("JWT regenerated successfully!");
      } else {
        setError(res.data.message || "Failed to regenerate JWT");
      }
    } catch (err) {
      setError("Error regenerating JWT");
    }
  };

  useEffect(() => {
    fetchGpuStatus();
    fetchSystemStatus();
    fetchGpuConfig();

    const interval = setInterval(() => {
      fetchGpuStatus();
      fetchSystemStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // UI Components
  const StatusBadge = ({ status }) => {
    const getStatusColor = (status) => {
      switch (status?.toLowerCase()) {
        case "ok":
          return "bg-green-500 text-white";
        case "busy":
          return "bg-yellow-500 text-white";
        case "degraded":
          return "bg-orange-500 text-white";
        case "error":
          return "bg-red-500 text-white";
        default:
          return "bg-gray-500 text-white";
      }
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}
      >
        {status || "Unknown"}
      </span>
    );
  };

  const MetricCard = ({ title, value, subtitle, icon, color = "blue" }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <span className={`text-${color}-500 text-xl`}>{icon}</span>
        </div>
      </div>
    </div>
  );

  const ProgressCard = ({ title, percentage, used, total, unit, color = "blue" }) => {
    const colorClasses = {
      blue: "bg-blue-500",
      purple: "bg-purple-500",
      orange: "bg-orange-500",
      green: "bg-green-500",
      red: "bg-red-500"
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <span className="text-sm font-medium text-gray-600">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className={`h-3 rounded-full ${colorClasses[color]}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>{used}{unit}</span>
          <span>{total}{unit}</span>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-red-600 text-lg font-semibold mb-2">
            Connection Error
          </div>
          <p className="text-red-500">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                GPU Monitoring Dashboard
              </h1>
              <p className="text-gray-600">
                Real-time performance monitoring and configuration management
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Live</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center">
            <span className="text-lg mr-2">✅</span>
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center">
            <span className="text-lg mr-2">❌</span>
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-white rounded-xl p-1 shadow-sm inline-flex">
            {["overview", "configuration", "system"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="GPU Utilization"
                value={`${gpuStatus?.gpu?.gpu_utilization_percent || 0}%`}
                subtitle="Current load"
                icon="🚀"
                color="purple"
              />
              <MetricCard
                title="GPU Memory"
                value={`${gpuStatus?.gpu?.memory_used_mb || 0}MB`}
                subtitle={`of ${gpuStatus?.gpu?.memory_total_mb || 0}MB`}
                icon="💾"
                color="blue"
              />
              <MetricCard
                title="CPU Usage"
                value={`${systemStatus?.cpu?.usage_percent || 0}%`}
                subtitle={`${systemStatus?.cpu?.core_count || 0} cores`}
                icon="⚡"
                color="orange"
              />
              <MetricCard
                title="System Uptime"
                value={`${systemStatus?.system?.uptime_days || 0}d`}
                subtitle="Since last boot"
                icon="🕒"
                color="green"
              />
            </div>

            {/* Progress Bars */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProgressCard
                title="GPU Memory Usage"
                percentage={Math.round(
                  ((gpuStatus?.gpu?.memory_used_mb || 0) / 
                   (gpuStatus?.gpu?.memory_total_mb || 1)) * 100
                )}
                used={gpuStatus?.gpu?.memory_used_mb}
                total={gpuStatus?.gpu?.memory_total_mb}
                unit="MB"
                color="purple"
              />
              <ProgressCard
                title="System Memory"
                percentage={systemStatus?.memory?.usage_percent || 0}
                used={systemStatus?.memory?.used_gb}
                total={systemStatus?.memory?.total_gb}
                unit="GB"
                color="blue"
              />
              <ProgressCard
                title="Disk Usage"
                percentage={systemStatus?.disk?.usage_percent || 0}
                used={systemStatus?.disk?.used_gb}
                total={systemStatus?.disk?.total_gb}
                unit="GB"
                color="orange"
              />
              <ProgressCard
                title="GPU Utilization"
                percentage={gpuStatus?.gpu?.gpu_utilization_percent || 0}
                used={gpuStatus?.gpu?.gpu_utilization_percent}
                total={100}
                unit="%"
                color="green"
              />
            </div>

            {/* Detailed Status Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* GPU Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">GPU Details</h2>
                  <StatusBadge status={gpuStatus?.gpu?.status} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-medium">{gpuStatus?.gpu?.gpu_name || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">CUDA Version:</span>
                    <p className="font-medium">{gpuStatus?.gpu?.cuda_version || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Architecture:</span>
                    <p className="font-medium">{gpuStatus?.gpu?.architecture || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Driver Version:</span>
                    <p className="font-medium">{gpuStatus?.gpu?.driver_version || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* System Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">System Details</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Platform:</span>
                    <p className="font-medium">{systemStatus?.system?.platform || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Release:</span>
                    <p className="font-medium">{systemStatus?.system?.release || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Boot Time:</span>
                    <p className="font-medium">{systemStatus?.system?.boot_time || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Updated:</span>
                    <p className="font-medium">{systemStatus?.timestamp || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Tab */}
        {activeTab === "configuration" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">GPU Server Configuration</h2>
                <div className="flex space-x-3">
                  {!editConfig && (
                    <button
                      onClick={() => setEditConfig(true)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center"
                    >
                      <span className="mr-2">✏️</span>
                      Edit Configuration
                    </button>
                  )}
                  <button
                    onClick={reloadGpuConfig}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center"
                  >
                    <span className="mr-2">🔄</span>
                    Reload
                  </button>
                  <button
                    onClick={forceJwtRegeneration}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center"
                  >
                    <span className="mr-2">🔑</span>
                    Regenerate JWT
                  </button>
                </div>
              </div>

              {gpuConfig ? (
                editConfig ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        "host",
                        "port",
                        "description",
                        "serverIdForGpuServer",
                        "gpuServerIdentity",
                        "jwtRefreshInterval",
                        "jwtLifetimeSeconds",
                      ].map((field) => (
                        <div key={field} className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700 capitalize">
                            {field.replace(/([A-Z])/g, " $1")}
                          </label>
                          <input
                            type={typeof formData[field] === "number" ? "number" : "text"}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData[field] || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, [field]: e.target.value })
                            }
                          />
                        </div>
                      ))}
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="isHTTPS"
                          checked={formData.isHTTPS || false}
                          onChange={(e) =>
                            setFormData({ ...formData, isHTTPS: e.target.checked })
                          }
                          className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="isHTTPS" className="text-sm font-medium text-gray-700">
                          Enable HTTPS
                        </label>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={updateGpuConfig}
                        className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center"
                      >
                        <span className="mr-2">💾</span>
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setFormData(gpuConfig);
                          setEditConfig(false);
                        }}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries({
                      host: "Host",
                      port: "Port",
                      description: "Description",
                      serverIdForGpuServer: "Server ID",
                      gpuServerIdentity: "Identity",
                      jwtRefreshInterval: "JWT Refresh Interval",
                      jwtLifetimeSeconds: "JWT Lifetime",
                      isHTTPS: "HTTPS Enabled"
                    }).map(([key, label]) => (
                      <div key={key} className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-1">{label}</div>
                        <div className="font-medium text-gray-900">
                          {key === 'isHTTPS' 
                            ? gpuConfig[key] ? 'Yes' : 'No'
                            : gpuConfig[key] || 'N/A'
                          }
                          {key === 'jwtRefreshInterval' && ' ms'}
                          {key === 'jwtLifetimeSeconds' && ' s'}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No GPU configuration available
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === "system" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* GPU Status Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">GPU Status</h2>
                {gpuStatus ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Status</span>
                      <StatusBadge status={gpuStatus.gpu?.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <p className="font-medium">{gpuStatus.gpu?.gpu_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">CUDA Version:</span>
                        <p className="font-medium">{gpuStatus.gpu?.cuda_version}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Architecture:</span>
                        <p className="font-medium">{gpuStatus.gpu?.architecture}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Driver:</span>
                        <p className="font-medium">{gpuStatus.gpu?.driver_version}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">No GPU status available</div>
                )}
              </div>

              {/* System Status Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
                {systemStatus ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Platform:</span>
                        <p className="font-medium">{systemStatus.system?.platform}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Release:</span>
                        <p className="font-medium">{systemStatus.system?.release}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Boot Time:</span>
                        <p className="font-medium">{systemStatus.system?.boot_time}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Uptime:</span>
                        <p className="font-medium">{systemStatus.system?.uptime_days} days</p>
                      </div>
                    </div>
                    <div className="text-center text-gray-500 text-sm border-t pt-4">
                      Last updated: {systemStatus.timestamp}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">No system status available</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-white rounded-full px-4 py-2 shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Auto-refreshing every 30 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GpuConfigPage;
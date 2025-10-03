import React, { useEffect, useState } from "react";
import api from "../api/AxiosInstance";

const GpuConfigPage = () => {
  const [gpuStatus, setGpuStatus] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [gpuConfig, setGpuConfig] = useState(null);
  const [editableConfig, setEditableConfig] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // fetch gpu status
  const fetchGpuStatus = async () => {
    try {
      const res = await api.get("/status/gpu-status");
      setGpuStatus(res.data.details);
    } catch (err) {
      console.error("Failed to fetch GPU status:", err);
    }
  };

  // fetch system status
  const fetchSystemStatus = async () => {
    try {
      const res = await api.get("/status/gpu-system-status");
      setSystemStatus(res.data.details);
    } catch (err) {
      console.error("Failed to fetch System status:", err);
    }
  };

  // fetch gpu config
  const fetchGpuConfig = async () => {
    try {
      const res = await api.get("/admintools/gpu-config");
      if (res.data.success) {
        setGpuConfig(res.data.gpuHost);
        setEditableConfig(res.data.gpuHost);
      }
    } catch (err) {
      console.error("Failed to fetch GPU configuration:", err);
    }
  };

  // update gpu config
  const updateGpuConfig = async () => {
    setSaving(true);
    try {
      const res = await api.patch("/admintools/gpu-config", editableConfig);
      if (res.data.success) {
        setGpuConfig(res.data.gpuHost);
        setEditableConfig(res.data.gpuHost);
        alert('Configuration updated successfully!');
      } else {
        alert(res.data.message || 'Failed to update configuration');
      }
    } catch (err) {
      alert('Error updating configuration');
    } finally {
      setSaving(false);
    }
  };

  // reload gpu config
  const reloadGpuConfig = async () => {
    try {
      const res = await api.post("/admintools/gpu-config/reload");
      if (res.data.success) {
        fetchGpuConfig();
        alert('GPU configuration reloaded successfully!');
      } else {
        alert(res.data.message || 'Failed to reload configuration');
      }
    } catch (err) {
      alert('Error reloading configuration');
    }
  };

  // force jwt regeneration
  const forceJwtRegeneration = async () => {
    if (!window.confirm('Are you sure you want to regenerate JWT tokens? This may affect existing sessions.')) {
      return;
    }
    try {
      const res = await api.post("/admintools/gpu-config/force-jwt-regeneration");
      if (res.data.success) {
        alert('JWT tokens regenerated successfully!');
      } else {
        alert(res.data.message || 'Failed to regenerate JWT');
      }
    } catch (err) {
      alert('Error regenerating JWT');
    }
  };

  // test connection
  const testConnection = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      // Test GPU status endpoint
      const res = await api.get("/status/gpu-status");
      setTestResult({
        success: true,
        message: 'Connection successful',
        details: { status: 'ok', response: 'GPU server is responding' }
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Connection failed',
        details: { error: err.message }
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = () => {
    fetchGpuStatus();
    fetchSystemStatus();
    setLastUpdated(new Date());
  };

  const handleInputChange = (field, value) => {
    setEditableConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper functions
  const formatDuration = (ms) => {
    if (ms < 60000) return `${Math.round(ms / 1000)} seconds`;
    if (ms < 3600000) return `${Math.round(ms / 60000)} minutes`;
    return `${Math.round(ms / 3600000)} hours`;
  };

  // Initialize data
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">GPU Server Configuration</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your GPU server settings and monitor real-time status
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Configuration */}
          <div className="space-y-8">
            {/* Configuration Overview */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Configuration Overview</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-black">Server Details</h3>
                  <dl className="mt-2 grid grid-cols-1 gap-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Host Address</dt>
                      <dd className="text-sm text-gray-900">{gpuConfig?.host || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Port</dt>
                      <dd className="text-sm text-gray-900">{gpuConfig?.port || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Protocol</dt>
                      <dd className="text-sm text-gray-900">{gpuConfig?.isHTTPS ? 'HTTPS' : 'HTTP'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Full Address</dt>
                      <dd className="text-sm text-gray-900">
                        {gpuConfig?.host && gpuConfig?.port 
                          ? `${gpuConfig.isHTTPS ? 'https' : 'http'}://${gpuConfig.host}:${gpuConfig.port}`
                          : 'N/A'
                        }
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Description</dt>
                      <dd className="text-sm text-gray-900">{gpuConfig?.description || 'No description'}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-black">Authentication</h3>
                  <dl className="mt-2 grid grid-cols-1 gap-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Server ID</dt>
                      <dd className="text-sm text-gray-900">{gpuConfig?.serverIdForGpuServer || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">GPU Server Identity</dt>
                      <dd className="text-sm text-gray-900">{gpuConfig?.gpuServerIdentity || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">JWT Refresh</dt>
                      <dd className="text-sm text-gray-900">
                        {gpuConfig?.jwtRefreshInterval ? formatDuration(gpuConfig.jwtRefreshInterval) : 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">JWT Lifetime</dt>
                      <dd className="text-sm text-gray-900">
                        {gpuConfig?.jwtLifetimeSeconds ? formatDuration(gpuConfig.jwtLifetimeSeconds * 1000) : 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* Editable Configuration Form */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Edit Configuration</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Server Connection
                  </label>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600">Host</label>
                      <input
                        type="text"
                        value={editableConfig.host || ''}
                        onChange={(e) => handleInputChange('host', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Port</label>
                      <input
                        type="number"
                        min="1"
                        max="65535"
                        value={editableConfig.port || ''}
                        onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editableConfig.isHTTPS || false}
                        onChange={(e) => handleInputChange('isHTTPS', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-600">Use HTTPS</label>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">Description</label>
                      <textarea
                        value={editableConfig.description || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Authentication Settings
                  </label>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-600">Server ID</label>
                      <input
                        type="text"
                        value={editableConfig.serverIdForGpuServer || ''}
                        onChange={(e) => handleInputChange('serverIdForGpuServer', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600">GPU Server Identity</label>
                      <input
                        type="text"
                        value={editableConfig.gpuServerIdentity || ''}
                        onChange={(e) => handleInputChange('gpuServerIdentity', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600">JWT Refresh (ms)</label>
                        <input
                          type="number"
                          value={editableConfig.jwtRefreshInterval || ''}
                          onChange={(e) => handleInputChange('jwtRefreshInterval', parseInt(e.target.value))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600">JWT Lifetime (s)</label>
                        <input
                          type="number"
                          value={editableConfig.jwtLifetimeSeconds || ''}
                          onChange={(e) => handleInputChange('jwtLifetimeSeconds', parseInt(e.target.value))}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={updateGpuConfig}
                  disabled={saving}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Status & Actions */}
          <div className="space-y-8">
            {/* Real-Time Status Dashboard */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Real-Time Status</h2>
                <button
                  onClick={refreshStatus}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-3 rounded-md"
                >
                  Refresh
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* GPU Status */}
                <div>
                  <h3 className="text-sm font-medium text-black mb-3">GPU Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        gpuStatus?.gpu?.status === 'ok' 
                          ? 'bg-green-100 text-green-800'
                          : gpuStatus?.gpu?.status === 'busy'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {gpuStatus?.gpu?.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">GPU Model</span>
                      <span className="text-sm text-gray-900">{gpuStatus?.gpu?.gpu_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">CUDA Version</span>
                      <span className="text-sm text-gray-900">{gpuStatus?.gpu?.cuda_version || 'N/A'}</span>
                    </div>
                    
                    {/* Memory Usage */}
                    {gpuStatus?.gpu?.memory_used_mb && gpuStatus?.gpu?.memory_total_mb && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Memory Usage</span>
                          <span className="text-gray-900">
                            {gpuStatus.gpu.memory_used_mb} MB / {gpuStatus.gpu.memory_total_mb} MB
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ 
                              width: `${(gpuStatus.gpu.memory_used_mb / gpuStatus.gpu.memory_total_mb) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* GPU Utilization */}
                    {gpuStatus?.gpu?.gpu_utilization_percent !== undefined && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">GPU Utilization</span>
                          <span className="text-gray-900">{gpuStatus.gpu.gpu_utilization_percent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              gpuStatus.gpu.gpu_utilization_percent > 90 ? 'bg-red-600' : 'bg-green-600'
                            }`}
                            style={{ width: `${gpuStatus.gpu.gpu_utilization_percent}%` }}
                          ></div>
                        </div>
                        {gpuStatus.gpu.gpu_utilization_percent > 90 && (
                          <span className="inline-flex items-center mt-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Busy
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* System Status */}
                <div>
                  <h3 className="text-sm font-medium text-black mb-3">System Status</h3>
                  <div className="space-y-4">
                    {/* CPU Usage */}
                    {systemStatus?.cpu?.usage_percent !== undefined && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">CPU Usage</span>
                          <span className="text-gray-900">{systemStatus.cpu.usage_percent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${systemStatus.cpu.usage_percent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* RAM Usage */}
                    {systemStatus?.memory?.used_gb && systemStatus?.memory?.total_gb && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">RAM Usage</span>
                          <span className="text-gray-900">
                            {systemStatus.memory.used_gb} GB / {systemStatus.memory.total_gb} GB
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full"
                            style={{ 
                              width: `${(systemStatus.memory.used_gb / systemStatus.memory.total_gb) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Disk Usage */}
                    {systemStatus?.disk?.used_gb && systemStatus?.disk?.total_gb && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Disk Usage</span>
                          <span className="text-gray-900">
                            {systemStatus.disk.used_gb} GB / {systemStatus.disk.total_gb} GB
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-600 h-2 rounded-full"
                            style={{ 
                              width: `${(systemStatus.disk.used_gb / systemStatus.disk.total_gb) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* System Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Platform</span>
                        <div className="text-gray-900">{systemStatus?.system?.platform || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Uptime</span>
                        <div className="text-gray-900">
                          {systemStatus?.system?.uptime_days ? 
                            `${systemStatus.system.uptime_days} days` : 'N/A'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {lastUpdated && (
                  <div className="text-xs text-gray-500 text-center">
                    Last updated: {lastUpdated.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
              </div>
              <div className="p-6 space-y-4">
                <button
                  onClick={testConnection}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Testing...' : 'Test Connection'}
                </button>

                <button
                  onClick={reloadGpuConfig}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Reload Configuration
                </button>

                <button
                  onClick={forceJwtRegeneration}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Force JWT Regeneration
                </button>

                {/* Test Connection Result */}
                {testResult && (
                  <div className={`p-3 rounded-md ${
                    testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className={`text-sm ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {testResult.message}
                    </div>
                    {testResult.details && (
                      <div className="text-xs mt-1 text-gray-600">
                        {typeof testResult.details === 'object' 
                          ? JSON.stringify(testResult.details) 
                          : testResult.details
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Security Indicators */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Security & Validation</h2>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">JWT Configuration</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    gpuConfig?.jwtLifetimeSeconds && gpuConfig?.jwtRefreshInterval
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {gpuConfig?.jwtLifetimeSeconds && gpuConfig?.jwtRefreshInterval ? 'Configured' : 'Partial'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Server Connection</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    gpuStatus?.gpu?.status === 'ok' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {gpuStatus?.gpu?.status === 'ok' ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GpuConfigPage;
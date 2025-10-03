import { useState } from 'react';

const GpuConfigPage = () => {
  // Mock data for initial state
  const [config, setConfig] = useState({
    host: 'gpu.visheart.com',
    port: 8000,
    isHTTPS: true,
    description: 'Primary GPU Server',
    serverIdForGpuServer: 'gpu-server-001',
    gpuServerIdentity: 'visheart-gpu-01',
    hasJwtSecret: true,
    jwtRefreshIntervalMs: 3300000,
    jwtLifetimeSeconds: 3600,
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin-user',
    createdAt: new Date().toISOString()
  });

  const [editableConfig, setEditableConfig] = useState({ ...config });
  const [gpuStatus, setGpuStatus] = useState({
    connectionStatus: 'online',
    gpuInfo: {
      name: 'NVIDIA GeForce RTX 4090',
      cudaVersion: '12.2'
    },
    memory: {
      used: 8192,
      total: 24576
    },
    utilization: 75
  });

  const [systemStatus, setSystemStatus] = useState({
    cpuUsage: 45,
    ramUsage: {
      used: 8589934592, // 8 GB
      total: 17179869184 // 16 GB
    },
    diskUsage: {
      used: 536870912000, // 500 GB
      total: 1073741824000 // 1 TB
    },
    systemInfo: {
      platform: 'Linux',
      release: '5.15.0-91-generic',
      uptime: 86400 * 7 // 7 days in seconds
    }
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const handleInputChange = (field, value) => {
    setEditableConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveConfig = () => {
    setSaving(true);
    // Simulate API call delay
    setTimeout(() => {
      setConfig(editableConfig);
      setSaving(false);
      alert('Configuration updated successfully!');
    }, 1000);
  };

  const testConnection = () => {
    setLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      setTestResult({
        success: true,
        message: 'Connection successful',
        details: { status: 'ok', responseTime: '150ms' }
      });
      setLoading(false);
    }, 1500);
  };

  const reloadConfig = () => {
    setEditableConfig({ ...config });
    alert('Configuration reloaded successfully!');
  };

  const forceJwtRegeneration = () => {
    if (!window.confirm('Are you sure you want to regenerate JWT tokens? This may affect existing sessions.')) {
      return;
    }
    alert('JWT tokens regenerated successfully!');
  };

  const refreshStatus = () => {
    setLastUpdated(new Date());
    alert('Status refreshed!');
  };

  const formatDuration = (ms) => {
    if (ms < 60000) return `${Math.round(ms / 1000)} seconds`;
    if (ms < 3600000) return `${Math.round(ms / 60000)} minutes`;
    return `${Math.round(ms / 3600000)} hours`;
  };

  const formatBytes = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

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
                  <h3 className="text-sm font-medium text-gray-500">Server Details</h3>
                  <dl className="mt-2 grid grid-cols-1 gap-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Host Address</dt>
                      <dd className="text-sm text-gray-900">{config.host}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Port</dt>
                      <dd className="text-sm text-gray-900">{config.port}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Protocol</dt>
                      <dd className="text-sm text-gray-900">{config.isHTTPS ? 'HTTPS' : 'HTTP'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Full Address</dt>
                      <dd className="text-sm text-gray-900">
                        {`${config.isHTTPS ? 'https' : 'http'}://${config.host}:${config.port}`}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Description</dt>
                      <dd className="text-sm text-gray-900">{config.description || 'No description'}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Authentication</h3>
                  <dl className="mt-2 grid grid-cols-1 gap-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Server ID</dt>
                      <dd className="text-sm text-gray-900">{config.serverIdForGpuServer}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">GPU Server Identity</dt>
                      <dd className="text-sm text-gray-900">{config.gpuServerIdentity}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">JWT Secret</dt>
                      <dd className="text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          config.hasJwtSecret ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {config.hasJwtSecret ? 'Configured' : 'Not Configured'}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">JWT Refresh</dt>
                      <dd className="text-sm text-gray-900">{formatDuration(config.jwtRefreshIntervalMs)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">JWT Lifetime</dt>
                      <dd className="text-sm text-gray-900">{formatDuration(config.jwtLifetimeSeconds * 1000)}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Metadata</h3>
                  <dl className="mt-2 grid grid-cols-1 gap-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Last Updated</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(config.updatedAt).toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Updated By</dt>
                      <dd className="text-sm text-gray-900">{config.updatedBy || 'Unknown'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Created</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(config.createdAt).toLocaleString()}
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
                    <div>
                      <label className="block text-sm text-gray-600">JWT Secret</label>
                      <input
                        type="password"
                        value={editableConfig.jwtSecret || ''}
                        onChange={(e) => handleInputChange('jwtSecret', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Leave empty to keep current secret"
                      />
                      <p className="mt-1 text-xs text-yellow-600">
                        Warning: Changing JWT secret will invalidate existing tokens
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600">JWT Refresh (ms)</label>
                        <input
                          type="number"
                          value={editableConfig.jwtRefreshIntervalMs || ''}
                          onChange={(e) => handleInputChange('jwtRefreshIntervalMs', parseInt(e.target.value))}
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
                  onClick={handleSaveConfig}
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
                  <h3 className="text-sm font-medium text-gray-500 mb-3">GPU Status</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        gpuStatus.connectionStatus === 'online' 
                          ? 'bg-green-100 text-green-800'
                          : gpuStatus.connectionStatus === 'degraded'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {gpuStatus.connectionStatus?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">GPU Model</span>
                      <span className="text-sm text-gray-900">{gpuStatus.gpuInfo?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">CUDA Version</span>
                      <span className="text-sm text-gray-900">{gpuStatus.gpuInfo?.cudaVersion || 'N/A'}</span>
                    </div>
                    
                    {/* Memory Usage */}
                    {gpuStatus.memory && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Memory Usage</span>
                          <span className="text-gray-900">
                            {formatBytes(gpuStatus.memory.used)} / {formatBytes(gpuStatus.memory.total)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ 
                              width: `${(gpuStatus.memory.used / gpuStatus.memory.total) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* GPU Utilization */}
                    {gpuStatus.utilization !== undefined && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">GPU Utilization</span>
                          <span className="text-gray-900">{gpuStatus.utilization}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              gpuStatus.utilization > 90 ? 'bg-red-600' : 'bg-green-600'
                            }`}
                            style={{ width: `${gpuStatus.utilization}%` }}
                          ></div>
                        </div>
                        {gpuStatus.utilization > 90 && (
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
                  <h3 className="text-sm font-medium text-gray-500 mb-3">System Status</h3>
                  <div className="space-y-4">
                    {/* CPU Usage */}
                    {systemStatus.cpuUsage !== undefined && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">CPU Usage</span>
                          <span className="text-gray-900">{systemStatus.cpuUsage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${systemStatus.cpuUsage}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* RAM Usage */}
                    {systemStatus.ramUsage && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">RAM Usage</span>
                          <span className="text-gray-900">
                            {formatBytes(systemStatus.ramUsage.used)} / {formatBytes(systemStatus.ramUsage.total)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full"
                            style={{ 
                              width: `${(systemStatus.ramUsage.used / systemStatus.ramUsage.total) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Disk Usage */}
                    {systemStatus.diskUsage && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Disk Usage</span>
                          <span className="text-gray-900">
                            {formatBytes(systemStatus.diskUsage.used)} / {formatBytes(systemStatus.diskUsage.total)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-600 h-2 rounded-full"
                            style={{ 
                              width: `${(systemStatus.diskUsage.used / systemStatus.diskUsage.total) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* System Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Platform</span>
                        <div className="text-gray-900">{systemStatus.systemInfo?.platform || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Uptime</span>
                        <div className="text-gray-900">
                          {systemStatus.systemInfo?.uptime ? 
                            `${Math.round(systemStatus.systemInfo.uptime / 86400)} days` : 'N/A'
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
                  onClick={reloadConfig}
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
                  <span className="text-sm text-gray-600">JWT Secret Strength</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    config.hasJwtSecret
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {config.hasJwtSecret ? 'Strong' : 'Weak/Default'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">SSL/HTTPS</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    config.isHTTPS ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {config.isHTTPS ? 'Enabled' : 'Recommended'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Configuration Complete</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Complete
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
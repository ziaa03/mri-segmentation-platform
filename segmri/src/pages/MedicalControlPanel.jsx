import React, { useState, useEffect } from 'react';
import { 
  Monitor, Clock, Layers, Play, Pause, ChevronLeft, ChevronRight, 
  Save, Download, Activity, Cpu, Database, Shield, Upload, Cloud, 
  BarChart3, Settings, Zap, Edit
} from 'lucide-react';

const MedicalControlPanel = ({ 
  currentTimeIndex, maxTimeIndex, currentLayerIndex, maxLayerIndex,
  onTimeChange, onLayerChange, onSave, onExport, projectId, processingComplete,
  handleUploadCurrentMasks, handleUploadAllMasks, uploadingMasks, segmentationData,
  // NEW PROPS for manual controls
  isEditMode, 
  manualTimeIndex, 
  manualLayerIndex,
  onManualTimeChange,
  onManualLayerChange,
  isManualPlaying,
  setIsManualPlaying,
  manualPlaybackSpeed,
  setManualPlaybackSpeed
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    let interval;
    if (isPlaying && processingComplete) {
      interval = setInterval(() => {
        if (currentTimeIndex < maxTimeIndex) {
          onTimeChange({ target: { value: currentTimeIndex + 1 } });
        } else {
          setIsPlaying(false);
        }
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTimeIndex, maxTimeIndex, playbackSpeed, onTimeChange, processingComplete]);

  // Manual playback effect
  useEffect(() => {
    let interval;
    if (isManualPlaying && isEditMode) {
      interval = setInterval(() => {
        if (manualTimeIndex < maxTimeIndex) {
          onManualTimeChange({ target: { value: manualTimeIndex + 1 } });
        } else {
          setIsManualPlaying(false);
        }
      }, 1000 / manualPlaybackSpeed);
    }
    return () => clearInterval(interval);
  }, [isManualPlaying, isEditMode, manualTimeIndex, maxTimeIndex, manualPlaybackSpeed, onManualTimeChange, setIsManualPlaying]);

  const timeProgress = maxTimeIndex > 0 ? (currentTimeIndex / maxTimeIndex) * 100 : 0;
  const layerProgress = maxLayerIndex > 0 ? (currentLayerIndex / maxLayerIndex) * 100 : 0;
  
  // Manual progress calculations
  const manualTimeProgress = maxTimeIndex > 0 ? (manualTimeIndex / maxTimeIndex) * 100 : 0;
  const manualLayerProgress = maxLayerIndex > 0 ? (manualLayerIndex / maxLayerIndex) * 100 : 0;

  return (
    <div className="bg-white shadow-lg border border-gray-200 mb-6">
      <div className="px-6 py-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <h3 className="text-lg font-semibold text-gray-800">Navigation Control Suite</h3>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Project: {projectId?.slice(-8) || 'N/A'}</span>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${processingComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              <span>{processingComplete ? 'Analysis Complete' : 'Processing'}</span>
            </div>
            {isEditMode && (
              <div className="flex items-center space-x-1">
                <Edit className="w-3 h-3 text-blue-600" />
                <span className="text-blue-600 font-medium">Edit Mode Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Layout based on Edit Mode */}
        <div className={`grid gap-6 ${isEditMode ? 'grid-cols-5' : 'grid-cols-3'}`}>
          
          {/* Column 1: AI Temporal Control */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-gray-800 font-medium text-sm">
                  {isEditMode ? 'AI Temporal' : 'Temporal Control'}
                </h4>
                <p className="text-gray-500 text-xs">
                  {isEditMode ? 'AI reference timeline' : 'Cardiac cycle progression'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-xs">Frame Position</span>
                <div className="text-right">
                  <div className="text-gray-800 font-semibold">
                    {currentTimeIndex + 1}/{maxTimeIndex + 1}
                  </div>
                  <div className="text-gray-500 text-xs">{timeProgress.toFixed(0)}% complete</div>
                </div>
              </div>
              
              <div className="mb-3">
                <input
                  type="range"
                  min="0"
                  max={maxTimeIndex}
                  value={currentTimeIndex}
                  onChange={onTimeChange}
                  className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer compact-slider"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${timeProgress}%, #e5e7eb ${timeProgress}%, #e5e7eb 100%)`
                  }}
                />
              </div>

              <div className="flex items-center justify-center space-x-3">
                <button
                  onClick={() => onTimeChange({ target: { value: Math.max(0, currentTimeIndex - 1) } })}
                  disabled={currentTimeIndex <= 0}
                  className="p-2 bg-[#3A4454] hover:bg-[#5B7B9A] text-white disabled:opacity-40 disabled:bg-gray-300 rounded-md transition-colors shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!processingComplete}
                  className="p-2.5 bg-[#5B7B9A] hover:bg-[#3A4454] text-white disabled:opacity-50 disabled:bg-gray-300 rounded-md transition-colors shadow-sm"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                
                <select 
                  value={playbackSpeed} 
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-[#5B7B9A] focus:border-[#5B7B9A] text-[#3A4454]"
                >
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1.0×</option>
                  <option value={2}>2.0×</option>
                </select>
                
                <button
                  onClick={() => onTimeChange({ target: { value: Math.min(maxTimeIndex, currentTimeIndex + 1) } })}
                  disabled={currentTimeIndex >= maxTimeIndex}
                  className="p-2 bg-[#3A4454] hover:bg-[#5B7B9A] text-white disabled:opacity-40 disabled:bg-gray-300 rounded-md transition-colors shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: AI Spatial Control */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-gray-800 font-medium text-sm">
                  {isEditMode ? 'AI Spatial' : 'Spatial Control'}
                </h4>
                <p className="text-gray-500 text-xs">
                  {isEditMode ? 'AI reference slices' : 'Cross-sectional navigation'}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-xs">Slice Position</span>
                <div className="text-right">
                  <div className="text-gray-800 font-semibold">
                    {currentLayerIndex + 1}/{maxLayerIndex + 1}
                  </div>
                  <div className="text-gray-500 text-xs">{layerProgress.toFixed(0)}% depth</div>
                </div>
              </div>
              
              <div className="mb-3">
                <input
                  type="range"
                  min="0"
                  max={maxLayerIndex}
                  value={currentLayerIndex}
                  onChange={onLayerChange}
                  className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer compact-slider"
                  style={{
                    background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${layerProgress}%, #e5e7eb ${layerProgress}%, #e5e7eb 100%)`
                  }}
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => onLayerChange({ target: { value: Math.max(0, currentLayerIndex - 1) } })}
                  disabled={currentLayerIndex <= 0}
                  className="flex-1 px-3 py-2 bg-[#3A4454] hover:bg-[#5B7B9A] text-white disabled:opacity-40 disabled:bg-gray-300 rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  Previous
                </button>
                
                <button
                  onClick={() => onLayerChange({ target: { value: Math.min(maxLayerIndex, currentLayerIndex + 1) } })}
                  disabled={currentLayerIndex >= maxLayerIndex}
                  className="flex-1 px-3 py-2 bg-[#3A4454] hover:bg-[#5B7B9A] text-white disabled:opacity-40 disabled:bg-gray-300 rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Manual Temporal Control (only in edit mode) */}
          {isEditMode && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-gray-800 font-medium text-sm">Manual Temporal</h4>
                  <p className="text-gray-500 text-xs">Edit mode timeline</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-xs">Frame Position</span>
                  <div className="text-right">
                    <div className="text-gray-800 font-semibold">
                      {manualTimeIndex + 1}/{maxTimeIndex + 1}
                    </div>
                    <div className="text-gray-500 text-xs">{manualTimeProgress.toFixed(0)}% complete</div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <input
                    type="range"
                    min="0"
                    max={maxTimeIndex}
                    value={manualTimeIndex}
                    onChange={onManualTimeChange}
                    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer compact-slider"
                    style={{
                      background: `linear-gradient(to right, #9333ea 0%, #9333ea ${manualTimeProgress}%, #e5e7eb ${manualTimeProgress}%, #e5e7eb 100%)`
                    }}
                  />
                </div>

                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => onManualTimeChange({ target: { value: Math.max(0, manualTimeIndex - 1) } })}
                    disabled={manualTimeIndex <= 0}
                    className="p-2 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 disabled:bg-gray-300 rounded-md transition-colors shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => setIsManualPlaying(!isManualPlaying)}
                    className="p-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-md transition-colors shadow-sm"
                  >
                    {isManualPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  
                  <select 
                    value={manualPlaybackSpeed} 
                    onChange={(e) => setManualPlaybackSpeed(parseFloat(e.target.value))}
                    className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-700"
                  >
                    <option value={0.5}>0.5×</option>
                    <option value={1}>1.0×</option>
                    <option value={2}>2.0×</option>
                  </select>
                  
                  <button
                    onClick={() => onManualTimeChange({ target: { value: Math.min(maxTimeIndex, manualTimeIndex + 1) } })}
                    disabled={manualTimeIndex >= maxTimeIndex}
                    className="p-2 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 disabled:bg-gray-300 rounded-md transition-colors shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Column 4: Manual Spatial Control (only in edit mode) */}
          {isEditMode && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Layers className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-gray-800 font-medium text-sm">Manual Spatial</h4>
                  <p className="text-gray-500 text-xs">Edit mode slices</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-xs">Slice Position</span>
                  <div className="text-right">
                    <div className="text-gray-800 font-semibold">
                      {manualLayerIndex + 1}/{maxLayerIndex + 1}
                    </div>
                    <div className="text-gray-500 text-xs">{manualLayerProgress.toFixed(0)}% depth</div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <input
                    type="range"
                    min="0"
                    max={maxLayerIndex}
                    value={manualLayerIndex}
                    onChange={onManualLayerChange}
                    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer compact-slider"
                    style={{
                      background: `linear-gradient(to right, #10b981 0%, #10b981 ${manualLayerProgress}%, #e5e7eb ${manualLayerProgress}%, #e5e7eb 100%)`
                    }}
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => onManualLayerChange({ target: { value: Math.max(0, manualLayerIndex - 1) } })}
                    disabled={manualLayerIndex <= 0}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 disabled:bg-gray-300 rounded-md text-sm font-medium transition-colors shadow-sm"
                  >
                    Previous
                  </button>
                  
                  <button
                    onClick={() => onManualLayerChange({ target: { value: Math.min(maxLayerIndex, manualLayerIndex + 1) } })}
                    disabled={manualLayerIndex >= maxLayerIndex}
                    className="flex-1 px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white disabled:opacity-40 disabled:bg-gray-300 rounded-md text-sm font-medium transition-colors shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Last Column: Analytics & Actions */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-gray-800 font-medium text-sm">System Analytics</h4>
                <p className="text-gray-500 text-xs">Performance & actions</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={onSave}
                disabled={!projectId}
                className="w-full flex items-center justify-center space-x-2 p-3 bg-[#3A4454] hover:bg-[#5B7B9A] text-white disabled:opacity-50 disabled:bg-gray-300 transition-colors font-medium text-sm rounded-md shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save Analysis</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleUploadCurrentMasks}
                  disabled={!segmentationData || uploadingMasks}
                  className="flex items-center justify-center space-x-1 p-2.5 bg-[#5B7B9A] hover:bg-[#3A4454] text-white disabled:opacity-50 disabled:bg-gray-300 transition-colors text-sm rounded-md shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploadingMasks ? 'Syncing...' : 'Upload'}</span>
                </button>

                <button
                  onClick={handleUploadAllMasks}
                  disabled={!segmentationData || uploadingMasks}
                  className="flex items-center justify-center space-x-1 p-2.5 bg-[#FDBA74] hover:bg-orange-400 text-white disabled:opacity-50 disabled:bg-gray-300 transition-colors text-sm rounded-md shadow-sm"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Batch</span>
                </button>
              </div>
              
              {projectId && (
                <button
                  onClick={onExport}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors font-medium text-sm rounded-md shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Project</span>
                </button>
              )}
            </div>

            {uploadingMasks && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-700 text-xs">Syncing to cloud...</span>
                </div>
              </div>
            )}
          </div>

          
        </div>
      </div>

      {/* Custom Styling */}
      <style jsx>{`
        .compact-slider::-webkit-slider-thumb {
          appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }
        
        .compact-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }
        
        .compact-slider::-moz-range-thumb {
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      {/* System Status Footer - MOVED HERE from MedicalSegmentationDisplay */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-t border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full shadow-sm ${
                processingComplete ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <span className="text-white font-medium">
                {processingComplete ? 'System Ready' : 'System Initializing'}
              </span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-gray-300 text-sm">
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalControlPanel;
import React, { useState, useEffect } from 'react';
import { 
  Monitor, Clock, Layers, Play, Pause, ChevronLeft, ChevronRight, 
  Save, Download, Activity, Cpu, Database, Shield, Upload, Cloud, 
  BarChart3, Settings, Zap
} from 'lucide-react';

const MedicalControlPanel = ({ 
  currentTimeIndex, maxTimeIndex, currentLayerIndex, maxLayerIndex,
  onTimeChange, onLayerChange, onSave, onExport, projectId, processingComplete,
  handleUploadCurrentMasks, handleUploadAllMasks, uploadingMasks, segmentationData
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

  const timeProgress = maxTimeIndex > 0 ? (currentTimeIndex / maxTimeIndex) * 100 : 0;
  const layerProgress = maxLayerIndex > 0 ? (currentLayerIndex / maxLayerIndex) * 100 : 0;

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
          </div>
        </div>

        {/* Compact 3-Column Layout */}
        <div className="grid grid-cols-3 gap-6">
          
          {/* Column 1: Temporal Control - Compact */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-gray-800 font-medium text-sm">Temporal Control</h4>
                <p className="text-gray-500 text-xs">Cardiac cycle progression</p>
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
              
              {/* Compact Slider */}
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

              {/* Compact Controls */}
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

          {/* Column 2: Spatial Control - Compact */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Layers className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h4 className="text-gray-800 font-medium text-sm">Spatial Control</h4>
                <p className="text-gray-500 text-xs">Cross-sectional navigation</p>
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
              
              {/* Compact Slider */}
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

              {/* Compact Navigation */}
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

          {/* Column 3: Compact Analytics & Actions */}
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

            {/* Compact Analytics */}
            {/* <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 bg-blue-100 rounded">
                  <div className="text-blue-700 font-semibold text-lg">{maxTimeIndex + 1}</div>
                  <div className="text-blue-600 text-xs">Frames</div>
                </div>
                
                <div className="text-center p-2 bg-amber-100 rounded">
                  <div className="text-amber-700 font-semibold text-lg">{maxLayerIndex + 1}</div>
                  <div className="text-amber-600 text-xs">Slices</div>
                </div>
                
                <div className="text-center p-2 bg-emerald-100 rounded">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${
                    processingComplete ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                  }`}></div>
                  <div className="text-emerald-600 text-xs">
                    {processingComplete ? 'Ready' : 'Loading'}
                  </div>
                </div>
              </div>
            </div> */}

            {/* Compact Actions */}
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

            {/* Compact Status */}
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

      {/* Compact Custom Styling */}
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
    </div>
  );
};

export default MedicalControlPanel;
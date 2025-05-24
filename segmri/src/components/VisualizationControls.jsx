import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Save, 
  Download, 
  Upload, 
  Cloud,
  Layers,
  Clock,
  Settings,
  Info
} from 'lucide-react';

const VisualizationControls = ({
  currentTimeIndex,
  maxTimeIndex,
  currentLayerIndex,
  maxLayerIndex,
  onTimeSliderChange,
  onLayerSliderChange,
  onSave,
  onExport,
  onUploadCurrentMasks,
  onUploadAllMasks,
  onCheckResults,
  uploadingMasks,
  isProcessing,
  processingComplete
}) => {
  const handlePreviousFrame = () => {
    if (currentTimeIndex > 0) {
      onTimeSliderChange({ target: { value: currentTimeIndex - 1 } });
    }
  };

  const handleNextFrame = () => {
    if (currentTimeIndex < maxTimeIndex) {
      onTimeSliderChange({ target: { value: currentTimeIndex + 1 } });
    }
  };

  const handlePreviousSlice = () => {
    if (currentLayerIndex > 0) {
      onLayerSliderChange({ target: { value: currentLayerIndex - 1 } });
    }
  };

  const handleNextSlice = () => {
    if (currentLayerIndex < maxLayerIndex) {
      onLayerSliderChange({ target: { value: currentLayerIndex + 1 } });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Settings size={18} className="text-gray-700" />
          Navigation Controls
        </h4>
        <p className="text-sm text-gray-600 mt-1">
          Browse through frames and slices
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Time Frame Navigation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clock size={16} />
              Time Frame
            </label>
            <span className="text-sm text-gray-500">
              {currentTimeIndex + 1} / {maxTimeIndex + 1}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousFrame}
              disabled={currentTimeIndex <= 0}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous Frame"
            >
              <SkipBack size={16} />
            </button>
            
            <input
              type="range"
              min="0"
              max={maxTimeIndex}
              value={currentTimeIndex}
              onChange={onTimeSliderChange}
              className="flex-1 accent-blue-500"
            />
            
            <button
              onClick={handleNextFrame}
              disabled={currentTimeIndex >= maxTimeIndex}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next Frame"
            >
              <SkipForward size={16} />
            </button>
          </div>
        </div>

        {/* Layer/Slice Navigation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Layers size={16} />
              Slice Layer
            </label>
            <span className="text-sm text-gray-500">
              {currentLayerIndex + 1} / {maxLayerIndex + 1}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousSlice}
              disabled={currentLayerIndex <= 0}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous Slice"
            >
              <SkipBack size={16} />
            </button>
            
            <input
              type="range"
              min="0"
              max={maxLayerIndex}
              value={currentLayerIndex}
              onChange={onLayerSliderChange}
              className="flex-1 accent-blue-500"
            />
            
            <button
              onClick={handleNextSlice}
              disabled={currentLayerIndex >= maxLayerIndex}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next Slice"
            >
              <SkipForward size={16} />
            </button>
          </div>
        </div>

        {/* Quick Navigation Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-800 space-y-1">
            <div className="flex justify-between">
              <span>Total Frames:</span>
              <span className="font-medium">{maxTimeIndex + 1}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Slices:</span>
              <span className="font-medium">{maxLayerIndex + 1}</span>
            </div>
            <div className="flex justify-between">
              <span>Current Position:</span>
              <span className="font-medium">F{currentTimeIndex + 1}/S{currentLayerIndex + 1}</span>
            </div>
          </div>
        </div>

        {/* Project Actions */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <h5 className="text-sm font-medium text-gray-700">Project Actions</h5>
          
          <div className="grid grid-cols-1 gap-2">
            {/* Show Check Results button if processing but not complete */}
            {!processingComplete && onCheckResults && (
              <>
                <button
                  onClick={onCheckResults}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-top-transparent"></div>
                      Checking...
                    </>
                  ) : (
                    <>
                      <Settings size={16} />
                      Check Results
                    </>
                  )}
                </button>
                
                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                  <div className="flex items-start gap-2">
                    <Info size={12} className="text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p><strong>Processing Status:</strong> AI segmentation is running on GPU servers.</p>
                      <p>Click "Check Results" periodically to see if processing is complete.</p>
                      <p><em>Typical processing time: 2-10 minutes</em></p>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Only show save/export if processing is complete */}
            {processingComplete && (
              <>
                <button
                  onClick={onSave}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Save size={16} />
                  Save Project
                </button>
                
                <button
                  onClick={onExport}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Download size={16} />
                  Export Results
                </button>
              </>
            )}
          </div>
        </div>

        {/* Upload Actions - Only show if processing is complete */}
        {processingComplete && (
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-medium text-gray-700">Upload to Cloud</h5>
              {uploadingMasks && (
                <div className="animate-spin text-blue-600">
                  <Cloud size={16} />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={onUploadCurrentMasks}
                disabled={uploadingMasks}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={16} />
                {uploadingMasks ? 'Uploading...' : 'Upload Current'}
              </button>
              
              <button
                onClick={onUploadAllMasks}
                disabled={uploadingMasks}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Cloud size={16} />
                {uploadingMasks ? 'Processing...' : 'Upload All Masks'}
              </button>
            </div>
            
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <div className="flex items-start gap-2">
                <Info size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p><strong>Current:</strong> Upload masks from current frame/slice only</p>
                  <p><strong>All:</strong> Batch upload all decoded masks to S3 storage</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <h5 className="text-sm font-medium text-gray-700">Keyboard Shortcuts</h5>
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>← / →</span>
              <span>Navigate frames</span>
            </div>
            <div className="flex justify-between">
              <span>↑ / ↓</span>
              <span>Navigate slices</span>
            </div>
            <div className="flex justify-between">
              <span>Space</span>
              <span>Toggle playback</span>
            </div>
            <div className="flex justify-between">
              <span>S</span>
              <span>Save project</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizationControls;
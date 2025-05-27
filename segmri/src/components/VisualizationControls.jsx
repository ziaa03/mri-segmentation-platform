import React, { useState, useEffect, useCallback } from 'react';
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
  Info,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FastForward,
  Rewind,
  Maximize2,
  Grid,
  Activity,
  Target,
  Timer,
  Zap
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
  // Enhanced state management
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoLoop, setAutoLoop] = useState(false);
  const [playbackDirection, setPlaybackDirection] = useState('forward'); // 'forward' or 'backward'
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [jumpSize, setJumpSize] = useState(1);
  const [bookmarks, setBookmarks] = useState([]);
  const [playbackMode, setPlaybackMode] = useState('time'); // 'time' or 'slice'

  // Playback functionality
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        if (playbackMode === 'time') {
          handleTimePlayback();
        } else {
          handleSlicePlayback();
        }
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, currentTimeIndex, currentLayerIndex, playbackDirection, autoLoop, maxTimeIndex, maxLayerIndex, playbackMode]);

  const handleTimePlayback = () => {
    if (playbackDirection === 'forward') {
      if (currentTimeIndex < maxTimeIndex) {
        onTimeSliderChange({ target: { value: currentTimeIndex + 1 } });
      } else if (autoLoop) {
        onTimeSliderChange({ target: { value: 0 } });
      } else {
        setIsPlaying(false);
      }
    } else {
      if (currentTimeIndex > 0) {
        onTimeSliderChange({ target: { value: currentTimeIndex - 1 } });
      } else if (autoLoop) {
        onTimeSliderChange({ target: { value: maxTimeIndex } });
      } else {
        setIsPlaying(false);
      }
    }
  };

  const handleSlicePlayback = () => {
    if (playbackDirection === 'forward') {
      if (currentLayerIndex < maxLayerIndex) {
        onLayerSliderChange({ target: { value: currentLayerIndex + 1 } });
      } else if (autoLoop) {
        onLayerSliderChange({ target: { value: 0 } });
      } else {
        setIsPlaying(false);
      }
    } else {
      if (currentLayerIndex > 0) {
        onLayerSliderChange({ target: { value: currentLayerIndex - 1 } });
      } else if (autoLoop) {
        onLayerSliderChange({ target: { value: maxLayerIndex } });
      } else {
        setIsPlaying(false);
      }
    }
  };

  const togglePlayback = () => setIsPlaying(!isPlaying);

  const handleJump = (direction, mode, size = jumpSize) => {
    if (mode === 'time') {
      const newIndex = direction === 'forward' 
        ? Math.min(maxTimeIndex, currentTimeIndex + size)
        : Math.max(0, currentTimeIndex - size);
      onTimeSliderChange({ target: { value: newIndex } });
    } else {
      const newIndex = direction === 'forward'
        ? Math.min(maxLayerIndex, currentLayerIndex + size)
        : Math.max(0, currentLayerIndex - size);
      onLayerSliderChange({ target: { value: newIndex } });
    }
  };

  const addBookmark = () => {
    const bookmark = {
      id: Date.now(),
      timeIndex: currentTimeIndex,
      layerIndex: currentLayerIndex,
      name: `Bookmark ${bookmarks.length + 1}`
    };
    setBookmarks([...bookmarks, bookmark]);
  };

  const goToBookmark = (bookmark) => {
    onTimeSliderChange({ target: { value: bookmark.timeIndex } });
    onLayerSliderChange({ target: { value: bookmark.layerIndex } });
  };

  const removeBookmark = (bookmarkId) => {
    setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
  };

  const resetToStart = () => {
    onTimeSliderChange({ target: { value: 0 } });
    onLayerSliderChange({ target: { value: 0 } });
    setIsPlaying(false);
  };

  const goToEnd = () => {
    onTimeSliderChange({ target: { value: maxTimeIndex } });
    onLayerSliderChange({ target: { value: maxLayerIndex } });
    setIsPlaying(false);
  };

  // Calculate progress percentages
  const timeProgress = maxTimeIndex > 0 ? (currentTimeIndex / maxTimeIndex) * 100 : 0;
  const layerProgress = maxLayerIndex > 0 ? (currentLayerIndex / maxLayerIndex) * 100 : 0;

  return (
    <div className="bg-white rounded-sm shadow-l overflow-hidden">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-4 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold flex items-center gap-3">
                <div className="p-2">
                  <Settings size={20} />
                </div>
                Navigation Controls
                {isPlaying && <div className="animate-pulse">
                  <Activity size={16} className="text-green-300" />
                </div>}
              </h4>
              <p className="text-indigo-100 mt-1 text-sm">
                Advanced playback and navigation system
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Enhanced Frame Navigation */}
        <div className="space-y-6">
          {/* Time Frame Navigation */}
          <div className="bg-white rounded-l p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                Time Frame
              </label>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">
                  {currentTimeIndex + 1} / {maxTimeIndex + 1}
                </span>
                <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {timeProgress.toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="relative mb-3">
              <input
                type="range"
                min="0"
                max={maxTimeIndex}
                value={currentTimeIndex}
                onChange={onTimeSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${timeProgress}%, #E5E7EB ${timeProgress}%, #E5E7EB 100%)`
                }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleJump('backward', 'time')}
                disabled={currentTimeIndex <= 0}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              
              <button
                onClick={() => handleJump('forward', 'time')}
                disabled={currentTimeIndex >= maxTimeIndex}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Layer/Slice Navigation */}
          <div className="bg-white rounded-l p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Layers size={16} className="text-purple-600" />
                Slice Layer
              </label>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">
                  {currentLayerIndex + 1} / {maxLayerIndex + 1}
                </span>
                <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                  {layerProgress.toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="relative mb-3">
              <input
                type="range"
                min="0"
                max={maxLayerIndex}
                value={currentLayerIndex}
                onChange={onLayerSliderChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                style={{
                  background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${layerProgress}%, #E5E7EB ${layerProgress}%, #E5E7EB 100%)`
                }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleJump('backward', 'slice')}
                disabled={currentLayerIndex <= 0}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              
              <button
                onClick={() => handleJump('forward', 'slice')}
                disabled={currentLayerIndex >= maxLayerIndex}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Controls (Collapsible) */}
        {showAdvancedControls && (
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-5 border border-orange-200 space-y-4">
            <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Zap size={16} className="text-orange-600" />
              Advanced Features
            </h5>

            {/* Bookmarks */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Bookmarks</span>
                <button
                  onClick={addBookmark}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
                >
                  Add Bookmark
                </button>
              </div>
              {bookmarks.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No bookmarks yet</p>
              ) : (
                <div className="space-y-2">
                  {bookmarks.map((bookmark) => (
                    <div key={bookmark.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-xs font-medium">{bookmark.name}</span>
                      <span className="text-xs text-gray-500">F{bookmark.timeIndex + 1}/S{bookmark.layerIndex + 1}</span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => goToBookmark(bookmark)}
                          className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded"
                        >
                          Go
                        </button>
                        <button
                          onClick={() => removeBookmark(bookmark.id)}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Navigation Info */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-5 border border-blue-200">
          <h5 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Info size={16} className="text-blue-600" />
            Session Overview
          </h5>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-600 mb-2">Dataset Dimensions</div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Total Frames:</span>
                  <span className="font-semibold text-blue-600">{maxTimeIndex + 1}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Total Slices:</span>
                  <span className="font-semibold text-purple-600">{maxLayerIndex + 1}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Total Images:</span>
                  <span className="font-semibold text-green-600">{(maxTimeIndex + 1) * (maxLayerIndex + 1)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-600 mb-2">Current Position</div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Frame:</span>
                  <span className="font-semibold text-blue-600">{currentTimeIndex + 1}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Slice:</span>
                  <span className="font-semibold text-purple-600">{currentLayerIndex + 1}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Progress:</span>
                  <span className="font-semibold text-indigo-600">
                    {Math.round(((currentTimeIndex * (maxLayerIndex + 1) + currentLayerIndex) / ((maxTimeIndex + 1) * (maxLayerIndex + 1))) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Project Actions */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Settings size={16} className="text-gray-600" />
            Project Actions
          </h5>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Show Check Results button if processing but not complete */}
            {!processingComplete && onCheckResults && (
              <>
                <button
                  onClick={onCheckResults}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-top-transparent"></div>
                      <span className="font-medium">Checking Status...</span>
                    </>
                  ) : (
                    <>
                      <Timer size={20} />
                      <span className="font-medium">Check Processing Results</span>
                    </>
                  )}
                </button>
                
                <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Info size={16} className="text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h6 className="font-semibold text-orange-800 mb-1">Processing Status</h6>
                      <p className="text-sm text-orange-700 mb-2">
                        AI segmentation is currently running on our GPU servers. This process typically takes 2-10 minutes depending on dataset size.
                      </p>
                      <div className="flex items-center gap-2 text-xs text-orange-600">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                        <span>Processing in progress...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Only show save/export if processing is complete */}
            {processingComplete && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onSave}
                  className="flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Save size={18} />
                  <span className="font-medium">Save Project</span>
                </button>
                
                <button
                  onClick={onExport}
                  className="flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Download size={18} />
                  <span className="font-medium">Export Results</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom CSS for slider styling */}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #3B82F6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        
        .slider-thumb::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #3B82F6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default VisualizationControls;
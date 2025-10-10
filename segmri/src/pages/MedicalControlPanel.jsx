import React, { useState, useEffect } from 'react';
import { 
  Monitor, Clock, Layers, Play, Pause, ChevronLeft, ChevronRight, 
  Save, Download, Activity, Cpu, Database, Shield, Upload, Cloud, 
  BarChart3, Settings, Zap, Edit
} from 'lucide-react';

const MedicalControlPanel = ({ 
  currentTimeIndex, maxTimeIndex, currentLayerIndex, maxLayerIndex,
  onTimeChange, onLayerChange, projectId, processingComplete,
  segmentationData,
  isEditMode, 
  manualTimeIndex, 
  manualLayerIndex,
  onManualTimeChange,
  onManualLayerChange,
  isManualPlaying,
  setIsManualPlaying,
  manualPlaybackSpeed,
  setManualPlaybackSpeed,
  api 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // State for Save Current Progress
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  
  // State for Export Project
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);

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
  const manualTimeProgress = maxTimeIndex > 0 ? (manualTimeIndex / maxTimeIndex) * 100 : 0;
  const manualLayerProgress = maxLayerIndex > 0 ? (manualLayerIndex / maxLayerIndex) * 100 : 0;

  // Save Current Progress - Flag project as saved
  const handleSaveProgress = async () => {
    if (!projectId) {
      setSaveMessage({ type: 'error', text: 'No project ID available' });
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const response = await api.patch('/project/save-project', {
        projectId: projectId,
        isSaved: true
      });
      
      if (response.data && response.data.success) {
        setSaveMessage({ type: 'success', text: 'Project saved successfully!' });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        throw new Error(response.data?.message || 'Failed to save project');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save project';
      setSaveMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setSaveMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Export Project 
  const handleExportProject = async () => {
    if (!projectId) {
      setExportMessage({ type: 'error', text: 'No project ID available' });
      setTimeout(() => setExportMessage(null), 3000);
      return;
    }

    setIsExporting(true);
    setExportMessage({ type: 'info', text: 'Generating NIfTI export...' });
    
    try {
      const response = await api.get(`/segmentation/export-project-data/${projectId}`);
      
      if (response.data.success && response.data.exportPackageUrl) {
        setExportMessage({ type: 'success', text: 'Export ready! Downloading...' });
        
        // Automatically download the file using the presigned URL
        const link = document.createElement('a');
        link.href = response.data.exportPackageUrl;
        link.download = response.data.suggestedFilename || 'segmentation.nii.gz';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => setExportMessage(null), 3000);
      } else {
        throw new Error(response.data?.message || 'Failed to generate export');
      }
    } catch (error) {
      console.error('Error exporting project:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to export project';
      setExportMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setExportMessage(null), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-800 shadow-lg border border-slate-700">
      {/* Main Control Grid */}
      <div className={`grid gap-4 p-4 ${isEditMode ? 'grid-cols-5' : 'grid-cols-3'}`}>
        
        {/* AI Temporal Control */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-600/20 rounded-lg border border-blue-500/30">
              <Clock className="w-3 h-3 text-blue-400" />
            </div>
            <div>
              <h4 className="text-slate-200 font-medium text-xs uppercase tracking-wide">
                {isEditMode ? 'AI Temporal' : 'Temporal'}
              </h4>
              <p className="text-slate-500 text-xs">{isEditMode ? 'Reference' : 'Cardiac cycle'}</p>
            </div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs uppercase tracking-wide">Frame</span>
              <div className="text-right">
                <div className="text-slate-200 font-mono text-sm font-semibold">
                  {String(currentTimeIndex + 1).padStart(2, '0')}/{String(maxTimeIndex + 1).padStart(2, '0')}
                </div>
                <div className="text-slate-500 text-xs">{timeProgress.toFixed(0)}%</div>
              </div>
            </div>
            
            <div className="mb-3">
              <input
                type="range"
                min="0"
                max={maxTimeIndex}
                value={currentTimeIndex}
                onChange={onTimeChange}
                className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${timeProgress}%, #334155 ${timeProgress}%, #334155 100%)`
                }}
              />
            </div>

            <div className="flex items-center justify-center space-x-2">
              <div className="group relative">
                <button
                  onClick={() => onTimeChange({ target: { value: Math.max(0, currentTimeIndex - 1) } })}
                  disabled={currentTimeIndex <= 0}
                  className="p-2 bg-slate-700/90 hover:bg-slate-600/90 backdrop-blur-sm text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all border border-slate-600/50"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                  Previous frame
                </div>
              </div>
              
              <div className="group relative">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!processingComplete}
                  className="p-2 bg-blue-600/90 hover:bg-blue-500/90 backdrop-blur-sm text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all shadow-md border border-blue-500/30"
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                  {isPlaying ? 'Pause' : 'Play'}
                </div>
              </div>
              
              <select 
                value={playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="text-xs bg-slate-700/90 backdrop-blur-sm border border-slate-600/50 text-slate-200 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0.5}>0.5×</option>
                <option value={1}>1.0×</option>
                <option value={2}>2.0×</option>
              </select>
              
              <div className="group relative">
                <button
                  onClick={() => onTimeChange({ target: { value: Math.min(maxTimeIndex, currentTimeIndex + 1) } })}
                  disabled={currentTimeIndex >= maxTimeIndex}
                  className="p-2 bg-slate-700/90 hover:bg-slate-600/90 backdrop-blur-sm text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all border border-slate-600/50"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                  Next frame
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Spatial Control */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-amber-600/20 rounded-lg border border-amber-500/30">
              <Layers className="w-3 h-3 text-amber-400" />
            </div>
            <div>
              <h4 className="text-slate-200 font-medium text-xs uppercase tracking-wide">
                {isEditMode ? 'AI Spatial' : 'Spatial'}
              </h4>
              <p className="text-slate-500 text-xs">{isEditMode ? 'Reference' : 'Cross-section'}</p>
            </div>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs uppercase tracking-wide">Slice</span>
              <div className="text-right">
                <div className="text-slate-200 font-mono text-sm font-semibold">
                  {String(currentLayerIndex + 1).padStart(2, '0')}/{String(maxLayerIndex + 1).padStart(2, '0')}
                </div>
                <div className="text-slate-500 text-xs">{layerProgress.toFixed(0)}%</div>
              </div>
            </div>
            
            <div className="mb-3">
              <input
                type="range"
                min="0"
                max={maxLayerIndex}
                value={currentLayerIndex}
                onChange={onLayerChange}
                className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${layerProgress}%, #334155 ${layerProgress}%, #334155 100%)`
                }}
              />
            </div>

            <div className="flex space-x-2">
              <div className="group relative flex-1">
                <button
                  onClick={() => onLayerChange({ target: { value: Math.max(0, currentLayerIndex - 1) } })}
                  disabled={currentLayerIndex <= 0}
                  className="w-full px-3 py-2 bg-slate-700/90 hover:bg-slate-600/90 backdrop-blur-sm text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-all border border-slate-600/50"
                >
                  Previous
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                  Previous slice
                </div>
              </div>
              
              <div className="group relative flex-1">
                <button
                  onClick={() => onLayerChange({ target: { value: Math.min(maxLayerIndex, currentLayerIndex + 1) } })}
                  disabled={currentLayerIndex >= maxLayerIndex}
                  className="w-full px-3 py-2 bg-slate-700/90 hover:bg-slate-600/90 backdrop-blur-sm text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-all border border-slate-600/50"
                >
                  Next
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                  Next slice
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Temporal Control (Edit Mode Only) */}
        {isEditMode && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-purple-600/20 rounded-lg border border-purple-500/30">
                <Clock className="w-3 h-3 text-purple-400" />
              </div>
              <div>
                <h4 className="text-slate-200 font-medium text-xs uppercase tracking-wide">Manual Temporal</h4>
                <p className="text-slate-500 text-xs">Edit timeline</p>
              </div>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs uppercase tracking-wide">Frame</span>
                <div className="text-right">
                  <div className="text-slate-200 font-mono text-sm font-semibold">
                    {String(manualTimeIndex + 1).padStart(2, '0')}/{String(maxTimeIndex + 1).padStart(2, '0')}
                  </div>
                  <div className="text-slate-500 text-xs">{manualTimeProgress.toFixed(0)}%</div>
                </div>
              </div>
              
              <div className="mb-3">
                <input
                  type="range"
                  min="0"
                  max={maxTimeIndex}
                  value={manualTimeIndex}
                  onChange={onManualTimeChange}
                  className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #9333ea 0%, #9333ea ${manualTimeProgress}%, #334155 ${manualTimeProgress}%, #334155 100%)`
                  }}
                />
              </div>

              <div className="flex items-center justify-center space-x-2">
                <div className="group relative">
                  <button
                    onClick={() => onManualTimeChange({ target: { value: Math.max(0, manualTimeIndex - 1) } })}
                    disabled={manualTimeIndex <= 0}
                    className="p-2 bg-purple-700/90 hover:bg-purple-600/90 backdrop-blur-sm text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all border border-purple-600/50"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                    Previous frame
                  </div>
                </div>
                
                <div className="group relative">
                  <button
                    onClick={() => setIsManualPlaying(!isManualPlaying)}
                    className="p-2 bg-purple-600/90 hover:bg-purple-500/90 backdrop-blur-sm text-white rounded-lg transition-all shadow-md border border-purple-500/30"
                  >
                    {isManualPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                    {isManualPlaying ? 'Pause' : 'Play'}
                  </div>
                </div>
                
                <select 
                  value={manualPlaybackSpeed} 
                  onChange={(e) => setManualPlaybackSpeed(parseFloat(e.target.value))}
                  className="text-xs bg-slate-700/90 backdrop-blur-sm border border-slate-600/50 text-slate-200 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1.0×</option>
                  <option value={2}>2.0×</option>
                </select>
                
                <div className="group relative">
                  <button
                    onClick={() => onManualTimeChange({ target: { value: Math.min(maxTimeIndex, manualTimeIndex + 1) } })}
                    disabled={manualTimeIndex >= maxTimeIndex}
                    className="p-2 bg-purple-700/90 hover:bg-purple-600/90 backdrop-blur-sm text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all border border-purple-600/50"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                    Next frame
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Spatial Control (Edit Mode Only) */}
        {isEditMode && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-emerald-600/20 rounded-lg border border-emerald-500/30">
                <Layers className="w-3 h-3 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-slate-200 font-medium text-xs uppercase tracking-wide">Manual Spatial</h4>
                <p className="text-slate-500 text-xs">Edit slices</p>
              </div>
            </div>
            
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs uppercase tracking-wide">Slice</span>
                <div className="text-right">
                  <div className="text-slate-200 font-mono text-sm font-semibold">
                    {String(manualLayerIndex + 1).padStart(2, '0')}/{String(maxLayerIndex + 1).padStart(2, '0')}
                  </div>
                  <div className="text-slate-500 text-xs">{manualLayerProgress.toFixed(0)}%</div>
                </div>
              </div>
              
              <div className="mb-3">
                <input
                  type="range"
                  min="0"
                  max={maxLayerIndex}
                  value={manualLayerIndex}
                  onChange={onManualLayerChange}
                  className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${manualLayerProgress}%, #334155 ${manualLayerProgress}%, #334155 100%)`
                  }}
                />
              </div>

              <div className="flex space-x-2">
                <div className="group relative flex-1">
                  <button
                    onClick={() => onManualLayerChange({ target: { value: Math.max(0, manualLayerIndex - 1) } })}
                    disabled={manualLayerIndex <= 0}
                    className="w-full px-3 py-2 bg-emerald-700/90 hover:bg-emerald-600/90 backdrop-blur-sm text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-all border border-emerald-600/50"
                  >
                    Previous
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                    Previous slice
                  </div>
                </div>
                
                <div className="group relative flex-1">
                  <button
                    onClick={() => onManualLayerChange({ target: { value: Math.min(maxLayerIndex, manualLayerIndex + 1) } })}
                    disabled={manualLayerIndex >= maxLayerIndex}
                    className="w-full px-3 py-2 bg-emerald-700/90 hover:bg-emerald-600/90 backdrop-blur-sm text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-all border border-emerald-600/50"
                  >
                    Next
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                    Next slice
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Actions */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-teal-600/20 rounded-lg border border-teal-500/30">
              <BarChart3 className="w-3 h-3 text-teal-400" />
            </div>
            <div>
              <h4 className="text-slate-200 font-medium text-xs uppercase tracking-wide">Actions</h4>
              <p className="text-slate-500 text-xs">System operations</p>
            </div>
          </div>

          <div className="space-y-2">
            {/* ✅ FIXED: Save Current Progress Button */}
            <div className="group relative">
              <button
                onClick={handleSaveProgress}
                disabled={!projectId || isSaving}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-slate-700/90 hover:bg-slate-600/90 backdrop-blur-sm text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium text-xs rounded-lg shadow-sm border border-slate-600/50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3" />
                    <span>Mark Project as Saved</span>
                  </>
                )}
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                Mark project as saved (prevents auto-deletion)
              </div>
            </div>

            {/* ✅ Save Progress Feedback Message */}
            {saveMessage && (
              <div className={`p-2 rounded text-xs font-medium text-center ${
                saveMessage.type === 'success' 
                  ? 'bg-green-600/20 border border-green-500/30 text-green-300' 
                  : 'bg-red-600/20 border border-red-500/30 text-red-300'
              }`}>
                {saveMessage.text}
              </div>
            )}
            
            {/* Export Project Button */}
            {projectId && (
              <>
                <div className="group relative">
                  <button
                    onClick={handleExportProject}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-teal-600/90 hover:bg-teal-500/90 backdrop-blur-sm text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium text-xs rounded-lg shadow-sm border border-teal-500/30"
                  >
                    {isExporting ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3" />
                        <span>Export Project (NIfTI)</span>
                      </>
                    )}
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                    Download segmentation as NIfTI file
                  </div>
                </div>

                {/* Export Feedback Message */}
                {exportMessage && (
                  <div className={`p-2 rounded text-xs font-medium text-center ${
                    exportMessage.type === 'success' 
                      ? 'bg-green-600/20 border border-green-500/30 text-green-300'
                      : exportMessage.type === 'info'
                      ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300'
                      : 'bg-red-600/20 border border-red-500/30 text-red-300'
                  }`}>
                    {exportMessage.text}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Footer */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-t border-slate-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full shadow-sm ${
              processingComplete ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-pulse'
            }`} />
            <span className="text-slate-300 text-xs font-medium">
              {processingComplete ? 'System Ready' : 'System Initializing'}
            </span>
          </div>
          
          <div className="text-slate-400 text-xs">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Custom Slider Styling */}
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        input[type="range"]::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export default MedicalControlPanel;
import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

const DebugPanel = ({ 
  isEditMode,
  activeManualSegmentation,
  projectId,
  currentTimeIndex,
  currentLayerIndex,
  manualTimeIndex,
  manualLayerIndex,
  drawingHistory,
  segmentationData,
  selectedClass,
  api
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const debugInfo = {
    editMode: isEditMode,
    projectId: projectId || 'NOT SET',
    apiInstance: api ? 'DEFINED' : 'UNDEFINED',
    currentPosition: {
      aiFrame: currentTimeIndex,
      aiSlice: currentLayerIndex,
      manualFrame: manualTimeIndex,
      manualSlice: manualLayerIndex,
    },
    selectedClass: selectedClass,
    drawingHistory: {
      totalActions: drawingHistory?.length || 0,
      brushStrokes: drawingHistory?.filter(a => a.type === 'brush').length || 0,
      eraserStrokes: drawingHistory?.filter(a => a.type === 'eraser').length || 0,
      boundingBoxes: drawingHistory?.filter(a => a.type === 'boundingbox').length || 0,
    },
    activeManualSegmentation: activeManualSegmentation ? {
      exists: true,
      isSaved: activeManualSegmentation.isSaved,
      name: activeManualSegmentation.name,
      frameCount: activeManualSegmentation.frames?.length || 0,
      frames: activeManualSegmentation.frames?.map(f => ({
        frameIndex: f.frameindex,
        sliceCount: f.slices?.length || 0,
        slices: f.slices?.map(s => ({
          sliceIndex: s.sliceindex,
          maskCount: s.segmentationmasks?.length || 0,
          classes: s.segmentationmasks?.map(m => m.class) || [],
          hasRLE: s.segmentationmasks?.every(m => !!m.segmentationmaskcontents) || false
        })) || []
      })) || []
    } : {
      exists: false
    },
    segmentationData: segmentationData ? {
      exists: true,
      name: segmentationData.name,
      totalFrames: segmentationData.masks?.length || 0,
      segmentsCount: segmentationData.segments?.length || 0
    } : {
      exists: false
    }
  };

  const copyToClipboard = () => {
    const text = JSON.stringify(debugInfo, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Validation checks
  const validations = {
    hasProjectId: !!projectId,
    hasApi: !!api,
    hasActiveManualSeg: !!activeManualSegmentation,
    hasFrames: (activeManualSegmentation?.frames?.length || 0) > 0,
    hasEditableData: activeManualSegmentation?.frames?.some(f => 
      f.slices?.some(s => s.segmentationmasks?.length > 0)
    ) || false,
    allMasksHaveRLE: activeManualSegmentation?.frames?.every(f =>
      f.slices?.every(s =>
        s.segmentationmasks?.every(m => !!m.segmentationmaskcontents)
      )
    ) || false
  };

  const canSave = validations.hasProjectId && 
                  validations.hasApi && 
                  validations.hasActiveManualSeg && 
                  validations.hasFrames &&
                  validations.hasEditableData &&
                  validations.allMasksHaveRLE;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96 max-h-[80vh] overflow-hidden bg-gray-900 border-2 border-purple-500 rounded-lg shadow-2xl">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-purple-600 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-2">
          <Bug className="w-5 h-5 text-white" />
          <span className="font-bold text-white">Debug Panel</span>
          {!canSave && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
              Issues Detected
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard();
            }}
            className="p-1 hover:bg-purple-700 rounded transition-colors"
            title="Copy debug info"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-300" />
            ) : (
              <Copy className="w-4 h-4 text-white" />
            )}
          </button>
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-white" />
          ) : (
            <ChevronUp className="w-5 h-5 text-white" />
          )}
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-4 overflow-y-auto max-h-[70vh] text-xs">
          
          {/* Validation Status */}
          <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
            <h3 className="text-sm font-bold text-white mb-2">🔍 Save Validation</h3>
            <div className="space-y-1">
              <ValidationItem 
                label="Project ID" 
                valid={validations.hasProjectId} 
                value={projectId || 'Missing'}
              />
              <ValidationItem 
                label="API Instance" 
                valid={validations.hasApi} 
                value={api ? 'Present' : 'Missing'}
              />
              <ValidationItem 
                label="Active Manual Segmentation" 
                valid={validations.hasActiveManualSeg}
                value={validations.hasActiveManualSeg ? 'Present' : 'Missing'}
              />
              <ValidationItem 
                label="Has Frames" 
                valid={validations.hasFrames}
                value={`${activeManualSegmentation?.frames?.length || 0} frames`}
              />
              <ValidationItem 
                label="Has Editable Data" 
                valid={validations.hasEditableData}
                value={validations.hasEditableData ? 'Yes' : 'No data to save'}
              />
              <ValidationItem 
                label="All Masks Have RLE" 
                valid={validations.allMasksHaveRLE}
                value={validations.allMasksHaveRLE ? 'Yes' : 'Some missing RLE'}
              />
            </div>
            <div className={`mt-3 p-2 rounded font-bold text-center ${
              canSave 
                ? 'bg-green-600 text-white' 
                : 'bg-red-600 text-white'
            }`}>
              {canSave ? '✅ READY TO SAVE' : '❌ CANNOT SAVE'}
            </div>
          </div>

          {/* Current State */}
          <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
            <h3 className="text-sm font-bold text-white mb-2">📊 Current State</h3>
            <div className="space-y-1 text-gray-300 font-mono">
              <div className="flex justify-between">
                <span>Edit Mode:</span>
                <span className={isEditMode ? 'text-green-400' : 'text-red-400'}>
                  {isEditMode ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Selected Class:</span>
                <span className="text-yellow-400">{selectedClass}</span>
              </div>
              <div className="flex justify-between">
                <span>AI Position:</span>
                <span className="text-blue-400">F{currentTimeIndex}/S{currentLayerIndex}</span>
              </div>
              <div className="flex justify-between">
                <span>Manual Position:</span>
                <span className="text-purple-400">F{manualTimeIndex}/S{manualLayerIndex}</span>
              </div>
            </div>
          </div>

          {/* Drawing History */}
          <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
            <h3 className="text-sm font-bold text-white mb-2">🖌️ Drawing History</h3>
            <div className="space-y-1 text-gray-300 font-mono">
              <div className="flex justify-between">
                <span>Total Actions:</span>
                <span className="text-yellow-400">{debugInfo.drawingHistory.totalActions}</span>
              </div>
              <div className="flex justify-between">
                <span>Brush Strokes:</span>
                <span className="text-green-400">{debugInfo.drawingHistory.brushStrokes}</span>
              </div>
              <div className="flex justify-between">
                <span>Eraser Strokes:</span>
                <span className="text-red-400">{debugInfo.drawingHistory.eraserStrokes}</span>
              </div>
              <div className="flex justify-between">
                <span>Bounding Boxes:</span>
                <span className="text-blue-400">{debugInfo.drawingHistory.boundingBoxes}</span>
              </div>
            </div>
          </div>

          {/* Active Manual Segmentation */}
          <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
            <h3 className="text-sm font-bold text-white mb-2">💾 Active Manual Segmentation</h3>
            {debugInfo.activeManualSegmentation.exists ? (
              <>
                <div className="space-y-1 text-gray-300 font-mono mb-2">
                  <div className="flex justify-between">
                    <span>Name:</span>
                    <span className="text-green-400 truncate ml-2" title={debugInfo.activeManualSegmentation.name}>
                      {debugInfo.activeManualSegmentation.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saved:</span>
                    <span className={debugInfo.activeManualSegmentation.isSaved ? 'text-green-400' : 'text-red-400'}>
                      {debugInfo.activeManualSegmentation.isSaved ? 'YES' : 'NO'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Frames:</span>
                    <span className="text-yellow-400">{debugInfo.activeManualSegmentation.frameCount}</span>
                  </div>
                </div>
                
                {/* Frame Details */}
                <div className="mt-2 max-h-40 overflow-y-auto bg-gray-900 rounded p-2">
                  {debugInfo.activeManualSegmentation.frames.map((frame, idx) => (
                    <details key={idx} className="mb-2">
                      <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                        Frame {frame.frameIndex} ({frame.sliceCount} slices)
                      </summary>
                      <div className="ml-4 mt-1 space-y-1">
                        {frame.slices.map((slice, sIdx) => (
                          <div key={sIdx} className="text-gray-400">
                            <div className="flex justify-between">
                              <span>Slice {slice.sliceIndex}:</span>
                              <span className={slice.hasRLE ? 'text-green-400' : 'text-red-400'}>
                                {slice.maskCount} masks {slice.hasRLE ? '✓' : '⚠️ NO RLE'}
                              </span>
                            </div>
                            <div className="text-xs ml-2 text-purple-400">
                              Classes: {slice.classes.join(', ') || 'none'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-red-400 font-mono">NOT INITIALIZED</div>
            )}
          </div>

          {/* Full JSON */}
          <details className="p-3 bg-gray-800 rounded border border-gray-700">
            <summary className="cursor-pointer text-white font-bold mb-2">
              📋 Full Debug JSON
            </summary>
            <pre className="text-xs text-gray-300 overflow-auto max-h-60 bg-gray-900 p-2 rounded mt-2">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

const ValidationItem = ({ label, valid, value }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-gray-300">{label}:</span>
    <div className="flex items-center space-x-2">
      <span className="text-gray-400 text-xs">{value}</span>
      <span className={`font-bold ${valid ? 'text-green-400' : 'text-red-400'}`}>
        {valid ? '✓' : '✗'}
      </span>
    </div>
  </div>
);

export default DebugPanel;
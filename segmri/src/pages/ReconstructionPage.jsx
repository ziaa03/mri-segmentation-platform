import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Cardiac4DReconstruction from '../components/Cardiac4DReconstruction';
import api from '../api/AxiosInstance';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function ReconstructionPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [segmentationData, setSegmentationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSegmentationData = async () => {
      try {
        const response = await api.get(`/segmentation/segmentation-results/${projectId}`);
        
        // Store debug info
        const debug = {
          totalSegmentations: response.data.segmentations?.length || 0,
          segmentations: response.data.segmentations?.map(seg => ({
            name: seg.name,
            isMedSAMOutput: seg.isMedSAMOutput,
            isSaved: seg.isSaved,
            isEditable: seg.isEditable,
            hasMasks: !!(seg.masks && seg.masks.length > 0),
            hasFrames: !!(seg.frames && seg.frames.length > 0),
            maskCount: seg.masks?.length || 0,
            frameCount: seg.frames?.length || 0
          }))
        };
        
        setDebugInfo(debug);
        console.log('🔬 Debug Info:', debug);
        
        if (response.data.success && response.data.segmentations.length > 0) {
          // Find AI segmentation ONLY (isMedSAMOutput: true)
          const aiSegmentation = response.data.segmentations.find(s => s.isMedSAMOutput === true);
          
          console.log('🎯 AI Segmentation Found:', !!aiSegmentation);
          
          if (aiSegmentation) {
            console.log('✅ AI Segmentation Details:', {
              name: aiSegmentation.name,
              hasMasks: !!(aiSegmentation.masks && aiSegmentation.masks.length > 0),
              maskCount: aiSegmentation.masks?.length || 0,
              firstMaskStructure: aiSegmentation.masks?.[0]
            });
            
            setSegmentationData(aiSegmentation);
          } else {
            const errorMsg = 'No AI segmentation found. Only MedSAM AI output can be used for 4D reconstruction.';
            console.error('❌', errorMsg);
            setError(errorMsg);
          }
        } else {
          const errorMsg = 'No segmentation data available';
          console.error('❌', errorMsg);
          setError(errorMsg);
        }
      } catch (error) {
        console.error('❌ Error loading segmentation:', error);
        setError(error.response?.data?.message || error.message || 'Failed to load segmentation data');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadSegmentationData();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading segmentation data...</p>
        </div>
      </div>
    );
  }

  if (error || !segmentationData) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="max-w-2xl mx-auto text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">
            No AI Segmentation Available
          </h1>
          <p className="text-lg text-red-400 mb-6">
            {error || 'No segmentation data found'}
          </p>
          
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6 text-left">
            <h2 className="text-white font-semibold mb-3 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-yellow-400" />
              Debug Information
            </h2>
            
            {debugInfo && (
              <div className="space-y-3">
                <div className="text-slate-300">
                  <strong>Total Segmentations Found:</strong> {debugInfo.totalSegmentations}
                </div>
                
                {debugInfo.segmentations && debugInfo.segmentations.length > 0 ? (
                  <div className="mt-4">
                    <strong className="text-slate-300 block mb-2">Available Segmentations:</strong>
                    <div className="space-y-2">
                      {debugInfo.segmentations.map((seg, idx) => (
                        <div key={idx} className="bg-slate-900 p-3 rounded border border-slate-600">
                          <div className="text-sm space-y-1">
                            <div className="text-white font-medium">{seg.name}</div>
                            <div className="text-slate-400">
                              • isMedSAMOutput: <span className={seg.isMedSAMOutput ? 'text-green-400' : 'text-red-400'}>
                                {String(seg.isMedSAMOutput)}
                              </span>
                            </div>
                            <div className="text-slate-400">
                              • Has Masks: <span className={seg.hasMasks ? 'text-green-400' : 'text-red-400'}>
                                {String(seg.hasMasks)} ({seg.maskCount} frames)
                              </span>
                            </div>
                            <div className="text-slate-400">
                              • Has Frames: <span className={seg.hasFrames ? 'text-green-400' : 'text-red-400'}>
                                {String(seg.hasFrames)} ({seg.frameCount} frames)
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-red-400">No segmentations found in database</div>
                )}
              </div>
            )}
          </div>

          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6 mb-6 text-left">
            <h3 className="text-white font-semibold mb-3">Requirements for 4D Reconstruction:</h3>
            <ul className="text-slate-300 space-y-2 text-sm">
              <li>✓ Must have AI segmentation data (isMedSAMOutput: true)</li>
              <li>✓ Segmentation must contain masks array with frame data</li>
              <li>✓ Manual edits are NOT supported for reconstruction</li>
            </ul>
          </div>

          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-6 mb-6 text-left">
            <h3 className="text-white font-semibold mb-3">Possible Issues:</h3>
            <ul className="text-slate-300 space-y-2 text-sm">
              <li>1. AI segmentation was never run on this project</li>
              <li>2. AI segmentation was deleted or overwritten</li>
              <li>3. Manual edits replaced the original AI segmentation</li>
              <li>4. Backend is not returning isMedSAMOutput flag correctly</li>
            </ul>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all mx-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  // Transform frames -> masks format for reconstruction component
  let transformedSegmentationData = segmentationData;
  
  if (!segmentationData.masks && segmentationData.frames && segmentationData.frames.length > 0) {
    console.log('🔄 Transforming frames structure to masks structure...');
    
    // Convert frames[].slices[].segmentationmasks[] -> masks[][]
    const masksArray = [];
    
    segmentationData.frames.forEach((frame, frameIdx) => {
      if (!masksArray[frameIdx]) {
        masksArray[frameIdx] = [];
      }
      
      if (frame.slices && frame.slices.length > 0) {
        frame.slices.forEach((slice, sliceIdx) => {
          if (slice.segmentationmasks && slice.segmentationmasks.length > 0) {
            masksArray[frameIdx][sliceIdx] = {
              segmentationMasks: slice.segmentationmasks.map(mask => ({
                class: mask.class,
                segmentationmaskcontents: mask.segmentationmaskcontents,
                rle: mask.segmentationmaskcontents // Alias for compatibility
              }))
            };
          }
        });
      }
    });
    
    transformedSegmentationData = {
      ...segmentationData,
      masks: masksArray
    };
    
    console.log('✅ Transformed data:', {
      frameCount: masksArray.length,
      firstFrameSliceCount: masksArray[0]?.length || 0,
      sampleMask: masksArray[0]?.[0]?.segmentationMasks?.[0]
    });
  }
  
  if (!transformedSegmentationData.masks || transformedSegmentationData.masks.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center max-w-lg">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Segmentation Data</h1>
          <p className="text-lg text-red-400 mb-4">
            AI segmentation found but contains no mask data
          </p>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-left mb-6">
            <pre className="text-xs text-slate-300 overflow-auto">
              {JSON.stringify({
                name: segmentationData.name,
                isMedSAMOutput: segmentationData.isMedSAMOutput,
                hasMasks: !!segmentationData.masks,
                maskCount: segmentationData.masks?.length || 0,
                hasFrames: !!segmentationData.frames,
                frameCount: segmentationData.frames?.length || 0,
                rawDataKeys: Object.keys(segmentationData)
              }, null, 2)}
            </pre>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all mx-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <Cardiac4DReconstruction
      projectId={projectId}
      segmentationData={transformedSegmentationData}
      maxTimeIndex={transformedSegmentationData.masks.length - 1}
      maxLayerIndex={(transformedSegmentationData.masks[0]?.length || 1) - 1}
      api={api}
    />
  );
}
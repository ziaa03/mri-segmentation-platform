import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as THREE from 'three';
import { 
  Play, Pause, SkipBack, SkipForward, Download, 
  Loader, AlertCircle, CheckCircle, Settings, Layers,
  Heart, Activity, Clock, RefreshCw, ChevronDown, Info
} from 'lucide-react';

// Import your existing utilities
import { 
  fetchAndExtractMeshTar,
  processExtractedMeshes,
  getAvailableMeshFrames,
  getMeshUrlForFrame,
  cleanupMeshUrls
} from '../utils/MeshTarExtractor';

// Import your existing 2D segmentation component
import MedicalSegmentationDisplay from './MedicalSegmentationDisplay';

// 3D Mesh Component with frame animation
function AnimatedMesh({ meshUrl, autoRotate, meshColor }) {
  const [mesh, setMesh] = useState(null);
  const [loading, setLoading] = useState(false);
  const groupRef = useRef();

  useEffect(() => {
    if (!meshUrl) {
      setMesh(null);
      return;
    }
    
    setLoading(true);
    const loader = new OBJLoader();
    
    loader.load(
      meshUrl,
      (obj) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({ 
              color: meshColor || '#4ECDC4',
              metalness: 0.3,
              roughness: 0.4,
              side: THREE.DoubleSide
            });
          }
        });
        
        // Center the mesh
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        obj.position.sub(center);
        
        setMesh(obj);
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('Error loading OBJ:', err);
        setLoading(false);
      }
    );
  }, [meshUrl, meshColor]);

  useFrame(() => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  if (loading) return null;
  if (!mesh) return null;

  return (
    <group ref={groupRef}>
      <primitive object={mesh} />
    </group>
  );
}

// Main 4D Reconstruction Page Component
export default function Cardiac4DReconstruction({ 
  projectId,
  segmentationData,
  maxTimeIndex,
  maxLayerIndex,
  api
}) {
  // Reconstruction workflow state
  const [availableFrames, setAvailableFrames] = useState([]);
  const [selectedEDFrame, setSelectedEDFrame] = useState(1);
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [reconstructionStatus, setReconstructionStatus] = useState(null);
  const [reconstructionError, setReconstructionError] = useState(null);
  const [jobUuid, setJobUuid] = useState(null);
  
  // Mesh data state
  const [processedMeshes, setProcessedMeshes] = useState([]);
  const [currentMeshUrl, setCurrentMeshUrl] = useState(null);
  
  // Playback state
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Display settings
  const [autoRotate, setAutoRotate] = useState(false);
  const [meshColor, setMeshColor] = useState('#4ECDC4');
  const [showSettings, setShowSettings] = useState(false);
  const [show2DView, setShow2DView] = useState(true);
  
  // 2D segmentation state
  const [selectedMask, setSelectedMask] = useState(null);
  
  // Debug messages
  const [debugMessages, setDebugMessages] = useState([]);
  const [showDebug, setShowDebug] = useState(true);
  
  // Playback interval
  const playbackRef = useRef(null);
  const pollingRef = useRef(null);

  const [apiDebugData, setApiDebugData] = useState({
  lastJobCheck: null,
  lastReconstructionResults: null,
  pollingActive: false,
  errorLogs: []
});

  // Helper to add debug messages
  const addDebugMessage = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugMessages(prev => [...prev.slice(-9), { timestamp, message, type }]);
  };

  // Initialize available frames from segmentation data
  useEffect(() => {
    if (segmentationData?.masks) {
      const frameCount = segmentationData.masks.length;
      const frames = Array.from({ length: frameCount }, (_, i) => i + 1);
      setAvailableFrames(frames);
      
      // Set default ED frame to middle of cardiac cycle
      setSelectedEDFrame(Math.ceil(frameCount / 2));
      
      addDebugMessage(`Loaded ${frameCount} frames from segmentation data`, 'success');
    } else {
      addDebugMessage('No segmentation data found', 'error');
    }
  }, [segmentationData]);

  // Debug component state on mount
  useEffect(() => {
    addDebugMessage(`Component mounted - ProjectId: ${projectId}`, 'info');
    addDebugMessage(`API available: ${!!api}`, api ? 'success' : 'error');
    addDebugMessage(`Segmentation data: ${segmentationData ? 'Available' : 'Missing'}`, segmentationData ? 'success' : 'error');
  }, []);

  // Update current mesh URL when frame changes
  useEffect(() => {
    if (processedMeshes.length > 0) {
      const meshUrl = getMeshUrlForFrame(processedMeshes, currentFrame);
      setCurrentMeshUrl(meshUrl);
    }
  }, [processedMeshes, currentFrame]);

  // Playback control
  useEffect(() => {
    if (isPlaying && processedMeshes.length > 0) {
      playbackRef.current = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % processedMeshes.length);
      }, 1000 / playbackSpeed);
    } else {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
        playbackRef.current = null;
      }
    }
    
    return () => {
      if (playbackRef.current) clearInterval(playbackRef.current);
    };
  }, [isPlaying, processedMeshes.length, playbackSpeed]);

  // Cleanup mesh URLs on unmount
  useEffect(() => {
    return () => {
      if (processedMeshes.length > 0) {
        cleanupMeshUrls(processedMeshes);
      }
    };
  }, [processedMeshes]);

// Replace the handleStartReconstruction function in Cardiac4DReconstruction.jsx

const handleStartReconstruction = async () => {
  addDebugMessage('🔵 Button clicked!', 'info');
  
  if (!projectId) {
    addDebugMessage('❌ Missing project ID', 'error');
    alert('Error: Missing project ID');
    return;
  }
  
  if (!api) {
    addDebugMessage('❌ API client not available', 'error');
    alert('Error: API client not available');
    return;
  }

  addDebugMessage(`✅ Starting reconstruction for ED frame ${selectedEDFrame}`, 'success');
  setIsReconstructing(true);
  setReconstructionStatus('loading');
  setReconstructionError(null);

  try {
    // Ensure ed_frame is sent as integer (0-indexed)
    const edFrameIndex = selectedEDFrame - 1; // Convert from 1-indexed to 0-indexed
    
    const payload = {
      reconstructionName: `4D Reconstruction - ED Frame ${selectedEDFrame}`,
      reconstructionDescription: `4D cardiac reconstruction from AI segmentation masks (ED: Frame ${selectedEDFrame})`,
      ed_frame: edFrameIndex, // Send 0-indexed frame number
      parameters: {
        num_iterations: 50,
        resolution: 128,
        process_all_frames: true,
        debug_save: false
      }
    };

    addDebugMessage(`📡 Sending POST to /reconstruction/start-reconstruction/${projectId}`, 'info');
    addDebugMessage(`📦 Payload: ${JSON.stringify(payload, null, 2)}`, 'info');
    addDebugMessage(`📊 Using ED frame index: ${edFrameIndex} (Display: Frame ${selectedEDFrame})`, 'info');
    
    const response = await api.post(`/reconstruction/start-reconstruction/${projectId}`, payload);

    addDebugMessage(`✅ Response received: ${JSON.stringify(response.data)}`, 'success');
    
    if (response.data?.uuid) {
      addDebugMessage(`📋 Job UUID: ${response.data.uuid}`, 'info');
      setJobUuid(response.data.uuid);
      startPollingJobStatus(response.data.uuid);
    } else {
      throw new Error('No job UUID returned from server');
    }
  } catch (error) {
    console.error('🔥 Full Error Object:', error);
    console.error('🔥 Error Response:', error.response);
    console.error('🔥 Error Config:', error.config);
    
    let errorMsg = 'Failed to start reconstruction';
    let detailedError = '';
    
    if (error.response) {
      // Server responded with error
      const status = error.response.status;
      const data = error.response.data;
      
      errorMsg = data?.message || data?.error || error.message || `Server error (${status})`;
      
      addDebugMessage(`❌ HTTP ${status}: ${errorMsg}`, 'error');
      
      if (status === 404) {
        detailedError = `
Backend Error: Reconstruction endpoint not found.

The backend is trying to call: /inference/v2/4d-reconstruction
But this endpoint doesn't exist on the Cloud GPU service.

Possible causes:
1. Cloud GPU service is not running
2. Incorrect endpoint path configured
3. Missing route in GPU service

Backend URL attempted: ${error.config?.url}
        `.trim();
        
        addDebugMessage('📋 404 Error - Endpoint not found on GPU service', 'error');
      } else if (status === 500) {
        detailedError = `
Backend Internal Error:
${JSON.stringify(data, null, 2)}
        `.trim();
      }
      
      addDebugMessage(`Full error data: ${JSON.stringify(data, null, 2)}`, 'error');
    } else if (error.request) {
      // Request made but no response
      errorMsg = 'No response from server - backend may be down';
      addDebugMessage('❌ No response received from backend', 'error');
      detailedError = 'Check if the backend server is running and accessible.';
    } else {
      // Error in request setup
      errorMsg = error.message;
      addDebugMessage(`❌ Request setup error: ${error.message}`, 'error');
    }
    
    addDebugMessage(`Full error: ${JSON.stringify(error.response?.data || error.message)}`, 'error');
    
    setReconstructionError(errorMsg);
    setReconstructionStatus('error');
    setIsReconstructing(false);
    
    // Show detailed alert
    alert(`Reconstruction Failed\n\n${errorMsg}\n\n${detailedError}`);
  }
};

  // Poll job status
  const startPollingJobStatus = (uuid) => {
  addDebugMessage(`🔄 Starting to poll for job ${uuid}`, 'info');
  
  setApiDebugData(prev => ({ ...prev, pollingActive: true }));
  
  pollingRef.current = setInterval(async () => {
    try {
      addDebugMessage(`📡 Polling job status...`, 'info');
      
      const response = await api.get('/reconstruction/user-check-jobs');
      const data = response.data;
      
      // Store in debug data
      setApiDebugData(prev => ({
        ...prev,
        lastJobCheck: {
          timestamp: new Date().toISOString(),
          data: data,
          targetJobId: uuid
        }
      }));
      
      addDebugMessage(`✅ Poll response received: ${data.jobs?.length || 0} jobs found`, 'success');
      
      const job = data.jobs?.find(j => j.jobId === uuid);
      
      if (!job) {
        addDebugMessage(`⚠️ Job ${uuid} not found in poll response`, 'error');
        setApiDebugData(prev => ({
          ...prev,
          errorLogs: [...prev.errorLogs, {
            timestamp: new Date().toISOString(),
            error: 'Job not found in poll response',
            availableJobs: data.jobs?.map(j => ({ id: j.jobId, status: j.status }))
          }]
        }));
        return;
      }
      
      addDebugMessage(`📊 Job status: ${job.status}`, 'info');
      
      // FIXED: Use lowercase status comparison to match backend response
      if (job.status === 'completed' || job.status === 'COMPLETED') {
        addDebugMessage(`✅ Job completed! Loading reconstruction results...`, 'success');
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setApiDebugData(prev => ({ ...prev, pollingActive: false }));
        
        setTimeout(async () => {
          await loadReconstructionResults();
        }, 1000);
        
      } else if (job.status === 'failed' || job.status === 'FAILED') {
        addDebugMessage(`❌ Job failed on server`, 'error');
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setApiDebugData(prev => ({ ...prev, pollingActive: false }));
        setReconstructionError('Reconstruction job failed on server');
        setReconstructionStatus('error');
        setIsReconstructing(false);
      } else if (job.status === 'in_progress' || job.status === 'IN_PROGRESS') {
        addDebugMessage(`⏳ Job in progress...`, 'info');
      } else if (job.status === 'pending' || job.status === 'PENDING') {
        addDebugMessage(`⏳ Job pending... Queue position: ${job.queuePosition || 'unknown'}`, 'info');
      }
    } catch (error) {
      addDebugMessage(`❌ Polling error: ${error.message}`, 'error');
      setApiDebugData(prev => ({
        ...prev,
        errorLogs: [...prev.errorLogs, {
          timestamp: new Date().toISOString(),
          error: error.message,
          type: 'polling_error'
        }]
      }));
    }
  }, 3000);
};

// Update loadReconstructionResults to include debug data
const loadReconstructionResults = async () => {
  addDebugMessage(`📥 Loading reconstruction results for project ${projectId}`, 'info');
  
  try {
    const response = await api.get(`/reconstruction/reconstruction-results/${projectId}`);
    const data = response.data;
    
    // Store in debug data
    setApiDebugData(prev => ({
      ...prev,
      lastReconstructionResults: {
        timestamp: new Date().toISOString(),
        data: data
      }
    }));
    
    addDebugMessage(`✅ Results API response received`, 'success');
    
    if (!data.success || !data.reconstructions?.length) {
      addDebugMessage(`❌ No reconstruction results found`, 'error');
      throw new Error('No reconstruction results found');
    }
    
    const latestReconstruction = data.reconstructions[0];
    
    addDebugMessage(`📋 Found reconstruction: ${latestReconstruction.name}`, 'info');
    addDebugMessage(`🔗 Download URL: ${latestReconstruction.downloadUrl ? 'Available' : 'MISSING!'}`, 
      latestReconstruction.downloadUrl ? 'success' : 'error');
    
    if (!latestReconstruction.downloadUrl) {
      throw new Error('No download URL available for reconstruction');
    }
    
    addDebugMessage(`⬇️ Downloading meshes...`, 'info');
    await loadMeshesFromTar(latestReconstruction.downloadUrl);
    
    addDebugMessage(`✅ Meshes loaded successfully!`, 'success');
    setReconstructionStatus('success');
    
  } catch (error) {
    addDebugMessage(`❌ Error: ${error.message}`, 'error');
    setApiDebugData(prev => ({
      ...prev,
      errorLogs: [...prev.errorLogs, {
        timestamp: new Date().toISOString(),
        error: error.message,
        type: 'load_results_error',
        stack: error.stack
      }]
    }));
    setReconstructionError(error.message || 'Failed to load reconstruction results');
    setReconstructionStatus('error');
  } finally {
    setIsReconstructing(false);
  }
};

  // Load meshes from TAR file
  const loadMeshesFromTar = async (tarUrl) => {
    try {
      console.log('Downloading mesh TAR from:', tarUrl);
      
      // Fetch and extract TAR file
      const extractedFiles = await fetchAndExtractMeshTar(tarUrl);
      
      if (!extractedFiles || extractedFiles.length === 0) {
        throw new Error('No mesh files found in TAR archive');
      }
      
      // Process extracted meshes
      const meshes = processExtractedMeshes(extractedFiles);
      
      if (meshes.length === 0) {
        throw new Error('Failed to process mesh files');
      }
      
      console.log(`Loaded ${meshes.length} mesh frames`);
      setProcessedMeshes(meshes);
      setCurrentFrame(0);
      
    } catch (error) {
      console.error('Error loading meshes from TAR:', error);
      throw error;
    }
  };

  // Playback controls
  const togglePlayback = () => setIsPlaying(!isPlaying);
  
  const handlePreviousFrame = () => {
    setCurrentFrame(prev => (prev - 1 + processedMeshes.length) % processedMeshes.length);
    setIsPlaying(false);
  };
  
  const handleNextFrame = () => {
    setCurrentFrame(prev => (prev + 1) % processedMeshes.length);
    setIsPlaying(false);
  };
  
  const handleFrameSelect = (frameIndex) => {
    setCurrentFrame(frameIndex);
    setIsPlaying(false);
  };

  // 2D mask selection handler
  const handleMaskSelected = (mask) => {
    setSelectedMask(mask);
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - 2D Segmentation */}
        {show2DView && (
          <div className="flex-1 border-r border-slate-700 bg-slate-900/50 overflow-auto">
            <MedicalSegmentationDisplay
              segmentationData={segmentationData}
              currentTimeIndex={currentFrame}
              currentLayerIndex={currentSlice}
              onMaskSelected={handleMaskSelected}
              selectedMask={selectedMask}
              projectId={projectId}
              maxTimeIndex={maxTimeIndex}
              maxLayerIndex={maxLayerIndex}
              api={api}
              manualTimeIndex={currentFrame}
              manualLayerIndex={currentSlice}
              onEditModeToggle={() => {}}
            />
          </div>
        )}

        {/* Right Panel - 3D Reconstruction */}
        <div className={`${show2DView ? 'flex-1' : 'flex-1'} bg-slate-900/50 p-4`}>
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200">3D Reconstruction</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShow2DView(!show2DView)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  title={show2DView ? 'Hide 2D View' : 'Show 2D View'}
                >
                  <Layers className="w-4 h-4 text-slate-400" />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* 3D Viewer */}
            <div className="flex-1 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 relative">
              {processedMeshes.length > 0 && currentMeshUrl ? (
                <Canvas>
                  <PerspectiveCamera makeDefault position={[0, 0, 5]} />
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[10, 10, 10]} intensity={1} />
                  <directionalLight position={[-10, -10, -10]} intensity={0.3} />
                  <pointLight position={[0, 5, 0]} intensity={0.5} />
                  <OrbitControls enablePan enableZoom enableRotate />
                  <AnimatedMesh 
                    meshUrl={currentMeshUrl}
                    autoRotate={autoRotate}
                    meshColor={meshColor}
                  />
                  <gridHelper args={[10, 10, '#444', '#222']} />
                </Canvas>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-slate-500 max-w-md px-4">
                    <Heart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg mb-2">No 3D Reconstruction Available</p>
                    <p className="text-sm mb-4">Select an end-diastolic (ED) frame from the cardiac cycle and click "Start 4D Reconstruction" to generate a 3D mesh visualization.</p>
                    <div className="bg-slate-700/50 rounded-lg p-3 text-left">
                      <div className="flex items-start space-x-2">
                        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-slate-300">
                          <strong>ED Frame:</strong> End-Diastolic frame represents the heart at maximum relaxation when ventricles are fully filled with blood.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Overlay */}
              {showSettings && (
                <div className="absolute top-4 right-4 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 w-64 z-10">
                  <h3 className="text-sm font-semibold text-slate-200 mb-3">Display Settings</h3>
                  
                  <label className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-300">Auto Rotate</span>
                    <input
                      type="checkbox"
                      checked={autoRotate}
                      onChange={(e) => setAutoRotate(e.target.checked)}
                      className="w-4 h-4"
                    />
                  </label>
                  
                  <div className="mb-3">
                    <label className="text-sm text-slate-300 block mb-1">Playback Speed</label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.5"
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-xs text-slate-400 text-center mt-1">{playbackSpeed}x</div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-slate-300 block mb-1">Mesh Color</label>
                    <input
                      type="color"
                      value={meshColor}
                      onChange={(e) => setMeshColor(e.target.value)}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Panel */}
      <div className="bg-slate-800 border-t border-slate-700 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Reconstruction Controls */}
          {processedMeshes.length === 0 && (
            <div className="flex items-center justify-center space-x-4 mb-4 pb-4 border-b border-slate-700">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-slate-300">Select ED Frame:</label>
                <div className="relative">
                  <select
                    value={selectedEDFrame}
                    onChange={(e) => setSelectedEDFrame(parseInt(e.target.value))}
                    disabled={isReconstructing}
                    className="appearance-none bg-slate-700 text-white px-4 py-2 pr-8 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  >
                    {availableFrames.map(frame => (
                      <option key={frame} value={frame}>
                        Frame {frame} {frame === Math.ceil(availableFrames.length / 2) ? '(Mid-cycle)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <button
                onClick={handleStartReconstruction}
                disabled={isReconstructing || !projectId}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReconstructing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Start 4D Reconstruction</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Playback Controls */}
          {processedMeshes.length > 0 && (
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePreviousFrame}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Previous Frame"
                >
                  <SkipBack className="w-5 h-5 text-slate-300" />
                </button>
                
                <button
                  onClick={togglePlayback}
                  className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white" />
                  )}
                </button>
                
                <button
                  onClick={handleNextFrame}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Next Frame"
                >
                  <SkipForward className="w-5 h-5 text-slate-300" />
                </button>

                <div className="flex items-center space-x-2 text-slate-300 ml-4">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-mono">
                    Frame {String(currentFrame + 1).padStart(2, '0')} / {String(processedMeshes.length).padStart(2, '0')}
                  </span>
                </div>

                {/* Frame slider */}
                <div className="flex items-center space-x-2 ml-4">
                  <input
                    type="range"
                    min="0"
                    max={processedMeshes.length - 1}
                    value={currentFrame}
                    onChange={(e) => handleFrameSelect(parseInt(e.target.value))}
                    className="w-48"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* API Debug Panel */}
          <div className="bg-slate-900 rounded-lg border border-slate-700 p-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-300">API Debug Data</h3>
              <div className="flex items-center space-x-2">
                {apiDebugData.pollingActive && (
                  <span className="text-xs text-blue-400 animate-pulse">● Polling Active</span>
                )}
                <button
                  onClick={() => setApiDebugData({
                    lastJobCheck: null,
                    lastReconstructionResults: null,
                    pollingActive: apiDebugData.pollingActive,
                    errorLogs: []
                  })}
                  className="text-xs text-slate-400 hover:text-slate-300"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto text-xs">
              {/* Last Job Check */}
              {apiDebugData.lastJobCheck && (
                <div className="bg-slate-800 p-2 rounded">
                  <div className="text-blue-300 font-semibold mb-1">
                    Last Job Check: {new Date(apiDebugData.lastJobCheck.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-slate-400 mb-1">
                    Target Job: {apiDebugData.lastJobCheck.targetJobId}
                  </div>
                  <div className="text-slate-400 mb-1">
                    Jobs Found: {apiDebugData.lastJobCheck.data.jobs?.length || 0}
                  </div>
                  <pre className="text-green-400 bg-slate-950 p-2 rounded overflow-x-auto text-[10px]">
          {JSON.stringify(apiDebugData.lastJobCheck.data, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Last Reconstruction Results */}
              {apiDebugData.lastReconstructionResults && (
                <div className="bg-slate-800 p-2 rounded">
                  <div className="text-purple-300 font-semibold mb-1">
                    Last Reconstruction Results: {new Date(apiDebugData.lastReconstructionResults.timestamp).toLocaleTimeString()}
                  </div>
                  <pre className="text-green-400 bg-slate-950 p-2 rounded overflow-x-auto text-[10px]">
          {JSON.stringify(apiDebugData.lastReconstructionResults.data, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Error Logs */}
              {apiDebugData.errorLogs.length > 0 && (
                <div className="bg-red-900/20 p-2 rounded">
                  <div className="text-red-300 font-semibold mb-2">
                    Error Logs ({apiDebugData.errorLogs.length})
                  </div>
                  {apiDebugData.errorLogs.slice(-5).map((log, idx) => (
                    <div key={idx} className="bg-slate-950 p-2 rounded mb-1">
                      <div className="text-red-400 text-[10px]">
                        [{new Date(log.timestamp).toLocaleTimeString()}] {log.type}
                      </div>
                      <div className="text-slate-300 text-[10px]">{log.error}</div>
                      {log.availableJobs && (
                        <pre className="text-yellow-400 text-[10px] mt-1">
          {JSON.stringify(log.availableJobs, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {!apiDebugData.lastJobCheck && !apiDebugData.lastReconstructionResults && apiDebugData.errorLogs.length === 0 && (
                <p className="text-slate-500 text-center py-4">No API data captured yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
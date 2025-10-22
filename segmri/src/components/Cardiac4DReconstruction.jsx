import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as THREE from 'three';
import { 
  Play, Pause, SkipBack, SkipForward, Download, 
  Loader, AlertCircle, CheckCircle, Settings, Layers,
  Heart, Activity, Clock, RefreshCw, ChevronDown, Info,
  Maximize2, Minimize2, Grid3x3, Eye, EyeOff, Zap,
  ArrowLeft, Server, Database, FileText
} from 'lucide-react';

// Import existing utilities
import { 
  fetchAndExtractMeshTar,
  processExtractedMeshes,
  getMeshUrlForFrame,
  cleanupMeshUrls
} from '../utils/MeshTarExtractor';

// Import simplified 2D viewer
import Simple2DSegmentationViewer from './Simple2DSegmentationViewer';

// Animated background grid component
const AnimatedGridBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(147, 197, 253, 0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(147, 197, 253, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
      <div className="absolute inset-0 bg-gradient-to-tl from-cyan-500/3 via-transparent to-transparent" />
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status, message, queuePosition }) => {
  const configs = {
    idle: { color: 'bg-slate-600', icon: Clock, text: 'Ready' },
    PENDING: { color: 'bg-yellow-600 animate-pulse', icon: Clock, text: 'Pending' },
    IN_PROGRESS: { color: 'bg-blue-600 animate-pulse', icon: Loader, text: 'Processing' },
    COMPLETED: { color: 'bg-green-600', icon: CheckCircle, text: 'Complete' },
    FAILED: { color: 'bg-red-600', icon: AlertCircle, text: 'Failed' },
    error: { color: 'bg-red-600', icon: AlertCircle, text: 'Error' }
  };
  
  const config = configs[status] || configs.idle;
  const Icon = config.icon;
  
  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-full">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <Icon className="w-3.5 h-3.5 text-slate-300" />
      <span className="text-xs font-medium text-slate-300">
        {message || config.text}
        {queuePosition && ` (Queue: ${queuePosition})`}
      </span>
    </div>
  );
};

// Stats card component
const StatsCard = ({ icon: Icon, label, value, color = "text-blue-400" }) => (
  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
  </div>
);

// Progress bar component
const ProgressBar = ({ current, total, label }) => {
  const percentage = (current / total) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{current} / {total}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// 3D Mesh Component
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

// Main 4D Reconstruction Component
export default function Cardiac4DReconstruction({ 
  projectId,
  segmentationData,
  maxTimeIndex,
  maxLayerIndex,
  api
}) {
  // Job tracking state
  const [availableFrames, setAvailableFrames] = useState([]);
  const [selectedEDFrame, setSelectedEDFrame] = useState(1);
  const [jobUuid, setJobUuid] = useState(null);
  const [jobStatus, setJobStatus] = useState('idle');
  const [queuePosition, setQueuePosition] = useState(null);
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [reconstructionError, setReconstructionError] = useState(null);
  const [reconstructionHistory, setReconstructionHistory] = useState([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Mesh data state
  const [processedMeshes, setProcessedMeshes] = useState([]);
  const [currentMeshUrl, setCurrentMeshUrl] = useState(null);
  const [reconstructionMetadata, setReconstructionMetadata] = useState(null);
  
  // Playback state
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentSlice, setCurrentSlice] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Display settings
  const [autoRotate, setAutoRotate] = useState(true);
  const [meshColor, setMeshColor] = useState('#4ECDC4');
  const [show2DView, setShow2DView] = useState(true);
  const [show3D, setShow3D] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Debug state
  const [apiDebugData, setApiDebugData] = useState({
    lastJobCheck: null,
    lastReconstructionResults: null,
    pollingActive: false,
    errorLogs: []
  });
  
  // Refs
  const playbackRef = useRef(null);
  const pollingRef = useRef(null);

  // Initialize available frames
  useEffect(() => {
    if (segmentationData?.masks) {
      const frameCount = segmentationData.masks.length;
      const frames = Array.from({ length: frameCount }, (_, i) => i + 1);
      setAvailableFrames(frames);
      setSelectedEDFrame(Math.ceil(frameCount / 2));
    }
  }, [segmentationData]);

  // Load reconstruction history on mount
  useEffect(() => {
    if (projectId && api) {
      loadReconstructionHistory();
    }
  }, [projectId, api]);

  // Load all available reconstructions
  const loadReconstructionHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await api.get(`/reconstruction/reconstruction-results/${projectId}`);
      const data = response.data;
      
      if (data.success && data.reconstructions?.length > 0) {
        setReconstructionHistory(data.reconstructions);
      } else {
        setReconstructionHistory([]);
      }
    } catch (error) {
      console.error('Error loading reconstruction history:', error);
      setReconstructionHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load a specific reconstruction from history
  const loadReconstructionFromHistory = async (reconstruction) => {
    if (!reconstruction.downloadUrl) {
      alert('No download URL available for this reconstruction');
      return;
    }

    setJobStatus('loading');
    setReconstructionError(null);
    
    try {
      setReconstructionMetadata(reconstruction.metadata);
      await loadMeshesFromTar(reconstruction.downloadUrl);
      setJobStatus('COMPLETED');
      setShowHistoryPanel(false);
    } catch (error) {
      console.error('Error loading reconstruction:', error);
      setReconstructionError('Failed to load reconstruction: ' + error.message);
      setJobStatus('error');
    }
  };

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
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [processedMeshes]);

  // Start 4D Reconstruction - API Route 1
  const handleStartReconstruction = async () => {
    if (!projectId || !api) {
      alert('Error: Missing project ID or API client');
      return;
    }

    setIsReconstructing(true);
    setJobStatus('PENDING');
    setReconstructionError(null);

    try {
      const edFrameIndex = selectedEDFrame - 1; // Convert to 0-indexed
      
      const payload = {
        reconstructionName: `4D Reconstruction - ED Frame ${selectedEDFrame}`,
        reconstructionDescription: `4D cardiac reconstruction from AI segmentation masks (ED: Frame ${selectedEDFrame})`,
        ed_frame: edFrameIndex,
        parameters: {
          num_iterations: 50,
          resolution: 128,
          process_all_frames: true,
          debug_save: false
        }
      };

      const response = await api.post(`/reconstruction/start-reconstruction/${projectId}`, payload);
      
      if (response.data?.uuid) {
        setJobUuid(response.data.uuid);
        startPollingJobStatus(response.data.uuid);
      } else {
        throw new Error('No job UUID returned from server');
      }
    } catch (error) {
      console.error('Reconstruction error:', error);
      
      let errorMsg = 'Failed to start reconstruction';
      if (error.response) {
        errorMsg = error.response.data?.message || error.response.data?.error || errorMsg;
      } else if (error.request) {
        errorMsg = 'No response from server - backend may be down';
      } else {
        errorMsg = error.message;
      }
      
      setReconstructionError(errorMsg);
      setJobStatus('error');
      setIsReconstructing(false);
      
      setApiDebugData(prev => ({
        ...prev,
        errorLogs: [...prev.errorLogs, {
          timestamp: new Date().toISOString(),
          error: errorMsg,
          type: 'start_reconstruction_error'
        }]
      }));
    }
  };

  // Poll job status - API Route 3
  const startPollingJobStatus = (uuid) => {
    setApiDebugData(prev => ({ ...prev, pollingActive: true }));
    
    pollingRef.current = setInterval(async () => {
      try {
        const response = await api.get('/reconstruction/user-check-jobs');
        const data = response.data;
        
        setApiDebugData(prev => ({
          ...prev,
          lastJobCheck: {
            timestamp: new Date().toISOString(),
            data: data,
            targetJobId: uuid
          }
        }));
        
        const job = data.jobs?.find(j => j.jobId === uuid);
        
        if (!job) {
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
        
        setJobStatus(job.status);
        setQueuePosition(job.queuePosition);
        
        if (job.status === 'COMPLETED' || job.status === 'completed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setApiDebugData(prev => ({ ...prev, pollingActive: false }));
          
          setTimeout(async () => {
            await loadReconstructionResults();
          }, 1000);
          
        } else if (job.status === 'FAILED' || job.status === 'failed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setApiDebugData(prev => ({ ...prev, pollingActive: false }));
          setReconstructionError('Reconstruction job failed on server');
          setJobStatus('FAILED');
          setIsReconstructing(false);
        }
      } catch (error) {
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

  // Load reconstruction results - API Route 2
  const loadReconstructionResults = async () => {
    try {
      const response = await api.get(`/reconstruction/reconstruction-results/${projectId}`);
      const data = response.data;
      
      setApiDebugData(prev => ({
        ...prev,
        lastReconstructionResults: {
          timestamp: new Date().toISOString(),
          data: data
        }
      }));
      
      if (!data.success || !data.reconstructions?.length) {
        throw new Error('No reconstruction results found');
      }
      
      const latestReconstruction = data.reconstructions[0];
      
      // Update history with latest data
      setReconstructionHistory(data.reconstructions);
      
      setReconstructionMetadata(latestReconstruction.metadata);
      
      if (!latestReconstruction.downloadUrl) {
        throw new Error('No download URL available for reconstruction');
      }
      
      await loadMeshesFromTar(latestReconstruction.downloadUrl);
      setJobStatus('COMPLETED');
      
    } catch (error) {
      setReconstructionError(error.message || 'Failed to load reconstruction results');
      setJobStatus('error');
      
      setApiDebugData(prev => ({
        ...prev,
        errorLogs: [...prev.errorLogs, {
          timestamp: new Date().toISOString(),
          error: error.message,
          type: 'load_results_error'
        }]
      }));
    } finally {
      setIsReconstructing(false);
    }
  };

  // Load meshes from TAR file
  const loadMeshesFromTar = async (tarUrl) => {
    try {
      const extractedFiles = await fetchAndExtractMeshTar(tarUrl);
      
      if (!extractedFiles || extractedFiles.length === 0) {
        throw new Error('No mesh files found in TAR archive');
      }
      
      const meshes = processExtractedMeshes(extractedFiles);
      
      if (meshes.length === 0) {
        throw new Error('Failed to process mesh files');
      }
      
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

  const hasReconstruction = processedMeshes.length > 0;

  return (
    <div className="w-full bg-slate-950 flex flex-col relative" style={{ height: 'calc(100vh - 64px)' }}>
      <AnimatedGridBackground />
      
      {/* Main Content */}
      <div className="flex-1 flex relative z-10 min-h-0">

        {/* Left Sidebar */}
        <div className="w-80 bg-slate-900/50 backdrop-blur-sm border-r border-slate-800 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {/* Status & History */}
          <div className="space-y-3">
            <StatusBadge status={jobStatus} queuePosition={queuePosition} />
            
            {/* History Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all"
                title="View Reconstruction History"
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-300">Reconstruction History</span>
                </div>
                {reconstructionHistory.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                    {reconstructionHistory.length}
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showHistoryPanel && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div 
                    className="fixed inset-0 z-[100]" 
                    onClick={() => setShowHistoryPanel(false)}
                  />
                  
                  {/* Dropdown Content */}
                  <div className="absolute left-0 top-full mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-[110] flex flex-col max-h-[500px]">
                    <div className="p-4 border-b border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-blue-400" />
                          <h2 className="text-lg font-bold text-white">History</h2>
                        </div>
                        <button
                          onClick={() => setShowHistoryPanel(false)}
                          className="p-1 hover:bg-slate-800 rounded transition-colors"
                        >
                          <span className="text-slate-400 text-xl">×</span>
                        </button>
                      </div>
                    </div>

                    <div className="overflow-y-auto flex-1 scroll-smooth scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                      {loadingHistory ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader className="w-6 h-6 text-blue-400 animate-spin" />
                        </div>
                      ) : reconstructionHistory.length === 0 ? (
                        <div className="text-center py-8 px-4">
                          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p className="text-slate-400 text-sm">No history available</p>
                          <p className="text-slate-500 text-xs mt-1">Start a reconstruction</p>
                        </div>
                      ) : (
                        <div className="p-4 space-y-3">
                          {reconstructionHistory.map((reconstruction, idx) => (
                            <div
                              key={reconstruction.reconstructionId}
                              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-blue-600/50 transition-all cursor-pointer group"
                              onClick={() => loadReconstructionFromHistory(reconstruction)}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                                    {reconstruction.name || `Reconstruction ${idx + 1}`}
                                  </h3>
                                  <p className="text-xs text-slate-400 line-clamp-2">
                                    {reconstruction.description || 'No description'}
                                  </p>
                                </div>
                                {idx === 0 && (
                                  <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] font-medium rounded">
                                    Latest
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-slate-900/50 rounded p-2">
                                  <div className="text-[10px] text-slate-500 uppercase mb-0.5">ED Frame</div>
                                  <div className="text-sm font-semibold text-slate-300">
                                    {reconstruction.metadata?.edFrameIndex || 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-slate-900/50 rounded p-2">
                                  <div className="text-[10px] text-slate-500 uppercase mb-0.5">Resolution</div>
                                  <div className="text-sm font-semibold text-slate-300">
                                    {reconstruction.metadata?.resolution || 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-slate-900/50 rounded p-2">
                                  <div className="text-[10px] text-slate-500 uppercase mb-0.5">Iterations</div>
                                  <div className="text-sm font-semibold text-slate-300">
                                    {reconstruction.metadata?.numIterations || 'N/A'}
                                  </div>
                                </div>
                                <div className="bg-slate-900/50 rounded p-2">
                                  <div className="text-[10px] text-slate-500 uppercase mb-0.5">File Size</div>
                                  <div className="text-sm font-semibold text-slate-300">
                                    {reconstruction.meshFileSize 
                                      ? `${(reconstruction.meshFileSize / 1024 / 1024).toFixed(1)} MB`
                                      : 'N/A'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                                <div className="text-[10px] text-slate-500">
                                  {new Date(reconstruction.createdAt).toLocaleDateString()} at{' '}
                                  {new Date(reconstruction.createdAt).toLocaleTimeString()}
                                </div>
                                <div className="flex items-center space-x-1 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="w-3 h-3" />
                                  <span>Load</span>
                                </div>
                              </div>

                              {!reconstruction.downloadUrl && (
                                <div className="mt-2 flex items-center space-x-1 text-xs text-yellow-400">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Download URL unavailable</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-4 border-t border-slate-800">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadReconstructionHistory();
                        }}
                        disabled={loadingHistory}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatsCard icon={Layers} label="Frames" value={availableFrames.length} color="text-blue-400" />
            <StatsCard icon={Heart} label="ED Frame" value={selectedEDFrame} color="text-cyan-400" />
            <StatsCard 
              icon={Clock} 
              label="Duration" 
              value={reconstructionMetadata?.reconstructionTime ? `${(reconstructionMetadata.reconstructionTime / 60).toFixed(1)} min` : '--'} 
              color="text-purple-400" 
            />
            <StatsCard icon={Zap} label="Speed" value={`${playbackSpeed.toFixed(1)}x`} color="text-green-400" />
          </div>

          {/* Reconstruction Setup */}
          {!hasReconstruction && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <RefreshCw className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-white">Reconstruction Setup</h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
                    End-Diastolic Frame
                  </label>
                  <div className="relative">
                    <select
                      value={selectedEDFrame}
                      onChange={(e) => setSelectedEDFrame(parseInt(e.target.value))}
                      disabled={isReconstructing}
                      className="w-full appearance-none bg-slate-700/50 text-white px-4 py-2.5 pr-10 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition-all"
                    >
                      {availableFrames.map(frame => (
                        <option key={frame} value={frame}>
                          Frame {frame} {frame === Math.ceil(availableFrames.length / 2) ? '★' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">
                    ★ Recommended: Mid-cycle frame
                  </p>
                </div>

                <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-slate-300">
                      <strong>SDF Model:</strong> 50 iterations at 128 resolution. Processing time: ~3-10 minutes.
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartReconstruction}
                  disabled={isReconstructing || !projectId}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
                >
                  {isReconstructing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Start Reconstruction</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Playback Progress */}
          {hasReconstruction && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white text-sm">Playback Control</h3>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-2 rounded-lg transition-all ${
                    isPlaying 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
              </div>
              
              <ProgressBar 
                current={currentFrame + 1} 
                total={processedMeshes.length} 
                label="Cardiac Cycle"
              />
              
              <div className="pt-2">
                <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
                  Playback Speed: {playbackSpeed.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.5"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          )}

          {/* Display Settings */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 mb-3">
              <Settings className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-white text-sm">Display Settings</h3>
            </div>
            
            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-300">2D Segmentation</span>
              <button
                onClick={() => setShow2DView(!show2DView)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  show2DView ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  show2DView ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </label>
            
            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-300">3D Mesh</span>
              <button
                onClick={() => setShow3D(!show3D)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  show3D ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  show3D ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </label>
            
            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-300">Auto Rotate</span>
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoRotate ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  autoRotate ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </label>
            
            <div className="pt-2">
              <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
                Mesh Color
              </label>
              <input
                type="color"
                value={meshColor}
                onChange={(e) => setMeshColor(e.target.value)}
                className="w-full h-10 rounded-lg cursor-pointer bg-slate-700 border border-slate-600"
              />
            </div>
          </div>

          {/* Reconstruction Metadata */}
          {reconstructionMetadata && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-2 mb-3">
                <Database className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-white text-sm">Metadata</h3>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">ED Frame:</span>
                  <span className="text-slate-200">{reconstructionMetadata.edFrameIndex}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Iterations:</span>
                  <span className="text-slate-200">{reconstructionMetadata.numIterations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Resolution:</span>
                  <span className="text-slate-200">{reconstructionMetadata.resolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">File Size:</span>
                  <span className="text-slate-200">{(reconstructionMetadata.filesize / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Viewport */}
        <div className="flex-1 flex flex-col">
          <div className={`flex-1 grid ${show2DView && show3D ? 'grid-cols-2' : 'grid-cols-1'} gap-0`}>
            {/* 2D View */}
            {show2DView && (
              <div className="relative bg-slate-900/30 backdrop-blur-sm border-r border-slate-800">
                <div className="absolute top-4 left-4 z-10">
                  <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-medium text-slate-300">2D Segmentation View</span>
                  </div>
                </div>
                <Simple2DSegmentationViewer
                  segmentationData={segmentationData}
                  currentTimeIndex={currentFrame}
                  currentLayerIndex={currentSlice}
                  onTimeChange={(e) => setCurrentFrame(parseInt(e.target.value))}
                  onLayerChange={(e) => setCurrentSlice(parseInt(e.target.value))}
                  maxTimeIndex={maxTimeIndex}
                  maxLayerIndex={maxLayerIndex}
                  projectId={projectId}
                  api={api}
                  maskOpacity={0.5}
                />
              </div>
            )}

            {/* 3D View */}
            {show3D && (
              <div className="relative bg-slate-900/30 backdrop-blur-sm">
                <div className="absolute top-4 left-4 z-10">
                  <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-medium text-slate-300">3D Reconstruction View</span>
                  </div>
                </div>
                
                {hasReconstruction && currentMeshUrl ? (
                  <Canvas>
                    <PerspectiveCamera makeDefault position={[0, 0, 150]} fov={50} />
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
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-slate-500 max-w-md px-6">
                      <div className="relative mb-6">
                        <div className="w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl mx-auto" />
                        <Heart className="w-20 h-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
                      </div>
                      <p className="text-lg mb-2 text-slate-400">No 3D Mesh Available</p>
                      <p className="text-sm mb-4 text-slate-500">
                        Select an end-diastolic frame and start reconstruction to generate 3D cardiac mesh visualization
                      </p>
                      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-left">
                        <div className="flex items-start space-x-2">
                          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-slate-400 leading-relaxed">
                            <strong className="text-slate-300">SDF-Based Reconstruction:</strong> Uses deep learning to create smooth, anatomically accurate 3D meshes from 2D segmentation masks across all cardiac phases.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
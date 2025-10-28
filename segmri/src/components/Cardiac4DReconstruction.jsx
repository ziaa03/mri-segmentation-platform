import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, Environment } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { 
  Play, Pause, SkipBack, SkipForward, Download, 
  Loader, AlertCircle, CheckCircle, Settings, Layers,
  Heart, Activity, Clock, RefreshCw, ChevronDown, Info,
  Maximize2, Minimize2, Grid3x3, Eye, EyeOff, Zap,
  ArrowLeft, Server, Database, FileText, Trash2, Archive
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
// Import reconstruction history page
import ReconstructionHistoryPage from './ReconstructionHistoryPage';

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

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

const StatsCard = ({ icon: Icon, label, value, color = "text-blue-400" }) => (
  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <div className={`text-2xl font-bold ${color}`}>{value}</div>
  </div>
);

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

// ============================================================================
// 3D COMPONENTS - COMPLETELY REBUILT
// ============================================================================

const GridFloor = () => {
  return (
    <Grid
      position={[0, -50, 0]}
      args={[200, 200]}
      cellSize={5}
      cellThickness={0.5}
      cellColor="#1e3a8a"
      sectionSize={20}
      sectionThickness={1}
      sectionColor="#3b82f6"
      fadeDistance={150}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid={false}
    />
  );
};

// COMPLETELY REBUILT AnimatedMesh Component
function AnimatedMesh({ meshUrl, autoRotate, meshColor }) {
  const [mesh, setMesh] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const groupRef = useRef();

  useEffect(() => {
    if (!meshUrl) {
      console.warn('⚠️ No meshUrl provided to AnimatedMesh');
      setMesh(null);
      return;
    }

    console.log('🔄 Loading mesh from:', meshUrl.substring(0, 50) + '...');
    setLoading(true);
    setError(null);
    
    const loader = new GLTFLoader();
    
    loader.load(
      meshUrl,
      // Success callback
      (gltf) => {
        console.log('✅ GLTF loaded successfully');
        
        const scene = gltf.scene;
        let foundMeshes = 0;
        
        // Log scene structure
        console.log('📦 Scene structure:', {
          children: scene.children.length,
          position: scene.position.toArray(),
          scale: scene.scale.toArray()
        });
        
        // Process all meshes in the scene
        scene.traverse((child) => {
          if (child.isMesh) {
            foundMeshes++;
            
            console.log(`🔍 Processing mesh ${foundMeshes}:`, {
              name: child.name,
              hasGeometry: !!child.geometry,
              vertexCount: child.geometry?.attributes?.position?.count || 0,
              hasMaterial: !!child.material,
              visible: child.visible,
              position: child.position.toArray(),
              scale: child.scale.toArray()
            });
            
            // Apply simple, bright material for testing
            child.material = new THREE.MeshStandardMaterial({
              color: meshColor || '#e9c8c8', 
              metalness: 0.3,
              roughness: 0.7,
              side: THREE.DoubleSide,
              flatShading: false
            });
            
            // Ensure visibility
            child.visible = true;
            child.frustumCulled = false;
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Add wireframe for debugging
            const wireframe = new THREE.WireframeGeometry(child.geometry);
            const line = new THREE.LineSegments(wireframe);
            line.material = new THREE.LineBasicMaterial({ 
              color: 0x000000, 
              transparent: true, 
              opacity: 0.1 
            });
            child.add(line);
          }
        });
        
        if (foundMeshes === 0) {
          console.error('❌ No meshes found in GLTF scene!');
          setError('No meshes found in GLB file');
          setLoading(false);
          return;
        }
        
        console.log(`✅ Found ${foundMeshes} mesh(es) in scene`);
        
        // Calculate bounding box and center the mesh
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        console.log('📐 Mesh dimensions:', {
          center: center.toArray(),
          size: size.toArray(),
          min: box.min.toArray(),
          max: box.max.toArray()
        });
        
        // Center the mesh at origin
        scene.position.x = -center.x;
        scene.position.y = -center.y;
        scene.position.z = -center.z;
        
        console.log('✅ Mesh centered and ready to render');
        
        setMesh(scene);
        setLoading(false);
      },
      // Progress callback
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        if (percent % 20 === 0) { // Log every 20%
          console.log(`📊 Loading progress: ${percent.toFixed(0)}%`);
        }
      },
      // Error callback
      (error) => {
        console.error('❌ GLTF loading error:', error);
        setError(error.message || 'Failed to load mesh');
        setLoading(false);
      }
    );
    
    return () => {
      if (mesh) {
        mesh.traverse((child) => {
          if (child.isMesh) {
            child.geometry?.dispose();
            child.material?.dispose();
          }
        });
      }
    };
  }, [meshUrl, meshColor]);

  useFrame(() => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  if (loading) {
    console.log('⏳ AnimatedMesh: Rendering loading state');
    return null;
  }
  
  if (error) {
    console.error('❌ AnimatedMesh: Rendering error state:', error);
    return null;
  }
  
  if (!mesh) {
    console.log('⚠️ AnimatedMesh: No mesh to render');
    return null;
  }

  console.log('✅ AnimatedMesh: Rendering mesh');
  
  return (
    <group ref={groupRef}>
      <primitive object={mesh} />
    </group>
  );
}

// ============================================================================
// MODAL COMPONENTS
// ============================================================================

const ExportModal = ({ isOpen, onClose, reconstructionData, onExport, isExporting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Download className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Export Reconstruction</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
              disabled={isExporting}
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="text-white font-medium">{reconstructionData?.name || 'Reconstruction'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Format:</span>
                <span className="text-white font-medium uppercase">{reconstructionData?.meshFormat || 'GLB'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">File Size:</span>
                <span className="text-white font-medium">
                  {reconstructionData?.meshFileSize 
                    ? `${(reconstructionData.meshFileSize / 1024 / 1024).toFixed(2)} MB`
                    : 'N/A'
                  }
                </span>
              </div>
            </div>

            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p><strong className="text-blue-300">Export Contents:</strong></p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                    <li>TAR archive containing all mesh files</li>
                    <li>One mesh file per cardiac frame</li>
                    <li>Compatible with 3D software</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onExport}
              disabled={isExporting}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isExporting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download TAR</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, reconstructionData, onDelete, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-red-900/50 rounded-xl shadow-2xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Delete Reconstruction</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
              disabled={isDeleting}
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <p className="text-red-200 text-sm mb-3">
                Are you sure you want to delete this reconstruction? This action cannot be undone.
              </p>
            </div>

            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-200">
                  <strong>Warning:</strong> This will permanently delete all mesh files and metadata.
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isDeleting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
  const [currentView, setCurrentView] = useState('main'); // 'main' or 'history'
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
  const [meshColor, setMeshColor] = useState('#e9c8c8'); 
  const [show2DView, setShow2DView] = useState(true);
  const [show3D, setShow3D] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Export and Delete Modals 
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedReconstruction, setSelectedReconstruction] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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

    console.log('🔄 Loading reconstruction from history...');
    setJobStatus('loading');
    setReconstructionError(null);
    setIsReconstructing(true);
    
    try {
      setReconstructionMetadata(reconstruction.metadata);
      await loadMeshesFromTar(reconstruction.downloadUrl);
      setJobStatus('COMPLETED');
      setCurrentView('main');
      setIsReconstructing(false);
      console.log('✅ Reconstruction loaded from history');
    } catch (error) {
      console.error('❌ Error loading reconstruction:', error);
      setReconstructionError('Failed to load reconstruction: ' + error.message);
      setJobStatus('error');
      setIsReconstructing(false);
    }
  };

  // Update current mesh URL when frame changes
  useEffect(() => {
    if (processedMeshes.length > 0) {
      const meshUrl = getMeshUrlForFrame(processedMeshes, currentFrame);
      console.log(`🔄 Frame ${currentFrame}: Setting mesh URL:`, meshUrl ? 'valid' : 'null');
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

  // Start 4D Reconstruction
  const handleStartReconstruction = async () => {
    if (!projectId || !api) {
      alert('Error: Missing project ID or API client');
      return;
    }

    setIsReconstructing(true);
    setJobStatus('PENDING');
    setReconstructionError(null);

    try {
      const edFrameIndex = selectedEDFrame - 1;
      
      const payload = {
        reconstructionName: `4D Reconstruction - ED Frame ${selectedEDFrame}`,
        reconstructionDescription: `4D cardiac reconstruction from AI segmentation masks (ED: Frame ${selectedEDFrame})`,
        ed_frame: edFrameIndex,
        export_format: 'glb',
        parameters: {
          num_iterations: 50,
          resolution: 128,
          process_all_frames: true,
          debug_save: false
        }
      };

      console.log('🚀 Starting reconstruction with payload:', payload);
      const response = await api.post(`/reconstruction/start-reconstruction/${projectId}`, payload);
      
      if (response.data?.uuid) {
        console.log('✅ Reconstruction job started:', response.data.uuid);
        setJobUuid(response.data.uuid);
        startPollingJobStatus(response.data.uuid);
      } else {
        throw new Error('No job UUID returned from server');
      }
    } catch (error) {
      console.error('❌ Reconstruction error:', error);
      
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
    }
  };

  // Poll job status
  const startPollingJobStatus = (uuid) => {
    console.log('🔄 Starting job polling for:', uuid);
    
    pollingRef.current = setInterval(async () => {
      try {
        const response = await api.get('/reconstruction/user-check-jobs');
        const data = response.data;
        
        const job = data.jobs?.find(j => j.jobId === uuid);
        
        if (!job) {
          console.warn('⚠️ Job not found in poll response');
          return;
        }
        
        console.log(`📊 Job status: ${job.status}`);
        setJobStatus(job.status);
        setQueuePosition(job.queuePosition);
        
        if (job.status === 'COMPLETED' || job.status === 'completed') {
          console.log('✅ Job completed, loading results...');
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          
          setTimeout(async () => {
            await loadReconstructionResults();
          }, 1000);
          
        } else if (job.status === 'FAILED' || job.status === 'failed') {
          console.error('❌ Job failed');
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setReconstructionError('Reconstruction job failed on server');
          setJobStatus('FAILED');
          setIsReconstructing(false);
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, 3000);
  };

  // Load reconstruction results
  const loadReconstructionResults = async () => {
    console.log('🔄 Loading reconstruction results...');
    
    try {
      const response = await api.get(`/reconstruction/reconstruction-results/${projectId}`);
      const data = response.data;
      
      console.log('📦 Reconstruction results:', data);
      
      if (!data.success || !data.reconstructions?.length) {
        throw new Error('No reconstruction results found');
      }
      
      const latestReconstruction = data.reconstructions[0];
      console.log('📦 Latest reconstruction:', latestReconstruction);
      
      // Update history with latest data
      setReconstructionHistory(data.reconstructions);
      
      setReconstructionMetadata(latestReconstruction.metadata);
      
      if (!latestReconstruction.downloadUrl) {
        throw new Error('No download URL available for reconstruction');
      }
      
      await loadMeshesFromTar(latestReconstruction.downloadUrl);
      setJobStatus('COMPLETED');
      
    } catch (error) {
      console.error('❌ Error loading results:', error);
      setReconstructionError(error.message || 'Failed to load reconstruction results');
      setJobStatus('error');
    } finally {
      setIsReconstructing(false);
    }
  };

  // Load meshes from TAR file
  const loadMeshesFromTar = async (tarUrl) => {
    console.log('🔄 Loading meshes from TAR:', tarUrl);
    
    try {
      const extractedFiles = await fetchAndExtractMeshTar(tarUrl);
      console.log('📦 Extracted files:', extractedFiles?.length || 0);
      
      if (!extractedFiles || extractedFiles.length === 0) {
        throw new Error('No mesh files found in TAR archive');
      }
      
      const meshes = processExtractedMeshes(extractedFiles);
      console.log('✅ Processed meshes:', meshes.length);
      
      if (meshes.length === 0) {
        throw new Error('Failed to process mesh files');
      }
      
      setProcessedMeshes(meshes);
      setCurrentFrame(0);
      
      console.log('✅ Meshes loaded successfully');
      
    } catch (error) {
      console.error('❌ Error loading meshes from TAR:', error);
      throw error;
    }
  };

  // Export handler
  const handleExportClick = (reconstruction) => {
    setSelectedReconstruction(reconstruction);
    setShowExportModal(true);
  };

  const handleExport = async () => {
    if (!selectedReconstruction?.downloadUrl) {
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch(selectedReconstruction.downloadUrl);
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reconstruction_${selectedReconstruction.name.replace(/\s+/g, '_')}_${Date.now()}.tar`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setTimeout(() => {
        setShowExportModal(false);
        setIsExporting(false);
      }, 500);
      
    } catch (error) {
      console.error('❌ Export error:', error);
      setIsExporting(false);
    }
  };

  // Delete handler
  const handleDeleteClick = (reconstruction) => {
    setSelectedReconstruction(reconstruction);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!selectedReconstruction?.reconstructionId) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await api.delete(`/reconstruction/delete-project-reconstructions/${projectId}`);
      
      if (response.data.success) {
        setReconstructionHistory(prev => 
          prev.filter(r => r.reconstructionId !== selectedReconstruction.reconstructionId)
        );
        
        if (selectedReconstruction.reconstructionId === reconstructionMetadata?.reconstructionId) {
          setReconstructionMetadata(null);
          setProcessedMeshes([]);
          cleanupMeshUrls(processedMeshes);
        }
        
        setShowDeleteModal(false);
        setSelectedReconstruction(null);
      } else {
        throw new Error(response.data.message || 'Delete failed');
      }
      
    } catch (error) {
      console.error('❌ Delete error:', error);
    } finally {
      setIsDeleting(false);
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

  // Debug logging
  useEffect(() => {
    console.log('🔍 Render State:', {
      show3D,
      hasReconstruction,
      meshCount: processedMeshes.length,
      currentFrame,
      currentMeshUrl: currentMeshUrl ? 'exists' : 'null',
      meshColor
    });
  }, [show3D, hasReconstruction, processedMeshes.length, currentFrame, currentMeshUrl, meshColor]);

  // Handle history view
  if (currentView === 'history') {
    return (
      <ReconstructionHistoryPage
        reconstructionHistory={reconstructionHistory}
        onBack={() => setCurrentView('main')}
        onLoadReconstruction={loadReconstructionFromHistory}
        api={api}
        projectId={projectId}
        onRefreshHistory={loadReconstructionHistory}
        isLoadingReconstruction={isReconstructing}
      />
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="w-full bg-slate-950 flex flex-col relative" style={{ height: 'calc(100vh - 64px)' }}>
      <AnimatedGridBackground />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setSelectedReconstruction(null);
        }}
        reconstructionData={selectedReconstruction}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedReconstruction(null);
        }}
        reconstructionData={selectedReconstruction}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex relative z-10 min-h-0">

        {/* Left Sidebar */}
        <div className="w-80 bg-slate-900/50 backdrop-blur-sm border-r border-slate-800 p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          
          {/* Status & History */}
          <div className="space-y-3">
            <StatusBadge status={jobStatus} queuePosition={queuePosition} />
            
            {/* History Button */}
            <button
              onClick={() => setCurrentView('history')}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all"
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

                {/* Playback controls: previous / play-pause / next */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePreviousFrame}
                    disabled={!hasReconstruction}
                    className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Previous frame"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={togglePlayback}
                    disabled={!hasReconstruction}
                    className={`p-2 rounded-lg transition-flex ${isPlaying ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleNextFrame}
                    disabled={!hasReconstruction}
                    className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Next frame"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
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

            <label className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-300">Show Grid</span>
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  showGrid ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  showGrid ? 'translate-x-5' : 'translate-x-0'
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
              <div className="relative bg-slate-900/30 backdrop-blur-sm h-full">
                <div className="absolute top-4 left-4 z-10">
                  <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-medium text-slate-300">3D Reconstruction View</span>
                  </div>
                </div>
                
                {hasReconstruction && currentMeshUrl ? (
                  <div className="w-full h-full">
                    <Canvas
                    dpr={[1, 2]}
                    gl={{ 
                      antialias: true,
                      alpha: true,
                      toneMapping: THREE.NoToneMapping,  // ← Changed to no tone mapping
                      toneMappingExposure: 1.0
                    }}
                    camera={{ position: [0, 0, 150], fov: 50 }}
                  >
                    {/* White background for testing */}
                    <color attach="background" args={['black']} />
                    
                    {/* EXTREMELY BRIGHT LIGHTING */}
                    <ambientLight intensity={3.0} />
                    <directionalLight position={[10, 10, 10]} intensity={5.0} />
                    <directionalLight position={[-10, -10, -10]} intensity={3.0} />
                    <pointLight position={[0, 0, 150]} intensity={10.0} />  
                    
                    {showGrid && <GridFloor />}
                    
                    <AnimatedMesh 
                      meshUrl={currentMeshUrl}
                      autoRotate={autoRotate}
                      meshColor={meshColor}
                    />
                    
                    <OrbitControls />
                  </Canvas>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-slate-500 max-w-md px-6">
                      <div className="relative mb-6">
                        <div className="w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl mx-auto" />
                        <Heart className="w-20 h-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20" />
                      </div>
                      <p className="text-lg mb-2 text-slate-400">No 3D Mesh Available</p>
                      <p className="text-sm mb-4 text-slate-500">
                        {isReconstructing 
                          ? 'Processing reconstruction...' 
                          : 'Select an end-diastolic frame and start reconstruction to generate 3D cardiac mesh visualization'
                        }
                      </p>
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
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Heart, Upload, Play, Pause, Save, Download, Settings, 
  Monitor, Activity, Layers, Clock, Zap, Eye, EyeOff,
  Grid, Target, Brain, FileImage, AlertTriangle, CheckCircle,
  RotateCcw, ZoomIn, ZoomOut, Info, Edit, Trash2, Plus,
  ChevronLeft, ChevronRight, Maximize2, BarChart3, Cpu, Cloud
} from 'lucide-react';
import api from '../api/AxiosInstance';
import { 
  decodeRLE, 
  renderMaskOnCanvas, 
  encodeRLE,
  processAndUploadMasks, 
  batchUploadAllMasks,
  uploadMaskToS3
} from '../utils/RLE-Decoder';
import { 
  fetchAndExtractTarFile, 
  processExtractedImages, 
  getAvailableFramesAndSlices, 
  findClosestImage, 
  cleanupImageUrls 
} from '../utils/TarExtractor';

import * as fabric from 'fabric'; 

import { ProfessionalMedicalHeader, EnhancedMedicalFileUpload } from './MedicalComponents';

// ====== UTILITY FUNCTIONS ======
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getClassColor = (className) => {
  const colors = {
    'MYO': '#8B4513',  // Saddle brown for Myocardium
    'LVC': '#CD853F',  // Peru/tan for Left Ventricle Cavity
    'RV': '#A0522D'    // Sienna for Right Ventricle
  };
  return colors[className] || '#DEB887';
};

// Fetch presigned URL function from original code
const fetchPresignedUrl = async (projectId) => {
  console.log('Fetching presigned URL for projectId:', projectId);
  try {
    const response = await api.get(`/project/get-project-presigned-url?projectId=${projectId}`);
    console.log('Response:', { status: response.status, data: response.data });
    const data = response.data;
    if (data && data.success === false) throw new Error(data.message || 'Backend returned an error');
    const presignedUrl = data?.presignedUrl || data?.url || data?.data?.presignedUrl;
    if (!presignedUrl) {
      console.error('No presigned URL found. Response keys:', Object.keys(data || {}));
      throw new Error('No presigned URL found in response');
    }
    console.log('Got presigned URL');
    return presignedUrl;
  } catch (error) {
    console.error('Error fetching presigned URL:', error);
    throw error;
  }
};

// ====== REAL API OBJECT ======
const realAPI = {
  // Upload project
  uploadProject: async (formData) => {
    try {
      const response = await api.put('/project/upload-new-project', formData, {
        withCredentials: true,
      });

      const isSuccess = response.data.success === true || 
                       response.status === 200 || 
                       (response.data.message && response.data.message.includes('successfully'));
      
      if (!isSuccess) {
        throw new Error('Upload failed. A project with the same name and content already exists.');
      }

      return response;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },

  // Fetch most recent project ID
  fetchMostRecentProject: async (uploadedFileName) => {
    try {     
      const response = await api.get('/project/get-projects-list');

      if (response.data && response.data.projects && Array.isArray(response.data.projects)) {
        const projects = response.data.projects;
        
        if (projects.length === 0) {
          throw new Error('No projects found after upload');
        }

        let mostRecentProject = null;
        
        if (uploadedFileName) {
          mostRecentProject = projects.find(p => 
            p.name === uploadedFileName || 
            p.name.includes(uploadedFileName.replace(/\.[^/.]+$/, ''))
          );
        }
        
        if (!mostRecentProject) {
          mostRecentProject = projects.reduce((latest, current) => {
            const latestDate = new Date(latest.createdAt || latest.updatedAt);
            const currentDate = new Date(current.createdAt || current.updatedAt);
            return currentDate > latestDate ? current : latest;
          });
        }

        const projectId = mostRecentProject.projectId;
        
        if (!projectId) {
          throw new Error('Project ID not found in project data');
        }

        return projectId;
      } else {
        throw new Error('Invalid response structure from projects list endpoint');
      }
    } catch (error) {
      console.error('Error fetching recent project:', error);
      throw error;
    }
  },

  // Start segmentation
  startSegmentation: async (projectId) => {
    try {
      const response = await api.post(`/segmentation/start-segmentation/${projectId}`, {
        projectId: projectId
      });

      if (!response.data.uuid) {
        throw new Error('No job UUID received from segmentation start');
      }

      return response;
    } catch (error) {
      console.error('Segmentation start error:', error);
      throw error;
    }
  },

  // Get segmentation results
  getResults: async (projectId) => {
    try {
      const response = await api.get(`/segmentation/segmentation-results/${projectId}`);
      
      if (!response.data) {
        throw new Error('No results data received');
      }

      const hasResults = response.data && (
        (response.data.segmentations && Array.isArray(response.data.segmentations) && response.data.segmentations.length > 0) ||
        (Array.isArray(response.data) && response.data.length > 0) ||
        (response.data.frames && Array.isArray(response.data.frames))
      );
      
      if (!hasResults) {
        throw new Error('No segmentation results found');
      }

      let hasActualMasks = false;
      if (response.data.segmentations) {
        response.data.segmentations.forEach(seg => {
          if (seg.frames) {
            seg.frames.forEach(frame => {
              if (frame.slices) {
                frame.slices.forEach(slice => {
                  if (slice.segmentationmasks) {
                    slice.segmentationmasks.forEach(mask => {
                      if (mask.segmentationmaskcontents) {
                        hasActualMasks = true;
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }

      if (!hasActualMasks) {
        throw new Error('No actual mask content found in results');
      }

      return response;
    } catch (error) {
      console.error('Get results error:', error);
      throw error;
    }
  },

  // Save project
  saveProject: async (projectId) => {
    try {
      const response = await api.patch('/project/save-project', {
        projectId: projectId,
        isSaved: true
      });

      if (!response.data || !response.data.success) {
        const errorMsg = response.data?.message || 'Unknown error occurred';
        throw new Error(`Failed to save project: ${errorMsg}`);
      }

      return response;
    } catch (error) {
      let errorMessage = 'Failed to save project.';
      
      if (error.response) {
        const serverMessage = error.response.data?.message || error.response.statusText;
        errorMessage = `Failed to save project: ${serverMessage}`;
      } else if (error.request) {
        errorMessage = 'Failed to save project: Network error';
      } else {
        errorMessage = `Failed to save project: ${error.message}`;
      }
      
      console.error('Save project error:', error);
      throw new Error(errorMessage);
    }
  },

  // Export project
  exportProject: async (projectId) => {
    try {
      const response = await api.get(`/segmentation/export-project-data/${projectId}`, {
        withCredentials: true,
      });

      if (response.data?.success && response.data?.exportPackageUrl) {
        window.open(response.data.exportPackageUrl, '_blank');
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      throw new Error('Failed to export project data.');
    }
  },

  // Get project dimensions
  getProjectDimensions: async (projectId) => {
    try {
      const response = await api.get(`/project/get-project-info/${projectId}`);
      
      if (response.data.success && response.data.project && response.data.project.dimensions) {
        const { width, height } = response.data.project.dimensions;
        if (width && height && width > 0 && height > 0) {
          return { width, height };
        }
      }
      
      return { width: 512, height: 512 };
    } catch (error) {
      console.error('Error fetching project dimensions:', error);
      return { width: 512, height: 512 };
    }
  },

  // Poll for results
  pollResults: async (projectId, intervalMs = 10000, maxAttempts = 60) => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const response = await realAPI.getResults(projectId);
          clearInterval(pollInterval);
          resolve(response);
        } catch (error) {
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            reject(new Error('Polling timeout: Results not available after maximum attempts'));
          }
        }
      }, intervalMs);
    });
  }
};

// ====== CONTROL PANEL COMPONENT ======
const MedicalControlPanel = ({ 
  currentTimeIndex, maxTimeIndex, currentLayerIndex, maxLayerIndex,
  onTimeChange, onLayerChange, onSave, onExport, projectId, processingComplete, handleUploadCurrentMasks, handleUploadAllMasks, uploadingMasks, segmentationData
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
    <div className="bg-slate-800 border border-cyan-400/30 rounded-lg">
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-4 border-b border-cyan-400/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className="w-5 h-5 text-cyan-400" />
            <span className="text-white font-medium">IMAGING CONTROLS</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-xs">LIVE</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Temporal Navigation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-white text-sm font-medium">TEMPORAL</span>
            </div>
            <div className="text-cyan-400 text-xs">
              {currentTimeIndex + 1} / {maxTimeIndex + 1} 
              <span className="text-slate-400 ml-2">({timeProgress.toFixed(1)}%)</span>
            </div>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min="0"
              max={maxTimeIndex}
              value={currentTimeIndex}
              onChange={onTimeChange}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer medical-slider"
              style={{
                background: `linear-gradient(to right, #00D2FF 0%, #00D2FF ${timeProgress}%, #475569 ${timeProgress}%, #475569 100%)`
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => onTimeChange({ target: { value: Math.max(0, currentTimeIndex - 1) } })}
              disabled={currentTimeIndex <= 0}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-cyan-400 rounded disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!processingComplete}
              className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded disabled:opacity-50"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => onTimeChange({ target: { value: Math.min(maxTimeIndex, currentTimeIndex + 1) } })}
              disabled={currentTimeIndex >= maxTimeIndex}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-cyan-400 rounded disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Spatial Navigation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-green-400" />
              <span className="text-white text-sm font-medium">SPATIAL</span>
            </div>
            <div className="text-green-400 text-xs">
              {currentLayerIndex + 1} / {maxLayerIndex + 1}
              <span className="text-slate-400 ml-2">({layerProgress.toFixed(1)}%)</span>
            </div>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min="0"
              max={maxLayerIndex}
              value={currentLayerIndex}
              onChange={onLayerChange}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer medical-slider"
              style={{
                background: `linear-gradient(to right, #00FF88 0%, #00FF88 ${layerProgress}%, #475569 ${layerProgress}%, #475569 100%)`
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => onLayerChange({ target: { value: Math.max(0, currentLayerIndex - 1) } })}
              disabled={currentLayerIndex <= 0}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-green-400 rounded disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-slate-400 text-xs">SLICE</span>
            
            <button
              onClick={() => onLayerChange({ target: { value: Math.min(maxLayerIndex, currentLayerIndex + 1) } })}
              disabled={currentLayerIndex >= maxLayerIndex}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-green-400 rounded disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="border-t border-slate-700 pt-4">
          <div className="text-cyan-400 text-xs font-medium mb-3">SYSTEM STATUS</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/50 rounded p-2">
              <div className="text-slate-400 text-xs">FRAMES</div>
              <div className="text-white font-mono">{maxTimeIndex + 1}</div>
            </div>
            <div className="bg-slate-700/50 rounded p-2">
              <div className="text-slate-400 text-xs">SLICES</div>
              <div className="text-white font-mono">{maxLayerIndex + 1}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onSave}
            disabled={!projectId}
            className="w-full flex items-center justify-center space-x-2 p-3 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>SAVE ANALYSIS</span>
          </button>

          {/* Add after your existing SAVE ANALYSIS and AI SMART SEGMENTATION buttons */}
          <button
            onClick={handleUploadCurrentMasks}
            disabled={!segmentationData || uploadingMasks}
            className="w-full flex items-center justify-center space-x-2 p-3 bg-orange-600 hover:bg-orange-700 text-white rounded disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{uploadingMasks ? 'UPLOADING...' : 'UPLOAD CURRENT MASKS'}</span>
          </button>

          <button
            onClick={handleUploadAllMasks}
            disabled={!segmentationData || uploadingMasks}
            className="w-full flex items-center justify-center space-x-2 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50"
          >
            <Cloud className="w-4 h-4" />
            <span>UPLOAD ALL MASKS</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ====== IMPROVED SEGMENTATION DISPLAY WITH FABRIC.JS ======
const MedicalSegmentationDisplay = ({ 
  segmentationData, currentTimeIndex, currentLayerIndex, 
  onMaskSelected, selectedMask, projectId, canvasDimensions,
  onSaveManualAnnotations, setSegmentationData, maxTimeIndex, maxLayerIndex, onTimeChange, onLayerChange
}) => {
  const aiCanvasRef = useRef(null);
  const manualCanvasRef = useRef(null);
  const aiFabricCanvasRef = useRef(null);
  const manualFabricCanvasRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [visibleMasks, setVisibleMasks] = useState({});
  const [maskOpacity, setMaskOpacity] = useState(0.7);
  const [isEditMode, setIsEditMode] = useState(false);

  // Image loading states
  const [extractedImages, setExtractedImages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Manual annotation states
  const [selectedTool, setSelectedTool] = useState('brush');
  const [selectedClass, setSelectedClass] = useState('MYO');
  const [brushSize, setBrushSize] = useState(10);
  const [drawingHistory, setDrawingHistory] = useState([]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    // AI Canvas (read-only)
    if (aiCanvasRef.current) {
      const aiCanvas = new fabric.Canvas(aiCanvasRef.current, {
        width: canvasDimensions.width,
        height: canvasDimensions.height,
        backgroundColor: '#1e1e1e',
        selection: false,
        allowTouchScrolling: true
      });
      aiFabricCanvasRef.current = aiCanvas;
    }

    // Manual Canvas (editable)
    if (manualCanvasRef.current) {
      const manualCanvas = new fabric.Canvas(manualCanvasRef.current, {
        width: canvasDimensions.width,
        height: canvasDimensions.height,
        backgroundColor: '#1e1e1e'
      });
      manualFabricCanvasRef.current = manualCanvas;

      // Handle drawing events only on manual canvas
      manualCanvas.on('path:created', (e) => {
        const path = e.path;
        path.set({
          selectable: false,
          evented: false,
          className: selectedClass,
          toolType: selectedTool
        });
        setDrawingHistory(prev => [...prev, { 
          type: selectedTool, 
          class: selectedClass, 
          fabricObject: path 
        }]);
      });
    }

    return () => {
      aiFabricCanvasRef.current?.dispose();
      manualFabricCanvasRef.current?.dispose();
    };
  }, [canvasDimensions]);

  // Load images on both canvases
  useEffect(() => {
    const loadImageOnCanvas = (canvas, isManual = false) => {
      if (!canvas || !currentImage?.url) return;

      fabric.Image.fromURL(currentImage.url, (img) => {
        if (!img) return;

        const scaleX = canvasDimensions.width / img.width;
        const scaleY = canvasDimensions.height / img.height;
        const scale = Math.min(scaleX, scaleY);

        img.set({
          scaleX: scale,
          scaleY: scale,
          left: (canvasDimensions.width - img.width * scale) / 2,
          top: (canvasDimensions.height - img.height * scale) / 2,
          selectable: false,
          evented: false
        });

        canvas.setBackgroundImage(img, () => {
          canvas.renderAll();
        });
      }, { crossOrigin: 'anonymous' });
    };

    if (isEditMode) {
      loadImageOnCanvas(aiFabricCanvasRef.current, false);
      loadImageOnCanvas(manualFabricCanvasRef.current, true);
    } else {
      loadImageOnCanvas(aiFabricCanvasRef.current, false);
    }
  }, [currentImage, canvasDimensions, isEditMode]);

  // Update drawing settings including eraser
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (selectedTool === 'eraser' && isEditMode) {
      canvas.isDrawingMode = true;
      if (fabric.EraserBrush) {
        canvas.freeDrawingBrush = new fabric.EraserBrush(canvas);
        canvas.freeDrawingBrush.width = brushSize;
      } else {
        // Fallback if EraserBrush not available
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = brushSize;
        canvas.freeDrawingBrush.color = 'rgba(0,0,0,0.1)';
      }
    } else if (selectedTool === 'brush' && isEditMode) {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = getClassColor(selectedClass);
    } else {
      canvas.isDrawingMode = false;
    }
  }, [selectedTool, selectedClass, brushSize, isEditMode]);

  // Load extracted images
  useEffect(() => {
    const loadExtractedImages = async () => {
      if (!projectId) return;
      setIsLoadingImages(true);
      try {
        const presignedUrl = await fetchPresignedUrl(projectId);
        const extractedTarFiles = await fetchAndExtractTarFile(presignedUrl);
        const processedImages = processExtractedImages(extractedTarFiles);
        setExtractedImages(processedImages);
        
        if (processedImages.length > 0) {
          const { frames, slices } = getAvailableFramesAndSlices(processedImages);
          const initialImage = findClosestImage(processedImages, frames[0] ?? 0, slices[0] ?? 0);
          if (initialImage) setCurrentImage(initialImage);
        }
      } catch (error) {
        console.error('Error loading extracted images:', error);
      } finally {
        setIsLoadingImages(false);
      }
    };
    loadExtractedImages();
    return () => cleanupImageUrls(extractedImages);
  }, [projectId]);

  // Update current image when indices change
  useEffect(() => {
    if (extractedImages.length === 0) return;
    const targetImage = findClosestImage(extractedImages, currentTimeIndex, currentLayerIndex);
    setCurrentImage(targetImage);
  }, [extractedImages, currentTimeIndex, currentLayerIndex]);

  // Load background image with proper aspect ratio
  useEffect(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas || !currentImage?.url) {
    console.log('Canvas or image not available:', { canvas: !!canvas, image: !!currentImage });
    return;
  }

  console.log('Loading image:', currentImage.url);

  fabric.Image.fromURL(currentImage.url, (img) => {
    if (!img) {
      console.error('Failed to load image');
      return;
    }

    console.log('Image loaded:', img.width, 'x', img.height);

    const scaleX = canvasDimensions.width / img.width;
    const scaleY = canvasDimensions.height / img.height;
    const scale = Math.min(scaleX, scaleY);

    img.set({
      scaleX: scale,
      scaleY: scale,
      left: (canvasDimensions.width - img.width * scale) / 2,
      top: (canvasDimensions.height - img.height * scale) / 2,
      selectable: false,
      evented: false
    });

    canvas.setBackgroundImage(img, () => {
      canvas.renderAll();
      console.log('Background image set');
    });
  }, { 
    crossOrigin: 'anonymous',
    // Add these options to help with loading
    originX: 'left',
    originY: 'top'
  });
}, [currentImage, canvasDimensions]);

// Fix mask rendering - CORRECTED VERSION
useEffect(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas || !segmentationData) {
    console.log('Canvas or segmentation data not available');
    return;
  }

  console.log('Rendering masks for frame:', currentTimeIndex, 'slice:', currentLayerIndex);

  // Remove existing mask objects
  const objects = canvas.getObjects().filter(obj => obj.isMask);
  objects.forEach(obj => canvas.remove(obj));

  const sliceData = segmentationData.masks?.[currentTimeIndex]?.[currentLayerIndex];
  if (!sliceData?.segmentationMasks) {
    console.log('No slice data available');
    return;
  }

  console.log('Found masks:', sliceData.segmentationMasks.length);

  sliceData.segmentationMasks.forEach((maskData, index) => {
    const maskId = `${maskData.class}_${currentTimeIndex}_${currentLayerIndex}`;
    const isVisible = visibleMasks[maskId] !== false;
    
    console.log('Processing mask:', maskData.class, 'visible:', isVisible);
    
    if (!isVisible) return;

    try {
      const rleData = maskData.segmentationmaskcontents;
      if (!rleData) {
        console.log('No RLE data for mask:', maskData.class);
        return;
      }

      const binaryMask = decodeRLE(rleData, canvasDimensions.height, canvasDimensions.width);
      const maskCanvas = createMaskCanvas(binaryMask, canvasDimensions.width, canvasDimensions.height, getClassColor(maskData.class));
      
      fabric.Image.fromURL(maskCanvas.toDataURL(), (img) => {
        if (!img) {
          console.error('Failed to create mask image');
          return;
        }

        img.set({
          left: 0,
          top: 0,
          selectable: false,
          evented: false,
          opacity: maskOpacity,
          isMask: true,
          className: maskData.class
        });
        
        canvas.add(img);
        canvas.renderAll();
        console.log('Added mask:', maskData.class);
      });
    } catch (error) {
      console.error('Error processing mask:', maskData.class, error);
    }
  });
}, [segmentationData, currentTimeIndex, currentLayerIndex, visibleMasks, maskOpacity, canvasDimensions]);

  // Render segmentation masks with opacity control
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !segmentationData) return;

    // Remove existing mask objects
    const objects = canvas.getObjects().filter(obj => obj.isMask);
    objects.forEach(obj => canvas.remove(obj));

    const sliceData = segmentationData.masks?.[currentTimeIndex]?.[currentLayerIndex];
    if (!sliceData?.segmentationMasks) return;

    sliceData.segmentationMasks.forEach(maskData => {
      const maskId = `${maskData.class}_${currentTimeIndex}_${currentLayerIndex}`;
      const isVisible = visibleMasks[maskId] !== false;
      
      if (!isVisible) return;

      try {
        const rleData = maskData.segmentationmaskcontents;
        if (!rleData) return;

        const binaryMask = decodeRLE(rleData, canvasDimensions.height, canvasDimensions.width);
        const maskCanvas = createMaskCanvas(binaryMask, canvasDimensions.width, canvasDimensions.height, getClassColor(maskData.class));
        
        fabric.Image.fromURL(maskCanvas.toDataURL(), (img) => {
          img.set({
            left: 0,
            top: 0,
            selectable: false,
            evented: false,
            opacity: maskOpacity, // Use opacity state
            isMask: true,
            className: maskData.class
          });
          canvas.add(img);
        });
      } catch (error) {
        console.error('Error rendering mask:', error);
      }
    });
  }, [segmentationData, currentTimeIndex, currentLayerIndex, visibleMasks, maskOpacity, canvasDimensions]);

  // Helper function to create mask canvas
  const createMaskCanvas = (binaryMask, width, height, color) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const rgb = hexToRgb(color);
    
    for (let i = 0; i < binaryMask.length; i++) {
      const pixelIndex = i * 4;
      if (binaryMask[i] === 1) {
        data[pixelIndex] = rgb.r;
        data[pixelIndex + 1] = rgb.g;
        data[pixelIndex + 2] = rgb.b;
        data[pixelIndex + 3] = 180;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 139, g: 69, b: 19 };
  };

  // Bounding box tool
  const setupBoundingBoxTool = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || selectedTool !== 'boundingbox') return;

    canvas.isDrawingMode = false;
    
    let isDown = false;
    let origX, origY, rect;

    const mouseDown = (o) => {
      if (!isEditMode) return;
      isDown = true;
      const pointer = canvas.getPointer(o.e);
      origX = pointer.x;
      origY = pointer.y;
      
      rect = new fabric.Rect({
        left: origX,
        top: origY,
        originX: 'left',
        originY: 'top',
        width: 0,
        height: 0,
        stroke: getClassColor(selectedClass),
        strokeWidth: 2,
        fill: 'transparent',
        selectable: false,
        evented: false
      });
      canvas.add(rect);
    };

    const mouseMove = (o) => {
      if (!isDown) return;
      const pointer = canvas.getPointer(o.e);
      rect.set({
        width: Math.abs(origX - pointer.x),
        height: Math.abs(origY - pointer.y)
      });
      if (origX > pointer.x) rect.set({ left: pointer.x });
      if (origY > pointer.y) rect.set({ top: pointer.y });
      canvas.renderAll();
    };

    const mouseUp = () => {
      if (!isDown) return;
      isDown = false;
      if (rect && rect.width > 5 && rect.height > 5) {
        rect.set({ className: selectedClass, isBoundingBox: true });
        setDrawingHistory(prev => [...prev, { 
          type: 'boundingbox', 
          class: selectedClass, 
          rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
          fabricObject: rect 
        }]);
      }
    };

    canvas.on('mouse:down', mouseDown);
    canvas.on('mouse:move', mouseMove);
    canvas.on('mouse:up', mouseUp);

    return () => {
      canvas.off('mouse:down', mouseDown);
      canvas.off('mouse:move', mouseMove);
      canvas.off('mouse:up', mouseUp);
    };
  }, [selectedTool, selectedClass, isEditMode]);

  useEffect(() => {
    if (selectedTool === 'boundingbox') {
      return setupBoundingBoxTool();
    }
  }, [setupBoundingBoxTool]);

  // Initialize visible masks
  useEffect(() => {
    const sliceData = getCurrentSliceData();
    if (sliceData?.segmentationMasks) {
      const newVisibleMasks = {};
      sliceData.segmentationMasks.forEach(mask => {
        const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
        if (!(maskId in visibleMasks)) newVisibleMasks[maskId] = true;
      });
      if (Object.keys(newVisibleMasks).length > 0) {
        setVisibleMasks(prev => ({ ...prev, ...newVisibleMasks }));
      }
    }
  }, [currentTimeIndex, currentLayerIndex, segmentationData, visibleMasks]);

  const getCurrentSliceData = useCallback(() => {
    if (!segmentationData?.masks?.[currentTimeIndex]?.[currentLayerIndex]) return null;
    return segmentationData.masks[currentTimeIndex][currentLayerIndex];
  }, [segmentationData, currentTimeIndex, currentLayerIndex]);

  const toggleMaskVisibility = (maskId) => {
    setVisibleMasks(prev => ({ ...prev, [maskId]: !prev[maskId] }));
  };

  const handleMaskClick = (maskData) => {
    if (onMaskSelected) {
      onMaskSelected({ ...maskData, frameIndex: currentTimeIndex, sliceIndex: currentLayerIndex });
    }
  };

  const clearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const objects = canvas.getObjects().filter(obj => !obj.isMask);
    objects.forEach(obj => canvas.remove(obj));
    setDrawingHistory([]);
    canvas.renderAll();
  };

  const undoLastAction = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || drawingHistory.length === 0) return;
    
    const lastAction = drawingHistory[drawingHistory.length - 1];
    if (lastAction.fabricObject) {
      canvas.remove(lastAction.fabricObject);
      canvas.renderAll();
    }
    setDrawingHistory(prev => prev.slice(0, -1));
  };

  // Manual annotation save function
  const handleSaveManualAnnotations = async () => {
    if (!projectId || drawingHistory.length === 0) {
      console.warn('No project ID or drawing history available for saving annotations');
      return;
    }

    try {
      // Convert drawing history to your backend format
      const masksToSave = [];
      
      // Get unique classes from drawing history
      const classesDrawn = [...new Set(drawingHistory.map(action => action.class))];
      
      classesDrawn.forEach(className => {
        // For now, we'll create a placeholder RLE - you may need to implement
        // canvas-to-binary-mask conversion for Fabric.js objects
        const placeholderRLE = 'fabric_drawing_placeholder';
        
        masksToSave.push({
          class: className,
          segmentationmaskcontents: placeholderRLE,
          confidence: 1.0
        });
      });

      // API call to save manual annotations
      const payload = {
        projectId,
        frameIndex: currentTimeIndex,
        sliceIndex: currentLayerIndex,
        segmentationmasks: masksToSave,
        segmentationName: `Manual Edit - F${currentTimeIndex}S${currentLayerIndex}`,
        segmentationDescription: `Manual annotations for frame ${currentTimeIndex}, slice ${currentLayerIndex}`
      };

      const response = await api.post(`/segmentation/save-manual-annotations/${projectId}`, payload);
      
      if (response.data.success) {
        console.log('Manual annotations saved successfully');
        
        // Update local segmentation data
        setSegmentationData(prevData => {
          const updatedData = { ...prevData };
          if (!updatedData.masks[currentTimeIndex]) {
            updatedData.masks[currentTimeIndex] = [];
          }
          if (!updatedData.masks[currentTimeIndex][currentLayerIndex]) {
            updatedData.masks[currentTimeIndex][currentLayerIndex] = { segmentationMasks: [] };
          }
          
          updatedData.masks[currentTimeIndex][currentLayerIndex].segmentationMasks = masksToSave;
          return updatedData;
        });
        
        // Clear drawing history since it's now saved
        setDrawingHistory([]);
        clearCanvas();
        
      } else {
        throw new Error(response.data.message || 'Failed to save annotations');
      }
      
    } catch (error) {
      console.error('Error saving manual annotations:', error);
      alert('Failed to save manual annotations: ' + error.message);
    }
  };

  // Smart segmentation function
  const handleStartManualSegmentation = async () => {
    const boundingBoxes = drawingHistory.filter(action => action.type === 'boundingbox');
    if (boundingBoxes.length === 0) return;

    const lastBoundingBoxAction = boundingBoxes[boundingBoxes.length - 1];
    if (!lastBoundingBoxAction?.rect) return;
    
    const box = lastBoundingBoxAction.rect;
    const bbox = [box.x, box.y, box.x + box.width, box.y + box.height];
    const image_name = currentImage?.name;
    
    if (!image_name || !projectId) return;

    try {
      const response = await api.post(`/segmentation/start-manual-segmentation/${projectId}`, {
        image_name,
        bbox,
        segmentationName: `Manual Seg - ${image_name}`,
        segmentationDescription: `Manual segmentation for ${image_name}`
      });
      
      if (response.data?.segmentations?.[0]?.frames?.[0]?.slices?.[0]?.segmentationmasks) {
        const newMasks = response.data.segmentations[0].frames[0].slices[0].segmentationmasks;
        
        setSegmentationData(prevData => {
          if (!prevData) return prevData;
          const updatedData = { ...prevData };
          if (!updatedData.masks[currentTimeIndex]) updatedData.masks[currentTimeIndex] = [];
          if (!updatedData.masks[currentTimeIndex][currentLayerIndex]) {
            updatedData.masks[currentTimeIndex][currentLayerIndex] = { segmentationMasks: [] };
          }
          
          const existingMasks = updatedData.masks[currentTimeIndex][currentLayerIndex].segmentationMasks;
          const updatedMasks = [...existingMasks];
          
          newMasks.forEach(newMask => {
            const existingIndex = updatedMasks.findIndex(m => m.class === newMask.class);
            if (existingIndex >= 0) {
              updatedMasks[existingIndex] = newMask;
            } else {
              updatedMasks.push(newMask);
            }
          });
          
          updatedData.masks[currentTimeIndex][currentLayerIndex].segmentationMasks = updatedMasks;
          return updatedData;
        });
        
        // Remove the bounding box from canvas
        const canvas = fabricCanvasRef.current;
        if (canvas && lastBoundingBoxAction.fabricObject) {
          canvas.remove(lastBoundingBoxAction.fabricObject);
          canvas.renderAll();
        }
        setDrawingHistory(prev => prev.filter(action => action !== lastBoundingBoxAction));
      }
    } catch (error) {
      console.error('Smart segmentation failed:', error);
    }
  };

  // Download mask functionality
  const downloadMask = useCallback((maskData) => {
    try {
      const { width, height } = canvasDimensions;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d');

      const rleData = maskData.segmentationmaskcontents || maskData.rle;
      const binaryMask = decodeRLE(rleData, height, width);
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      for (let i = 0; i < binaryMask.length; i++) {
        const pixelIndex = i * 4;
        const value = binaryMask[i] * 255;
        data[pixelIndex] = value; 
        data[pixelIndex + 1] = value; 
        data[pixelIndex + 2] = value; 
        data[pixelIndex + 3] = 255;
      }
      
      ctx.putImageData(imageData, 0, 0);
      tempCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mask_${maskData.class}_f${currentTimeIndex}_s${currentLayerIndex}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error downloading mask:', error);
    }
  }, [canvasDimensions, currentTimeIndex, currentLayerIndex]);

  const sliceData = getCurrentSliceData();
  const availableMasks = sliceData?.segmentationMasks || [];

  // Calculate mask statistics
  const maskStats = React.useMemo(() => availableMasks.map(mask => {
    try {
      const { width, height } = canvasDimensions;
      const rleData = mask.segmentationmaskcontents || mask.rle;
      const binaryMask = decodeRLE(rleData, height, width);
      const pixelCount = binaryMask.reduce((sum, pixel) => sum + pixel, 0);
      const area = pixelCount * 0.25;
      return { ...mask, pixelCount, area };
    } catch (error) {
      console.error('Error calculating stats for mask:', mask.class, error);
      return { ...mask, pixelCount: 0, area: 0 };
    }
  }), [availableMasks, canvasDimensions]);

  return (
    <div className="bg-gray-900 border border-red-900/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-red-900/20 p-4 border-b border-red-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-red-400" />
            <span className="text-red-100 font-medium">CARDIAC SEGMENTATION</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-red-300 text-xs">
              F{currentTimeIndex + 1} • S{currentLayerIndex + 1} • {availableMasks.length} MASKS
              {isLoadingImages && <span className="ml-2 animate-pulse">• LOADING</span>}
            </div>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`p-2 rounded ${isEditMode ? 'bg-amber-600 text-black' : 'bg-gray-700 text-red-100'} hover:opacity-80`}
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      

      {/* Main Content Area - LARGER */}
      <div className="flex flex-col">
        {/* Canvas Display Area - EXPANDED */}
        <div className="flex-1 p-4">
          <div className="flex gap-4 h-[600px]"> {/* Fixed height for larger display */}
            {/* AI Canvas */}
            <div className={`${isEditMode ? 'flex-1' : 'w-full'} relative bg-black rounded-lg overflow-hidden border border-red-900/30`}>
              <div className="absolute top-2 left-2 z-10 bg-black/70 text-red-200 px-2 py-1 rounded text-xs">
                {isEditMode ? 'AI ORIGINAL' : 'SEGMENTATION VIEW'}
              </div>
              <canvas ref={aiCanvasRef} className="w-full h-full object-contain" />
              <div className="absolute bottom-2 right-2 bg-black/70 text-red-200 text-xs px-2 py-1 rounded">
                {currentImage?.name}
              </div>
            </div>

            {/* Manual Canvas - Only in Edit Mode */}
            {isEditMode && (
              <div className="flex-1 relative bg-black rounded-lg overflow-hidden border border-amber-600/50">
                <div className="absolute top-2 left-2 z-10 bg-black/70 text-amber-200 px-2 py-1 rounded text-xs">
                  MANUAL EDIT
                </div>
                <canvas ref={manualCanvasRef} className="w-full h-full object-contain" />
                
                {/* Edit Controls Overlay */}
                <div className="absolute top-2 right-2 z-10 flex space-x-2">
                  <button onClick={undoLastAction} className="bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded" title="Undo">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button onClick={clearCanvas} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded" title="Clear">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Controls Panel */}
        <div className="bg-gray-800/30 border-t border-red-900/20 p-4">
          <div className="flex gap-6">
            {/* Edit Tools - LEFT SIDE */}
            {isEditMode && (
              <div className="w-80 space-y-4">
                <div className="text-amber-300 text-sm font-medium mb-3">EDIT CONTROLS</div>
                
                {/* Class Selection */}
                <div>
                  <label className="text-red-200 text-xs mb-2 block">ANNOTATION CLASS</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['MYO', 'LVC', 'RV'].map(className => (
                      <button
                        key={className}
                        onClick={() => setSelectedClass(className)}
                        className={`p-2 rounded text-xs font-medium transition-all ${
                          selectedClass === className ? 'bg-red-600 text-white' : 'bg-gray-700 text-red-200 hover:bg-gray-600'
                        }`}
                      >
                        <div className="w-3 h-3 rounded mx-auto mb-1" style={{ backgroundColor: getClassColor(className) }} />
                        {className}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tool Selection */}
                <div>
                  <label className="text-red-200 text-xs mb-2 block">DRAWING TOOL</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { value: 'brush', label: 'Brush' },
                      { value: 'eraser', label: 'Eraser' },
                      { value: 'boundingbox', label: 'BBox' }
                    ].map(tool => (
                      <button
                        key={tool.value}
                        onClick={() => setSelectedTool(tool.value)}
                        className={`p-2 rounded text-xs transition-all ${
                          selectedTool === tool.value ? 'bg-amber-600 text-black font-medium' : 'bg-gray-700 text-red-200 hover:bg-gray-600'
                        }`}
                      >
                        {tool.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brush Size */}
                {(selectedTool === 'brush' || selectedTool === 'eraser') && (
                  <div>
                    <label className="text-red-200 text-xs mb-2 block">SIZE: {brushSize}px</label>
                    <input
                      type="range"
                      min="2"
                      max="50"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSaveManualAnnotations}
                    disabled={drawingHistory.length === 0}
                    className="flex items-center justify-center gap-2 p-3 bg-green-700 hover:bg-green-800 text-white rounded disabled:opacity-50 text-xs"
                  >
                    <Save className="w-3 h-3" />
                    SAVE
                  </button>

                  <button
                    onClick={handleStartManualSegmentation}
                    disabled={!drawingHistory.some(action => action.type === 'boundingbox')}
                    className="flex items-center justify-center gap-2 p-3 bg-purple-700 hover:bg-purple-800 text-white rounded disabled:opacity-50 text-xs"
                  >
                    <Brain className="w-3 h-3" />
                    AI SMART
                  </button>
                </div>
              </div>
            )}

            {/* Mask List - RIGHT SIDE */}
            <div className="flex-1">
              <div className="text-red-300 text-sm font-medium mb-3">
                {isEditMode ? 'AI MASKS (REFERENCE)' : 'ANATOMICAL STRUCTURES'}
              </div>
              
              {/* Opacity Control for non-edit mode */}
              {!isEditMode && (
                <div className="mb-4">
                  <label className="text-red-200 text-xs mb-2 block">OVERLAY OPACITY</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={maskOpacity}
                    onChange={(e) => setMaskOpacity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-red-300 text-xs mt-1">{Math.round(maskOpacity * 100)}%</div>
                </div>
              )}

              {/* Mask List */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {availableMasks.map((mask, index) => {
                  const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
                  const isVisible = visibleMasks[maskId] !== false;
                  const isSelected = selectedMask && selectedMask.class === mask.class;
                  
                  return (
                    <div
                      key={maskId}
                      className={`p-3 border rounded cursor-pointer transition-all ${
                        isSelected ? 'border-red-400 bg-red-400/10' : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                      }`}
                      onClick={() => handleMaskClick(mask)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: getClassColor(mask.class) }} />
                          <span className="text-red-100 font-medium text-sm">{mask.class}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMaskVisibility(maskId);
                          }}
                          className={`p-1 rounded ${isVisible ? 'text-red-300' : 'text-gray-500'}`}
                        >
                          {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ====== MAIN COMPONENT ======
const AdvancedMedicalUI = () => {
  // State management
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Navigation state
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [currentLayerIndex, setCurrentLayerIndex] = useState(0);
  const [maxTimeIndex, setMaxTimeIndex] = useState(0);
  const [maxLayerIndex, setMaxLayerIndex] = useState(0);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);
  
  // Segmentation data
  const [segmentationData, setSegmentationData] = useState(null);
  const [selectedMask, setSelectedMask] = useState(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 512, height: 512 });

  // Mask upload states
  const [uploadingMasks, setUploadingMasks] = useState(false);
  const [maskUploadResults, setMaskUploadResults] = useState([]);

  // Fetch project dimensions
  useEffect(() => {
    const fetchDimensions = async () => {
      if (!projectId) return;
      
      try {
        const dimensions = await realAPI.getProjectDimensions(projectId);
        setCanvasDimensions(dimensions);
      } catch (error) {
        console.error('Error fetching dimensions:', error);
      }
    };
    
    fetchDimensions();
  }, [projectId]);

  // Process segmentation data
  const processSegmentationData = useCallback((data) => {
    console.log('=== PROCESSING SEGMENTATION DATA ===');
    
    if (!data?.segmentations?.[0]) {
      console.error('No segmentation data received');
      return;
    }
    
    const segDoc = data.segmentations[0];
    const transformedData = {
      masks: [],
      segments: [],
      name: segDoc.name || 'AI Segmentation Results',
      description: segDoc.description || 'Automated cardiac segmentation'
    };

    let maxFrame = -1;
    let maxSlice = -1;
    const uniqueClasses = new Set();
    let totalMasks = 0;
    let masksWithRLE = 0;

    // Process frames and slices
    segDoc.frames.forEach((frame) => {
      const frameIndex = frame.frameindex;
      maxFrame = Math.max(maxFrame, frameIndex);
      
      if (!transformedData.masks[frameIndex]) {
        transformedData.masks[frameIndex] = [];
      }

      frame.slices.forEach((slice) => {
        const sliceIndex = slice.sliceindex;
        maxSlice = Math.max(maxSlice, sliceIndex);
        
        slice.segmentationmasks?.forEach(mask => {
          if (mask.class) uniqueClasses.add(mask.class);
          totalMasks++;
          if (mask.segmentationmaskcontents) masksWithRLE++;
        });

        const transformedSegmentationMasks = (slice.segmentationmasks || []).map(mask => ({
          class: mask.class,
          segmentationmaskcontents: mask.segmentationmaskcontents,
          rle: mask.segmentationmaskcontents,
          confidence: mask.confidence || 1.0
        }));

        transformedData.masks[frameIndex][sliceIndex] = {
          segmentationMasks: transformedSegmentationMasks,
          frameIndex,
          sliceIndex
        };
      });
    });

    console.log(`Frames: ${maxFrame + 1}, Slices: ${maxSlice + 1}`);
    console.log(`Total masks: ${totalMasks}, With RLE: ${masksWithRLE}`);
    console.log(`Unique classes: ${Array.from(uniqueClasses).join(', ')}`);

    if (masksWithRLE === 0) {
      console.error('No masks with RLE data found!');
      setErrorMessage('No segmentation mask data found in results');
      return;
    }

    // Create segments
    transformedData.segments = Array.from(uniqueClasses).map(className => ({
      id: className,
      name: className,
      color: getClassColor(className),
      class: className
    }));

    setSegmentationData(transformedData);
    setMaxTimeIndex(Math.max(0, maxFrame));
    setMaxLayerIndex(Math.max(0, maxSlice));
    
    if (currentTimeIndex > maxFrame) setCurrentTimeIndex(0);
    if (currentLayerIndex > maxSlice) setCurrentLayerIndex(0);
    
    setProcessingComplete(true);
  }, [currentTimeIndex, currentLayerIndex]);

  // Start status polling
  const startStatusPolling = (projectId, jobUuid) => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }

    const pollInterval = setInterval(async () => {
      try {
        const resultsResponse = await realAPI.getResults(projectId);
        
        if (resultsResponse.data && resultsResponse.data.segmentations && 
            resultsResponse.data.segmentations.length > 0) {
          
          const hasActualMasks = resultsResponse.data.segmentations.some(seg => 
            seg.frames && seg.frames.some(frame => 
              frame.slices && frame.slices.some(slice => 
                slice.segmentationmasks && slice.segmentationmasks.length > 0 &&
                slice.segmentationmasks.some(mask => mask.segmentationmaskcontents)
              )
            )
          );

          if (hasActualMasks) {
            clearInterval(pollInterval);
            setStatusCheckInterval(null);
            
            processSegmentationData(resultsResponse.data);
            setUploadStatus('success');
            setIsProcessing(false);
            return;
          }
        }
      } catch (error) {
        // Continue polling
      }
    }, 10000);

    setStatusCheckInterval(pollInterval);

    setTimeout(() => {
      if (pollInterval) {
        clearInterval(pollInterval);
        setStatusCheckInterval(null);
      }
    }, 600000);
  };

  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  // Handle file upload
  const handleFilesSelected = async (selectedFiles, status, message) => {
    if (status === 'error') {
      setUploadStatus('error');
      setErrorMessage(message);
      return;
    }

    setFiles(selectedFiles);
    setUploadStatus('uploading');
    const fileName = selectedFiles[0]?.name || '';
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    try {
      // Upload project
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('files', file));
      
      await realAPI.uploadProject(formData);
      
      // Wait for database update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get project ID
      const newProjectId = await realAPI.fetchMostRecentProject(fileName);
      setProjectId(newProjectId);

      setUploadStatus('processing');
      setIsProcessing(true);

      // Start segmentation
      const segResponse = await realAPI.startSegmentation(newProjectId);
      setJobId(segResponse.data.uuid);
      
      // Start polling for results
      startStatusPolling(newProjectId, segResponse.data.uuid);
      
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error.message);
      setIsProcessing(false);
    }
  };

  // Navigation handlers
  const handleTimeChange = (e) => {
    setCurrentTimeIndex(parseInt(e.target.value));
  };

  const handleLayerChange = (e) => {
    setCurrentLayerIndex(parseInt(e.target.value));
  };

  // Save handler
  const handleSave = async () => {
    if (!projectId) {
      setErrorMessage('No active project to save.');
      return;
    }
    
    try {
      await realAPI.saveProject(projectId);
      console.log('Project saved successfully');
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  // Export handler
  const handleExport = async () => {
    if (!projectId) {
      setErrorMessage('No active project to export.');
      return;
    }

    try {
      await realAPI.exportProject(projectId);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  // Mask selection handler
  const handleMaskSelected = useCallback((maskData) => {
    setSelectedMask(maskData);
  }, []);

  // Manual annotation save handler
  const handleSaveManualAnnotations = (annotationData) => {
    console.log('Saving manual annotations:', annotationData);
    // Implement manual annotation saving logic here
  };

  // Enhanced mask upload function
  const handleUploadCurrentMasks = async () => {
    if (!projectId || !segmentationData) {
      alert('No active project or segmentation data available.');
      return;
    }
    setUploadingMasks(true);

    try {
      const results = await processAndUploadMasks(
        segmentationData,
        currentTimeIndex,
        currentLayerIndex,
        { projectId, api }
      );

      setMaskUploadResults(prev => [...prev, ...results]);
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      alert(`Uploaded ${successCount}/${totalCount} masks successfully`);

    } catch (error) {
      alert('Failed to upload masks: ' + error.message);
    } finally {
      setUploadingMasks(false);
    }
  };

  // Batch upload of all masks
  const handleUploadAllMasks = async () => {
    if (!projectId || !segmentationData) {
      alert('No active project or segmentation data available.');
      return;
    }

    const confirmUpload = window.confirm(
      'This will upload all decoded masks to S3. This may take several minutes. Continue?'
    );
    
    if (!confirmUpload) return;

    setUploadingMasks(true);

    try {
      const allResults = await batchUploadAllMasks(segmentationData, projectId, api);
      
      // Flatten results for display
      const flatResults = allResults.flatMap(frameResult => 
        frameResult.results ? frameResult.results.map(r => ({
          ...r,
          frameIndex: frameResult.frameIndex,
          sliceIndex: frameResult.sliceIndex
        })) : []
      );

      setMaskUploadResults(flatResults);
      
      const successCount = flatResults.filter(r => r.success).length;
      const totalCount = flatResults.length;
      
      alert(`Batch upload completed: ${successCount}/${totalCount} masks uploaded successfully`);

    } catch (error) {
      alert('Batch upload failed: ' + error.message);
    } finally {
      setUploadingMasks(false);
    }
  };

  // Check for results manually
  const checkForResults = async () => {
    if (!projectId) {
      alert('No active project to check.');
      return;
    }

    setIsProcessing(true);

    try {   
      const response = await realAPI.getResults(projectId);
      processSegmentationData(response.data);
      setUploadStatus('success');
      setIsProcessing(false);
      
      const maskCount = response.data.segmentations?.[0]?.frames?.reduce((total, frame) => 
        total + frame.slices?.reduce((sliceTotal, slice) => 
          sliceTotal + (slice.segmentationmasks?.length || 0), 0) || 0, 0) || 0;
      
      alert(`🎉 Segmentation Complete!\n\nFound ${maskCount} masks ready for visualization.`);
      
    } catch (error) {
      alert('Error checking for results: ' + error.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Medical Header */}
      <ProfessionalMedicalHeader 
        patientId={projectId}  // ✅ Use projectId which is defined in your state
        studyDate={new Date().toLocaleDateString()}
        isProcessing={isProcessing}
        userName="Dr. Smith"
      />

      <div className="p-6">
        {!processingComplete ? (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Upload Section */}
            <EnhancedMedicalFileUpload
              onFilesSelected={handleFilesSelected}
              uploadStatus={uploadStatus}
              uploadProgress={uploadProgress}
              errorMessage={errorMessage}
            />

            {/* Processing Status */}
            {uploadStatus === 'processing' && (
              <div className="bg-slate-800 border border-amber-400/30 rounded-lg p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-amber-400/20 rounded-lg flex items-center justify-center">
                      <Cpu className="w-6 h-6 text-amber-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-amber-400 font-medium">AI PROCESSING IN PROGRESS</div>
                    <div className="text-slate-400 text-sm">Neural network analysis • GPU acceleration enabled</div>
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="w-32 bg-slate-700 rounded-full h-2">
                        <div className="bg-amber-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                      </div>
                      <span className="text-amber-400 text-xs">Processing...</span>
                    </div>
                  </div>
                  
                  {/* Check Results Button */}
                  <div className="flex-shrink-0">
                    <button
                      onClick={checkForResults}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-top-transparent"></div>
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <Activity className="w-4 h-4" />
                          <span>Check Results</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {jobId && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                    <div className="text-amber-400 text-xs">
                      Job ID: {jobId} • Auto-checking every 10 seconds
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Main Analysis Interface */
          <div className="grid grid-cols-12 gap-6">
            {/* Control Panel */}
            <div className="col-span-3">
              <MedicalControlPanel
                currentTimeIndex={currentTimeIndex}
                maxTimeIndex={maxTimeIndex}
                currentLayerIndex={currentLayerIndex}
                maxLayerIndex={maxLayerIndex}
                onTimeChange={handleTimeChange}
                onLayerChange={handleLayerChange}
                onSave={handleSave}
                onExport={handleExport}
                projectId={projectId}
                processingComplete={processingComplete}
                handleUploadCurrentMasks={handleUploadCurrentMasks}
                handleUploadAllMasks={handleUploadAllMasks}
                uploadingMasks={uploadingMasks}
                segmentationData={segmentationData}
              />
            </div>

            {/* Main Display */}
            <div className="col-span-9">
              <MedicalSegmentationDisplay
                segmentationData={segmentationData}
                currentTimeIndex={currentTimeIndex}
                currentLayerIndex={currentLayerIndex}
                onMaskSelected={handleMaskSelected}
                selectedMask={selectedMask}
                projectId={projectId}
                canvasDimensions={canvasDimensions}
                onSaveManualAnnotations={handleSaveManualAnnotations}
                setSegmentationData={setSegmentationData}
                // Add these missing props:
                maxTimeIndex={maxTimeIndex}
                maxLayerIndex={maxLayerIndex}
                onTimeChange={handleTimeChange}
                onLayerChange={handleLayerChange}
              />
            </div>
          </div>
        )}

        {/* Upload Results Summary */}
        {maskUploadResults.length > 0 && (
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-lg font-medium text-blue-400 mb-3">
              Upload Results Summary
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {maskUploadResults.slice(-10).map((result, index) => (
                <div 
                  key={index} 
                  className={`p-2 rounded ${
                    result.success 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {result.success ? '✓' : '✗'} {result.className} 
                  {result.frameIndex !== undefined && ` (F${result.frameIndex}/S${result.sliceIndex})`}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-cyan-400/30 p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  processingComplete ? 'bg-green-400' : isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'
                }`} />
                <span className="text-sm">
                  {processingComplete ? 'Analysis Complete' : isProcessing ? 'Processing' : 'Ready'}
                </span>
              </div>
              
              {processingComplete && (
                <>
                  <div className="text-slate-400 text-sm">
                    Project: {projectId}
                  </div>
                  <div className="text-slate-400 text-sm">
                    Structures: {segmentationData?.segments?.length || 0}
                  </div>
                </>
              )}

              {uploadingMasks && (
                <div className="text-cyan-400 text-sm animate-pulse">
                  Uploading masks...
                </div>
              )}
            </div>
            
            <div className="text-slate-400 text-sm">
              Medical Imaging Workstation v2.1 • {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errorMessage && (
          <div className="fixed bottom-20 right-6 max-w-md bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-red-400 font-medium">System Alert</div>
                <div className="text-red-300 text-sm mt-1">{errorMessage}</div>
              </div>
              <button
                onClick={() => setErrorMessage('')}
                className="text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .medical-slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #00D2FF;
          border: 2px solid #0F172A;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 210, 255, 0.5);
          transition: all 0.2s ease;
        }
        
        .medical-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(0, 210, 255, 0.7);
        }
        
        .medical-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #00D2FF;
          border: 2px solid #0F172A;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 210, 255, 0.5);
        }
      `}</style>
    </div>
  );
};

export default AdvancedMedicalUI;



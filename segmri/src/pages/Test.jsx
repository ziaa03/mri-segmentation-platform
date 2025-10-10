import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Heart, User, Database, AlertTriangle, Cpu, Activity, Shield,
  Stethoscope, Award, Clock, Wifi, Monitor, Brain
} from 'lucide-react';

// Import your existing API utilities (keep all original functionality)
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

import { useLocation } from 'react-router-dom';

// Import your redesigned components (removed Sidebar import)
import MedicalFileUpload from './MedicalFileUpload';
import MedicalControlPanel from './MedicalControlPanel';
import MedicalSegmentationDisplay from '../components/MedicalSegmentationDisplay';

// ====== KEEP ALL ORIGINAL API FUNCTIONS ======
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

// ====== KEEP ALL ORIGINAL REAL API OBJECT ======
const realAPI = {
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

// ====== MAIN PROFESSIONAL MEDICAL COMPONENT ======
const AdvancedMedicalUI = () => {
  // Keep all original state management
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

  const location = useLocation();
  const [isSaved, setIsSaved] = useState(false);

  const [extractedImages, setExtractedImages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [availableFrames, setAvailableFrames] = useState([]);
  const [availableSlices, setAvailableSlices] = useState([]);

  // States for manual controls
  const [manualTimeIndex, setManualTimeIndex] = useState(0);
  const [manualLayerIndex, setManualLayerIndex] = useState(0);
  const [isManualPlaying, setIsManualPlaying] = useState(false);
  const [manualPlaybackSpeed, setManualPlaybackSpeed] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);

  // 2. DECLARE processSegmentationData BEFORE any function that uses it
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

    const getClassColor = (className) => {
      const colors = {
        'MYO': '#3A4454',
        'LVC': '#5B7B9A', 
        'RV': '#FDBA74'
      };
      return colors[className] || '#8B5CF6';
    };

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

  // 3. NOW declare checkForResultsById AFTER processSegmentationData
  const checkForResultsById = useCallback(async (id) => {
    if (!id) return;
    setIsProcessing(true);
    try {
      const response = await realAPI.getResults(id);
      processSegmentationData(response.data);
      setUploadStatus('success');
      setIsProcessing(false);
      setProcessingComplete(true);
    } catch (err) {
      setIsProcessing(false);
      setUploadStatus('error');
      setErrorMessage('Failed to fetch segmentation results.');
    }
  }, [processSegmentationData]); // Now this dependency exists

  // Load extracted images when projectId changes - Updated to use new utilities
    useEffect(() => {
      const loadExtractedImages = async () => {
        if (!projectId) { 
          console.log('No projectId, skipping image load'); 
          return; 
        }
        
        setIsLoadingImages(true); 
        setImageError(null);
        
        try {
          // Use the utility functions
          const presignedUrl = await fetchPresignedUrl(projectId);
          const extractedTarFiles = await fetchAndExtractTarFile(presignedUrl);
          const processedImages = processExtractedImages(extractedTarFiles);
          
          setExtractedImages(processedImages);
          
          if (processedImages.length > 0) {
            const { frames, slices } = getAvailableFramesAndSlices(processedImages);
            setAvailableFrames(frames); 
            setAvailableSlices(slices);
            
            // Find initial image
            const initialImage = findClosestImage(processedImages, frames[0] ?? 0, slices[0] ?? 0);
            if (initialImage) setCurrentImage(initialImage);
          }
        } catch (error) {
          console.error('⌘ Error loading extracted images:', error);
          setImageError(error.message);
        } finally {
          setIsLoadingImages(false);
        }
      };
      
      loadExtractedImages();
      
      // Cleanup function using the utility
      return () => {
        cleanupImageUrls(extractedImages);
      };
    }, [projectId]);
  
    // Update current image when time/layer indices change - Updated to use new utilities
    useEffect(() => {
      if (extractedImages.length === 0) return;
      
      const targetImage = findClosestImage(extractedImages, currentTimeIndex, currentLayerIndex);
      setCurrentImage(targetImage);
    }, [extractedImages, currentTimeIndex, currentLayerIndex]);

  // Add browser unload warning:
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (processingComplete && !isSaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [processingComplete, isSaved]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlProjectId = params.get("projectId");
    if (urlProjectId) {
      setProjectId(urlProjectId);
      setUploadStatus('processing');
      setIsProcessing(true);
      checkForResultsById(urlProjectId);
    }
  }, [location.search, checkForResultsById]);

  // Keep all original useEffects and functions
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

  // Keep original status polling function
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

  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  // Keep original file upload handler
  const handleFilesSelected = async (selectedFiles, status, message) => {
    if (status === 'error') {
      setUploadStatus('error');
      setErrorMessage(message);
      return;
    }

    setFiles(selectedFiles);
    setUploadStatus('uploading');
    const fileName = selectedFiles[0]?.name || '';
    
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('files', file));
      
      await realAPI.uploadProject(formData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newProjectId = await realAPI.fetchMostRecentProject(fileName);
      setProjectId(newProjectId);

      setUploadStatus('processing');
      setIsProcessing(true);

      const segResponse = await realAPI.startSegmentation(newProjectId);
      setJobId(segResponse.data.uuid);
      
      startStatusPolling(newProjectId, segResponse.data.uuid);
      
    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error.message);
      setIsProcessing(false);
    }
  };

  // Keep all original navigation and action handlers
  const handleTimeChange = (e) => {
    setCurrentTimeIndex(parseInt(e.target.value));
  };

  const handleLayerChange = (e) => {
    setCurrentLayerIndex(parseInt(e.target.value));
  };

  // Handlers for manual controls
  const handleManualTimeChange = (e) => {
    setManualTimeIndex(parseInt(e.target.value));
  };

  const handleManualLayerChange = (e) => {
    setManualLayerIndex(parseInt(e.target.value));
  };

  const handleEditModeToggle = (editMode) => {
    setIsEditMode(editMode);
  };

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

  const handleMaskSelected = useCallback((maskData) => {
    setSelectedMask(maskData);
  }, []);

  const handleSaveManualAnnotations = (annotationData) => {
    console.log('Saving manual annotations:', annotationData);
  };

  // Keep original mask upload functions
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
      
      alert(`Segmentation Complete! Found ${maskCount} masks ready for visualization.`);
      
    } catch (error) {
      alert('Error checking for results: ' + error.message);
      setIsProcessing(false);
    }
  };

return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F2E6] via-white to-[#F9EDD4]">
      {/* Main Content Area - Removed sidebar and flex layout */}
      <div className="max-w-8xl mx-auto">
        {!processingComplete ? (
          <div className="space-y-8">
            {/* Enhanced Upload Section */}
            <div className="max-w-4xl mx-auto p-8">
              <MedicalFileUpload
                onFilesSelected={handleFilesSelected}
                uploadStatus={uploadStatus}
                uploadProgress={uploadProgress}
                errorMessage={errorMessage}
              />
            </div>

            {/* Enhanced Processing Status */}
            {uploadStatus === 'processing' && (
              <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10">
                  <div className="flex items-center space-x-8">
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 bg-gradient-to-br from-[#5B7B9A]/10 to-[#3A4454]/10 rounded-3xl flex items-center justify-center relative">
                        <Cpu className="w-12 h-12 text-[#5B7B9A] animate-pulse" />
                        <div className="absolute inset-0 border-3 border-[#5B7B9A]/20 rounded-3xl animate-spin"></div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[#3A4454] text-3xl font-light mb-4">Neural Network Processing</div>
                      <div className="text-[#3A4454]/70 mb-8 text-xl leading-relaxed">
                        Advanced AI models analyzing cardiac structures using YOLO + MedSAM on GPU infrastructure
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="flex-1 bg-gray-100 rounded-2xl h-6 shadow-inner">
                          <div className="bg-gradient-to-r from-[#5B7B9A] via-[#FDBA74] to-[#3A4454] h-6 rounded-2xl animate-pulse shadow-sm" style={{ width: '65%' }} />
                        </div>
                        <span className="text-[#3A4454]/70 font-semibold text-lg">Processing cardiac structures...</span>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <button 
                        onClick={checkForResults}
                        className="flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-[#3A4454] to-[#5B7B9A] hover:from-[#5B7B9A] hover:to-[#3A4454] text-white rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                      >
                        <Activity className="w-7 h-7" />
                        <span className="font-semibold text-xl">Monitor Progress</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Enhanced Processing Details */}
                  <div className="mt-10 p-8 bg-gradient-to-br from-[#F8F2E6] to-white rounded-2xl border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <Brain className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="font-semibold text-[#3A4454] mb-2 text-lg">Current Stage</div>
                        <div className="text-[#3A4454]/70">Cardiac Structure Detection</div>
                      </div>
                      <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="font-semibold text-[#3A4454] mb-2 text-lg">Processing Time</div>
                        <div className="text-[#3A4454]/70">~45 seconds remaining</div>
                      </div>
                      <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <Database className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="font-semibold text-[#3A4454] mb-2 text-lg">Job ID</div>
                        <div className="text-[#3A4454]/70 text-sm font-mono">{jobId?.slice(-8) || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Main Professional Analysis Interface - without sidebar */
          <div className="space-y-6">

            {/* Main Display */}
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
              currentImage={currentImage}
              extractedImages={extractedImages}
              isLoadingImages={isLoadingImages}
              imageError={imageError}
              maxTimeIndex={maxTimeIndex}         
              maxLayerIndex={maxLayerIndex}
              api={api}

              // PROPS for manual controls
              manualTimeIndex={manualTimeIndex}
              manualLayerIndex={manualLayerIndex}
              onEditModeToggle={handleEditModeToggle}
            />

            {/* Control Panel */}
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
              // PROPS for manual controls
              isEditMode={isEditMode}
              manualTimeIndex={manualTimeIndex}
              manualLayerIndex={manualLayerIndex}
              onManualTimeChange={handleManualTimeChange}
              onManualLayerChange={handleManualLayerChange}
              isManualPlaying={isManualPlaying}
              setIsManualPlaying={setIsManualPlaying}
              manualPlaybackSpeed={manualPlaybackSpeed}
              setManualPlaybackSpeed={setManualPlaybackSpeed}
              api={api}
            />
          </div>
        )}

        {/* Upload Results Summary */}
        {maskUploadResults.length > 0 && (
          <div className="mt-8 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-8 shadow-lg">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
                  <Database className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-3xl font-light text-[#3A4454]">Upload Results Summary</h4>
                  <p className="text-[#3A4454]/70 text-lg">Mask upload operation completed successfully</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {maskUploadResults.slice(-12).map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-5 rounded-2xl border-2 transition-all duration-300 ${
                      result.success 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${
                        result.success ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="font-semibold">
                        {result.className} 
                        {result.frameIndex !== undefined && ` (F${result.frameIndex}/S${result.sliceIndex})`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Professional Error Display */}
        {errorMessage && (
          <div className="fixed bottom-8 right-8 max-w-md bg-white border-l-4 border-red-400 rounded-2xl p-6 shadow-2xl z-50">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <div className="text-[#3A4454] font-semibold text-lg mb-1">System Alert</div>
                <div className="text-[#3A4454]/70 leading-relaxed">{errorMessage}</div>
              </div>
              <button
                onClick={() => setErrorMessage('')}
                className="text-[#3A4454]/40 hover:text-[#3A4454] transition-colors duration-200 text-2xl leading-none p-1"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Professional Styling */}
      <style jsx global>{`
        .medical-slider::-webkit-slider-thumb {
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3A4454 0%, #5B7B9A 100%);
          border: 3px solid white;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(58, 68, 84, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }
        
        .medical-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 6px 16px rgba(58, 68, 84, 0.4), 0 3px 6px rgba(0, 0, 0, 0.15);
          background: linear-gradient(135deg, #5B7B9A 0%, #FDBA74 100%);
        }
        
        .medical-slider::-webkit-slider-thumb:active {
          transform: scale(1.05);
        }
        
        .medical-slider::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3A4454 0%, #5B7B9A 100%);
          border: 3px solid white;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(58, 68, 84, 0.3);
        }
        
        .medical-slider::-moz-range-thumb:hover {
          background: linear-gradient(135deg, #5B7B9A 0%, #FDBA74 100%);
        }

        /* Professional scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #F8F2E6;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #5B7B9A 0%, #3A4454 100%);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #FDBA74 0%, #5B7B9A 100%);
        }

        .animation-delay-150 {
          animation-delay: 150ms;
        }
      `}</style>
    </div>
  );
};

export default AdvancedMedicalUI;
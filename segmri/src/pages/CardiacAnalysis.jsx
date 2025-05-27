import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import VisualizationControls from '../components/VisualizationControls';
import AISegmentationDisplay from '../components/AiSegDisplay';
import Notification from '../components/Notifications';
import api from '../api/AxiosInstance';

import { 
  processAndUploadMasks, 
  batchUploadAllMasks,
  uploadMaskToS3,
  decodeRLE 
} from '../utils/RLE-Decoder';

const CardiacAnalysisPage = () => {
  // File upload states
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Image navigation states
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [currentLayerIndex, setCurrentLayerIndex] = useState(0);
  const [maxTimeIndex, setMaxTimeIndex] = useState(0);
  const [maxLayerIndex, setMaxLayerIndex] = useState(0);
  
  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Segmentation data - updated to match backend structure
  const [segmentationData, setSegmentationData] = useState(null);
  const [selectedMask, setSelectedMask] = useState(null);
  const [segmentItems, setSegmentItems] = useState([]);
  
  // Project data
  const [projectId, setProjectId] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Segmentation Masks
  const [uploadingMasks, setUploadingMasks] = useState(false);
  const [maskUploadResults, setMaskUploadResults] = useState([]);

  const [jobStatus, setJobStatus] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);

  // Fetch the most recent project ID after upload
  const fetchMostRecentProject = async (uploadedFileName) => {
    try {     
      const response = await api.get('/project/get-projects-list', {
        params: {
          // You can add filters here if needed, like name or date range
          // For now, we'll get all projects and find the most recent one
        }
      });

      if (response.data && response.data.projects && Array.isArray(response.data.projects)) {
        const projects = response.data.projects;
        
        if (projects.length === 0) {
          throw new Error('No projects found after upload');
        }

        // Find the most recent project or the one matching the uploaded filename
        let mostRecentProject = null;
        
        if (uploadedFileName) {
          // Try to find project by matching name or looking for the most recent
          mostRecentProject = projects.find(p => 
            p.name === uploadedFileName || 
            p.name.includes(uploadedFileName.replace(/\.[^/.]+$/, '')) // Remove extension
          );
        }
        
        // If no match by name, get the most recent project (assuming they're sorted by date)
        if (!mostRecentProject) {
          mostRecentProject = projects.reduce((latest, current) => {
            const latestDate = new Date(latest.createdAt || latest.updatedAt);
            const currentDate = new Date(current.createdAt || current.updatedAt);
            return currentDate > latestDate ? current : latest;
          });
        }

        const projectId = mostRecentProject.projectId;
        
        if (projectId) {
          return projectId;
        } else {
          throw new Error('Project ID not found in project data');
        }
      } else {
        throw new Error('Invalid response structure from projects list endpoint');
      }
    } catch (err) {
      throw err;
    }
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

  // Handle individual mask upload
  const handleUploadSelectedMask = async (maskData) => {
    if (!projectId) {
      alert('No project ID available.');
      return;
    }

    const rleData = maskData.segmentationmaskcontents || maskData.rle;
    if (!rleData) {
      alert('No RLE data available for this mask.');
      return;
    }

    setUploadingMasks(true);

    try {
      // Decode the RLE data
      const binaryMask = decodeRLE(rleData, 512, 512);
      
      // Upload to S3
      const result = await uploadMaskToS3(binaryMask, 512, 512, {
        projectId,
        frameIndex: currentTimeIndex,
        sliceIndex: currentLayerIndex,
        className: maskData.class,
        format: 'png',
        api
      });

      if (result.success) {
        alert(`Mask uploaded successfully!\nFile: ${result.filename}\nSize: ${result.size} bytes`);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      alert('Failed to upload mask: ' + error.message);
    } finally {
      setUploadingMasks(false);
    }
  };

  // Enhanced segmentation data processing
  const processSegmentationData = useCallback((data) => {
    console.log('=== PROCESSING SEGMENTATION DATA ===');
    console.log('Input data:', data);
    
    if (!data) {
      console.error('No segmentation data received');
      return;
    }

    // Handle different response formats from the backend
    let segmentationResults = null;
    
    if (data.segmentations && Array.isArray(data.segmentations)) {
      segmentationResults = data.segmentations;
      console.log('Using segmentations array format');
    } else if (Array.isArray(data)) {
      segmentationResults = data;
      console.log('Using direct array format');
    } else if (data.frames) {
      segmentationResults = [data];
      console.log('Using direct segmentation document format');
    }

    if (!segmentationResults || segmentationResults.length === 0) {
      console.error('No segmentation results found in data');
      setErrorMessage('No segmentation results found in response');
      return;
    }

    console.log(`Found ${segmentationResults.length} segmentation document(s)`);

    // Take the first (most recent) segmentation result
    const segmentationDocument = segmentationResults[0];

    if (!segmentationDocument || !segmentationDocument.frames) {
      console.error('Invalid segmentation data structure', segmentationDocument);
      setErrorMessage('Invalid segmentation data structure');
      return;
    }

    console.log('Processing segmentation document:', {
      name: segmentationDocument.name,
      frameCount: segmentationDocument.frames.length
    });

    // Transform and validate the data structure
    const transformedData = {
      masks: [],
      segments: [],
      name: segmentationDocument.name || 'AI Segmentation Results',
      description: segmentationDocument.description || 'Automated cardiac segmentation'
    };

    const uniqueClasses = new Set();
    let maxFrameIndex = -1;
    let maxSliceIndex = -1;
    let totalMasks = 0;
    let masksWithRLE = 0;

    // Process frames and slices
    segmentationDocument.frames.forEach((frame, frameIdx) => {
      const frameIndex = frame.frameindex;
      maxFrameIndex = Math.max(maxFrameIndex, frameIndex);
      
      if (!transformedData.masks[frameIndex]) {
        transformedData.masks[frameIndex] = [];
      }

      frame.slices.forEach((slice, sliceIdx) => {
        const sliceIndex = slice.sliceindex;
        maxSliceIndex = Math.max(maxSliceIndex, sliceIndex);
        
        slice.segmentationmasks?.forEach(mask => {
          if (mask.class) uniqueClasses.add(mask.class);
          totalMasks++;
          if (mask.segmentationmaskcontents) {
            masksWithRLE++;
            console.log(`    Mask ${mask.class}: ${mask.segmentationmaskcontents.length} chars`);
          } else {
            console.warn(`    Mask ${mask.class}: NO RLE DATA`);
          }
        });

        const transformedSegmentationMasks = (slice.segmentationmasks || []).map(mask => ({
          class: mask.class,
          segmentationmaskcontents: mask.segmentationmaskcontents,
          rle: mask.segmentationmaskcontents, // Alias for backward compatibility
          confidence: mask.confidence || 1.0
        }));

        // Store slice data
        transformedData.masks[frameIndex][sliceIndex] = {
          segmentationMasks: transformedSegmentationMasks,
          frameIndex: frameIndex,
          sliceIndex: sliceIndex
        };
      });
    });

    console.log('=== PROCESSING SUMMARY ===');
    console.log(`Frames: ${maxFrameIndex + 1}, Slices: ${maxSliceIndex + 1}`);
    console.log(`Total masks: ${totalMasks}, With RLE: ${masksWithRLE}`);
    console.log(`Unique classes: ${Array.from(uniqueClasses).join(', ')}`);

    if (masksWithRLE === 0) {
      console.error('No masks with RLE data found!');
      setErrorMessage('No segmentation mask data found in results');
      return;
    }

    // Create segments array
    const classColors = {
      'RV': '#FF6B6B',    // Red for Right Ventricle
      'LVC': '#4ECDC4',   // Teal for Left Ventricle Cavity  
      'MYO': '#45B7D1',   // Blue for Myocardium
    };

    transformedData.segments = Array.from(uniqueClasses).map((className, index) => ({
      id: className,
      name: className,
      color: classColors[className] || `hsl(${index * 120}, 70%, 50%)`,
      class: className
    }));

    // Set the transformed data
    setSegmentationData(transformedData);
    setMaxTimeIndex(Math.max(0, maxFrameIndex));
    setMaxLayerIndex(Math.max(0, maxSliceIndex));
    
    // Reset navigation if needed
    if (currentTimeIndex > maxFrameIndex) {
      setCurrentTimeIndex(0);
    }
    if (currentLayerIndex > maxSliceIndex) {
      setCurrentLayerIndex(0);
    }
    
    setSegmentItems(transformedData.segments);
    setProcessingComplete(true);

  }, [currentTimeIndex, currentLayerIndex]);

  // Handle file upload and start segmentation
  const handleFilesSelected = async (selectedFiles, status, message) => {
    if (status === 'error') {
      setUploadStatus('error');
      setErrorMessage(message);
      return;
    }

    setUploadStatus('uploading');
    setFiles(selectedFiles);
    const fileName = selectedFiles[0]?.name || '';
    setUploadedFileName(fileName);

    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));

    try {
      const response = await api.put('/project/upload-new-project', formData, {
        withCredentials: true,
      });

      // Check for success
      const isSuccess = response.data.success === true || 
                       response.status === 200 || 
                       (response.data.message && response.data.message.includes('successfully'));
      
      if (isSuccess) {
        
        // Wait a moment for the database to be updated
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fetch the actual project ID using the projects list endpoint
        const projectId = await fetchMostRecentProject(fileName);
        
        if (projectId) {
          setProjectId(projectId);

          setUploadStatus('processing');
          setIsProcessing(true);
          
          // Trigger segmentation after getting the project ID
          await triggerSegmentation(projectId);
        } else {
          throw new Error('Could not obtain project ID after upload');
        }
      } else {
        throw new Error('Upload failed. A project with the same name and content already exists.');
      }
    } catch (err) {
      setUploadStatus('error');
      setErrorMessage(err.message);
    }
  };

  // Trigger Segmentation
  const triggerSegmentation = async (projectId) => {
  
  try {
    const response = await api.post(`/segmentation/start-segmentation/${projectId}`, {
      projectId: projectId
    });

    if (response.data.uuid) {
      setJobId(response.data.uuid);
      setJobStatus('SUBMITTED');
      
      // Start automatic status checking
      startStatusPolling(projectId, response.data.uuid);
      
      setProcessingStatus('segmenting');
      setUploadStatus('processing');
    } else {
      throw new Error('No job UUID received from segmentation start');
    }
  } catch (err) {
    setErrorMessage('Segmentation failed: ' + err.message);
    setUploadStatus('error');
    setIsProcessing(false);
  }
};


// New function to poll job status
const startStatusPolling = (projectId, jobUuid) => {
  // Clear any existing interval
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
  }

  const pollInterval = setInterval(async () => {
    try {
      // First check if results are available
      const resultsResponse = await api.get(`/segmentation/segmentation-results/${projectId}`);
      
      if (resultsResponse.data && resultsResponse.data.segmentations && 
          resultsResponse.data.segmentations.length > 0) {
        
        // Validate that we have actual mask content
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
          setJobStatus('COMPLETED');

          // Show completion notification
          showCompletionNotification();
          
          // Process the results
          processSegmentationData(resultsResponse.data);
          setUploadStatus('success');
          setIsProcessing(false);
          return;
        }
      }
    } catch (error) {
    }
  }, 10000); // Check every 10 seconds

  setStatusCheckInterval(pollInterval);

  // Stop polling after 10 minutes to prevent infinite polling
  setTimeout(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setStatusCheckInterval(null);
    }
  }, 600000);
};

// New function to show completion notification
const showCompletionNotification = () => {
  // You can use a toast library or create a custom notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('🎉 Cardiac Analysis Complete!', {
      body: 'Your AI segmentation results are ready for review.',
      icon: '/favicon.ico'
    });
  }
};

// Don't forget to clear intervals on component unmount
useEffect(() => {
  return () => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }
  };
}, [statusCheckInterval]);


  // Check for results 
  const checkForResults = async () => {
  if (!projectId) {
    alert('No active project to check.');
    return;
  }

  setIsProcessing(true);

  try {   
    const response = await api.get(`/segmentation/segmentation-results/${projectId}`);
    
    if (response.data) {
      console.log('Response data keys:', Object.keys(response.data));
      
      // Check segmentations array
      if (response.data.segmentations) {
        console.log('Segmentations found:', response.data.segmentations.length);
        response.data.segmentations.forEach((seg, i) => {
          console.log(`Segmentation ${i}:`, {
            name: seg.name,
            frameCount: seg.frames?.length || 0,
            firstFrameSlices: seg.frames?.[0]?.slices?.length || 0
          });
          
          // Deep dive into first frame/slice if available
          if (seg.frames?.[0]?.slices?.[0]) {
            const firstSlice = seg.frames[0].slices[0];
            console.log('First slice masks:', firstSlice.segmentationmasks?.length || 0);
            
            if (firstSlice.segmentationmasks?.[0]) {
              const firstMask = firstSlice.segmentationmasks[0];
              console.log('First mask:', {
                class: firstMask.class,
                hasContent: !!firstMask.segmentationmaskcontents,
                contentLength: firstMask.segmentationmaskcontents?.length || 0,
                contentPreview: firstMask.segmentationmaskcontents?.substring(0, 100) + '...'
              });
            }
          }
        });
      }
    }
    
    // More flexible validation
    const hasResults = response.data && (
      (response.data.segmentations && Array.isArray(response.data.segmentations) && response.data.segmentations.length > 0) ||
      (Array.isArray(response.data) && response.data.length > 0) ||
      (response.data.frames && Array.isArray(response.data.frames))
    );
    
    console.log('Has results:', hasResults);
    
    if (hasResults) {
      // More thorough validation for actual mask data
      let hasActualMasks = false;
      let maskCount = 0;
      let rleDataSamples = [];
      
      if (response.data.segmentations) {
        response.data.segmentations.forEach(seg => {
          if (seg.frames) {
            seg.frames.forEach(frame => {
              if (frame.slices) {
                frame.slices.forEach(slice => {
                  if (slice.segmentationmasks) {
                    slice.segmentationmasks.forEach(mask => {
                      maskCount++;
                      if (mask.segmentationmaskcontents) {
                        hasActualMasks = true;
                        if (rleDataSamples.length < 3) {
                          rleDataSamples.push({
                            class: mask.class,
                            contentLength: mask.segmentationmaskcontents.length,
                            preview: mask.segmentationmaskcontents.substring(0, 50)
                          });
                        }
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
      
      console.log('Validation results:', {
        hasActualMasks,
        totalMaskCount: maskCount,
        rleDataSamples
      });
      
      if (hasActualMasks) {
        
        processSegmentationData(response.data);
        setUploadStatus('success');
        setIsProcessing(false);
        
        // Show success message
        alert(`🎉 Segmentation Complete!\n\nFound ${maskCount} masks ready for visualization.`);
        
      } else {
        alert(`Found ${maskCount} mask records but no segmentation content yet.\nProcessing may still be in progress. Please wait a few more minutes.`);
        setIsProcessing(false);
      }
    } else {
      alert('No results found yet. Please ensure:\n1. The segmentation job was submitted successfully\n2. Sufficient time has passed (5-10 minutes)\n3. The project ID is correct');
      setIsProcessing(false);
    }
  } catch (err) {
    let errorMessage = 'Error checking for results: ' + err.message;
    if (err.response?.status === 404) {
      errorMessage += '\n\nThis might mean:\n• Project not found\n• No segmentation job was started\n• Results not yet available';
    } else if (err.response?.status === 500) {
      errorMessage += '\n\nServer error - please try again in a few minutes.';
    }
    
    alert(errorMessage);
    setIsProcessing(false);
  }
};

  // Handle mask selection
  const handleMaskSelected = useCallback((maskData) => {
    setSelectedMask(maskData);
  }, 
  []);

  // Visualization Controls Handlers
  const handleTimeSliderChange = (e) => {
    const newTimeIndex = parseInt(e.target.value);
    setCurrentTimeIndex(newTimeIndex);
  };

  const handleLayerSliderChange = (e) => {
    const newLayerIndex = parseInt(e.target.value);
    setCurrentLayerIndex(newLayerIndex);
  };

  // Reset handler
  const handleReset = () => {
    setFiles([]);
    setUploadStatus(null);
    setUploadProgress(0);
    setErrorMessage('');
    setIsProcessing(false);
    setProcessingComplete(false);
    setSegmentationData(null);
    setCurrentTimeIndex(0);
    setCurrentLayerIndex(0);
    setMaxTimeIndex(0);
    setMaxLayerIndex(0);
    setProjectId(null);
    setSelectedMask(null);
    setSegmentItems([]);
    setUploadedFileName('');
    setMaskUploadResults([]);
  };

  // Save Project Status
const handleSave = async () => {
  if (!projectId) {
    alert('No active project to save.');
    return;
  }

  try {
    // Show loading state
    const response = await api.patch('/project/save-project', {
      projectId: projectId,
      isSaved: true
    });

    // Check if the response indicates success
    if (response.data && response.data.success) {
      alert('Project saved successfully.');
    } else {
      // Handle case where request succeeded but operation failed
      const errorMsg = response.data?.message || 'Unknown error occurred';
      alert(`Failed to save project: ${errorMsg}`);
    }
  } catch (error) {
    // Handle network errors or other exceptions
    let errorMessage = 'Failed to save project.';
    
    if (error.response) {
      // Server responded with error status
      const serverMessage = error.response.data?.message || error.response.statusText;
      errorMessage = `Failed to save project: ${serverMessage}`;
    } else if (error.request) {
      // Network error
      errorMessage = 'Failed to save project: Network error';
    } else {
      // Other error
      errorMessage = `Failed to save project: ${error.message}`;
    }  
    alert(errorMessage);
  }
};

  // Export handler
  const handleExport = async () => {
    if (!projectId) {
      alert('No active project to export.');
      return;
    }

    try {
      const response = await api.get(`/projects/${projectId}/export`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cardiac-analysis-${projectId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Failed to export project.');
    }
  };

  return (
    <div className="py-16 px-8 bg-[#FFFCF6] min-h-screen w-full">
      <div className="mx-auto max-w-[98%]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center text-center mb-12"
        >
          <h2 className="text-4xl font-light text-[#3A4454] mb-6">
            AI-Powered Cardiac Analysis
          </h2>
          <p className="text-xl text-[#3A4454] opacity-80 max-w-3xl">
            Upload your cardiac MRI images for advanced AI segmentation and detailed visualization
          </p>
          {processingComplete && segmentationData && (
            <div className="mt-4 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
              ✓ Analysis complete • {segmentItems.length} anatomical structures detected
            </div>
          )}
        </motion.div>

        {!processingComplete && (
          <FileUpload
            onFilesSelected={handleFilesSelected}
            uploadStatus={uploadStatus}
            uploadProgress={uploadProgress}
            errorMessage={errorMessage}
          />
        )}

        {!processingComplete && uploadStatus === 'processing' && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200"
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-light">AI Processing in Progress</h3>
                  <p className="text-orange-100 mt-1">
                    Your images are being analyzed by our GPU servers
                  </p>
                </div>
                <div className="animate-pulse">
                  <Settings size={32} />
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {processingComplete && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200"
          >

            <div className="p-6">
              <div className="flex gap-6">
                <div className="w-1/3">
                  <VisualizationControls
                    currentTimeIndex={currentTimeIndex}
                    maxTimeIndex={maxTimeIndex}
                    currentLayerIndex={currentLayerIndex}
                    maxLayerIndex={maxLayerIndex}
                    onTimeSliderChange={handleTimeSliderChange}
                    onLayerSliderChange={handleLayerSliderChange}
                    onSave={handleSave}
                    onExport={handleExport}
                    onUploadCurrentMasks={handleUploadCurrentMasks}
                    onUploadAllMasks={handleUploadAllMasks}
                    onCheckResults={checkForResults}
                    uploadingMasks={uploadingMasks}
                    isProcessing={isProcessing}
                    processingComplete={processingComplete}
                  />
                </div>

                <div className="w-full">
                  <AISegmentationDisplay
                    segmentationData={segmentationData}
                    currentTimeIndex={currentTimeIndex}
                    currentLayerIndex={currentLayerIndex}
                    segmentItems={segmentItems}
                    onMaskSelected={handleMaskSelected}
                    selectedMask={selectedMask}
                    onUploadSelectedMask={handleUploadSelectedMask}  
                    projectId={projectId} 
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Upload Results Summary */}
        {maskUploadResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <h4 className="text-lg font-medium text-blue-900 mb-3">
              Upload Results Summary
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {maskUploadResults.slice(-10).map((result, index) => (
                <div 
                  key={index} 
                  className={`p-2 rounded ${
                    result.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {result.success ? '✓' : '✗'} {result.className} 
                  {result.frameIndex !== undefined && ` (F${result.frameIndex}/S${result.sliceIndex})`}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <Notification
          uploadStatus={uploadStatus}
          errorMessage={errorMessage}
          uploadProgress={uploadProgress}
        />
      </div>
    </div>
  );
};

export default CardiacAnalysisPage;
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import VisualizationControls from '../components/VisualizationControls';
import AISegmentationDisplay from '../components/AiSegDisplay';
import EditableSegmentation from '../components/EditableSeg';

import Notification from '../components/Notifications';
import api from '../api/AxiosInstance';

import { 
  processAndUploadMasks, 
  batchUploadAllMasks,
  uploadMaskToS3,
  decodeRLE 
} from '../utils/RLE-Decoder';

// Enhanced debug logger utility
const DebugLogger = {
  isDebugMode: true, // Set this to false in production
  log: function(component, message, data = null) {
    if (!this.isDebugMode) return;
    const formattedMessage = `[DEBUG][${component}] ${message}`;
    if (data) {
      console.log(formattedMessage, data);
    } else {
      console.log(formattedMessage);
    }
  },
  error: function(component, message, error = null) {
    if (!this.isDebugMode) return;
    const formattedMessage = `[ERROR][${component}] ${message}`;
    if (error) {
      console.error(formattedMessage, error);
    } else {
      console.error(formattedMessage);
    }
  },
  warn: function(component, message, data = null) {
    if (!this.isDebugMode) return;
    const formattedMessage = `[WARN][${component}] ${message}`;
    if (data) {
      console.warn(formattedMessage, data);
    } else {
      console.warn(formattedMessage);
    }
  }
};

const CardiacAnalysisPage = () => {
  // File upload states
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [debugMessages, setDebugMessages] = useState([]);
  
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

  // Debug message logging
  const addDebugMessage = useCallback((message) => {
    const timestamp = new Date().toISOString();
    setDebugMessages(prev => [...prev, { timestamp, message }]);
    DebugLogger.log('CardiacAnalysisPage', message);
  }, []);

  // Fetch the most recent project ID after upload
  const fetchMostRecentProject = async (uploadedFileName) => {
    try {
      addDebugMessage(`Fetching most recent project for file: ${uploadedFileName}`);
      
      const response = await api.get('/project/get-projects-list', {
        params: {
          // You can add filters here if needed, like name or date range
          // For now, we'll get all projects and find the most recent one
        }
      });

      DebugLogger.log('CardiacAnalysisPage', 'Projects list response', response.data);

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
          addDebugMessage(`Found project ID: ${projectId} for file: ${uploadedFileName}`);
          return projectId;
        } else {
          throw new Error('Project ID not found in project data');
        }
      } else {
        throw new Error('Invalid response structure from projects list endpoint');
      }
    } catch (err) {
      DebugLogger.error('CardiacAnalysisPage', 'Error fetching most recent project', err);
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
    addDebugMessage(`Starting mask upload for frame ${currentTimeIndex}, slice ${currentLayerIndex}`);

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
      
      addDebugMessage(`Mask upload completed: ${successCount}/${totalCount} successful`);
      alert(`Uploaded ${successCount}/${totalCount} masks successfully`);

    } catch (error) {
      addDebugMessage(`Mask upload failed: ${error.message}`);
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
    addDebugMessage('Starting batch upload of all masks...');

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
      
      addDebugMessage(`Batch upload completed: ${successCount}/${totalCount} masks uploaded`);
      alert(`Batch upload completed: ${successCount}/${totalCount} masks uploaded successfully`);

    } catch (error) {
      addDebugMessage(`Batch upload failed: ${error.message}`);
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
    addDebugMessage(`Uploading selected mask: ${maskData.class}`);

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
        addDebugMessage(`Successfully uploaded mask: ${maskData.class} to ${result.s3Url}`);
        alert(`Mask uploaded successfully!\nFile: ${result.filename}\nSize: ${result.size} bytes`);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      addDebugMessage(`Failed to upload selected mask: ${error.message}`);
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
      
      console.log(`Processing frame ${frameIndex} (${frameIdx + 1}/${segmentationDocument.frames.length})`);
      
      if (!transformedData.masks[frameIndex]) {
        transformedData.masks[frameIndex] = [];
      }

      frame.slices.forEach((slice, sliceIdx) => {
        const sliceIndex = slice.sliceindex;
        maxSliceIndex = Math.max(maxSliceIndex, sliceIndex);

        console.log(`  Processing slice ${sliceIndex} (${sliceIdx + 1}/${frame.slices.length})`);
        console.log(`    Bounding boxes: ${slice.componentboundingboxes?.length || 0}`);
        console.log(`    Segmentation masks: ${slice.segmentationmasks?.length || 0}`);

        // Collect unique classes and validate data
        slice.componentboundingboxes?.forEach(box => {
          if (box.class) uniqueClasses.add(box.class);
        });
        
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

        // Transform data structures
        const transformedBoundingBoxes = (slice.componentboundingboxes || []).map(box => ({
          class: box.class,
          confidence: box.confidence || 0,
          x_min: box.x_min,
          y_min: box.y_min,
          x_max: box.x_max,
          y_max: box.y_max,
          bbox: [box.x_min, box.y_min, box.x_max, box.y_max]
        }));

        const transformedSegmentationMasks = (slice.segmentationmasks || []).map(mask => ({
          class: mask.class,
          segmentationmaskcontents: mask.segmentationmaskcontents,
          rle: mask.segmentationmaskcontents, // Alias for backward compatibility
          confidence: mask.confidence || 1.0
        }));

        // Store slice data
        transformedData.masks[frameIndex][sliceIndex] = {
          boundingBoxes: transformedBoundingBoxes,
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
      'LV': '#4ECDC4',    // Alias for LVC
      'MYO': '#45B7D1',   // Blue for Myocardium
      'LA': '#9C27B0',    // Purple for Left Atrium
      'RA': '#FF5722'     // Deep orange for Right Atrium
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
    
    console.log('✅ Segmentation data processing completed successfully');
    addDebugMessage(`✅ Processing completed: ${uniqueClasses.size} classes, ${masksWithRLE} masks with RLE data`);

  }, [addDebugMessage, currentTimeIndex, currentLayerIndex]);

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
    addDebugMessage(`Starting upload of ${selectedFiles.length} files`);

    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));

    try {
      const response = await api.put('/project/upload-new-project', formData, {
        withCredentials: true,
      });

      DebugLogger.log('CardiacAnalysisPage', 'Upload response', response.data);

      // Check for success in multiple ways since backend might return different formats
      const isSuccess = response.data.success === true || 
                       response.status === 200 || 
                       (response.data.message && response.data.message.includes('successfully'));
      
      if (isSuccess) {
        addDebugMessage('Upload successful, fetching project ID...');
        
        // Wait a moment for the database to be updated
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Fetch the actual project ID using the projects list endpoint
        const projectId = await fetchMostRecentProject(fileName);
        
        if (projectId) {
          setProjectId(projectId);
          addDebugMessage(`Project ID obtained: ${projectId}`);

          setUploadStatus('processing');
          setIsProcessing(true);
          
          // Trigger segmentation after getting the project ID
          await triggerSegmentation(projectId);
        } else {
          throw new Error('Could not obtain project ID after upload');
        }
      } else {
        throw new Error('Upload failed: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      setUploadStatus('error');
      setErrorMessage(err.message);
      DebugLogger.error('CardiacAnalysisPage', 'Upload/Project ID fetch failed', err);
    }
  };

  // Trigger Segmentation
  const triggerSegmentation = async (projectId) => {
  addDebugMessage(`Starting segmentation for project ${projectId}`);
  
  try {
    const response = await api.post(`/segmentation/start-segmentation/${projectId}`, {
      projectId: projectId
    });
    
    DebugLogger.log('CardiacAnalysisPage', 'Segmentation start response', response.data);

    if (response.data.uuid) {
      setJobId(response.data.uuid);
      setJobStatus('SUBMITTED');
      addDebugMessage(`Segmentation job submitted with ID: ${response.data.uuid}`);
      
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
    DebugLogger.error('CardiacAnalysisPage', 'Segmentation failed', err);
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
      addDebugMessage(`Checking status for job: ${jobUuid}`);
      
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
          addDebugMessage('✅ Segmentation job completed successfully!');
          
          // Show completion notification
          showCompletionNotification();
          
          // Process the results
          processSegmentationData(resultsResponse.data);
          setUploadStatus('success');
          setIsProcessing(false);
          return;
        }
      }

      // If no results yet, continue polling
      addDebugMessage('Job still processing...');
      
    } catch (error) {
      addDebugMessage(`Status check error: ${error.message}`);
    }
  }, 10000); // Check every 10 seconds

  setStatusCheckInterval(pollInterval);

  // Stop polling after 10 minutes to prevent infinite polling
  setTimeout(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setStatusCheckInterval(null);
      addDebugMessage('⚠️ Status polling stopped after 10 minutes. Please check manually.');
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
  
  // Also show an alert for immediate feedback
  setTimeout(() => {
    alert('🎉 Segmentation Complete!\n\nYour cardiac analysis results are now available for visualization and download.');
  }, 500);
};

// Enhanced status display component
const StatusDisplay = () => {
  if (!jobStatus) return null;

  const statusConfig = {
    'SUBMITTED': { color: 'blue', message: 'Job submitted to GPU servers...', icon: '⏳' },
    'IN_PROGRESS': { color: 'yellow', message: 'AI processing your images...', icon: '🔄' },
    'COMPLETED': { color: 'green', message: 'Analysis complete!', icon: '✅' },
    'FAILED': { color: 'red', message: 'Processing failed', icon: '❌' }
  };

  const config = statusConfig[jobStatus] || statusConfig['SUBMITTED'];

  return (
    <div className={`bg-${config.color}-50 border border-${config.color}-200 rounded-lg p-4 mb-4`}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">{config.icon}</div>
        <div>
          <div className={`font-medium text-${config.color}-800`}>
            Segmentation Status: {jobStatus}
          </div>
          <div className={`text-sm text-${config.color}-600`}>
            {config.message}
            {jobId && <div className="mt-1 font-mono text-xs">Job ID: {jobId}</div>}
          </div>
        </div>
      </div>
    </div>
  );
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

  addDebugMessage('Manually checking for segmentation results...');
  setIsProcessing(true);

  try {
    console.log('Making request to:', `/segmentation/segmentation-results/${projectId}`);
    
    const response = await api.get(`/segmentation/segmentation-results/${projectId}`);
    
    // Detailed response logging
    console.log('=== SEGMENTATION RESULTS RESPONSE ===');
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    console.log('Response data:', response.data);
    console.log('Response data type:', typeof response.data);
    console.log('Is array:', Array.isArray(response.data));
    
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
        addDebugMessage(`✅ Segmentation results validated! Found ${maskCount} masks with RLE data.`);
        console.log('Processing segmentation data...');
        
        processSegmentationData(response.data);
        setUploadStatus('success');
        setIsProcessing(false);
        
        // Show success message
        alert(`🎉 Segmentation Complete!\n\nFound ${maskCount} masks ready for visualization.`);
        
      } else {
        addDebugMessage(`⚠️ Found ${maskCount} masks but no RLE content. Processing may still be in progress.`);
        console.warn('Results structure exists but no RLE data found');
        alert(`Found ${maskCount} mask records but no segmentation content yet.\nProcessing may still be in progress. Please wait a few more minutes.`);
        setIsProcessing(false);
      }
    } else {
      addDebugMessage('❌ No segmentation results structure found.');
      console.warn('No results found in expected format');
      alert('No results found yet. Please ensure:\n1. The segmentation job was submitted successfully\n2. Sufficient time has passed (5-10 minutes)\n3. The project ID is correct');
      setIsProcessing(false);
    }
  } catch (err) {
    console.error('=== SEGMENTATION RESULTS ERROR ===');
    console.error('Error:', err);
    console.error('Error response:', err.response?.data);
    console.error('Error status:', err.response?.status);
    
    addDebugMessage(`❌ Error checking for results: ${err.message}`);
    
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
    addDebugMessage(`Mask selected: ${maskData.class} at frame ${maskData.frameIndex}, slice ${maskData.sliceIndex}`);
  }, [addDebugMessage]);

  // Visualization Controls Handlers
  const handleTimeSliderChange = (e) => {
    const newTimeIndex = parseInt(e.target.value);
    setCurrentTimeIndex(newTimeIndex);
    addDebugMessage(`Time index changed to: ${newTimeIndex}`);
  };

  const handleLayerSliderChange = (e) => {
    const newLayerIndex = parseInt(e.target.value);
    setCurrentLayerIndex(newLayerIndex);
    addDebugMessage(`Layer index changed to: ${newLayerIndex}`);
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
    setDebugMessages([]);
    setUploadedFileName('');
    setMaskUploadResults([]);
    addDebugMessage('Application reset');
  };

  // Save Project Status
  const handleSave = async () => {
    if (!projectId) {
      alert('No active project to save.');
      return;
    }

    try {
      await api.patch('/project/save-project', {
        projectId: projectId,
        isSaved: true
      });
      alert('Project saved successfully.');
      addDebugMessage('Project saved successfully');
    } catch (error) {
      alert('Failed to save project.');
      DebugLogger.error('CardiacAnalysisPage', 'Save failed', error);
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
      addDebugMessage('Project exported successfully');
    } catch (error) {
      alert('Failed to export project.');
      DebugLogger.error('CardiacAnalysisPage', 'Export failed', error);
    }
  };

  return (
    <div className="py-16 px-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen w-full">
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

            <div className="p-6">
              <div className="flex">
                <div className="w-full">
                  <VisualizationControls
                    currentTimeIndex={0}
                    maxTimeIndex={0}
                    currentLayerIndex={0}
                    maxLayerIndex={0}
                    onTimeSliderChange={() => {}}
                    onLayerSliderChange={() => {}}
                    onSave={() => {}}
                    onExport={() => {}}
                    onUploadCurrentMasks={() => {}}
                    onUploadAllMasks={() => {}}
                    onCheckResults={checkForResults}
                    uploadingMasks={false}
                    isProcessing={isProcessing}
                    processingComplete={processingComplete}
                  />
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
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-light">AI Segmentation Results</h3>
                  <p className="text-blue-100 mt-1">
                    Interactive visualization and analysis tools
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors duration-200 backdrop-blur-sm"
                >
                  New Analysis
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex gap-6">
                <div className="w-1/4">
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

                <div className="w-1/2">
                  <AISegmentationDisplay
                    segmentationData={segmentationData}
                    currentTimeIndex={currentTimeIndex}
                    currentLayerIndex={currentLayerIndex}
                    segmentItems={segmentItems}
                    onMaskSelected={handleMaskSelected}
                    selectedMask={selectedMask}
                    onUploadSelectedMask={onUploadSelectedMask}
                    projectId={yourProjectId} // Required!
                  />
                </div>

                <div className="w-1/4">
                  <EditableSegmentation selectedMask={selectedMask} />
                </div>
              </div>


            </div>
          </motion.div>
        )}

        {/* Enhanced Debug Panel */}
        {DebugLogger.isDebugMode && debugMessages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-8 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-green-300">Debug Console</h4>
              <button
                onClick={() => setDebugMessages([])}
                className="text-gray-400 hover:text-green-400 text-xs"
              >
                Clear
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {debugMessages.slice(-15).map((msg, index) => (
                <div key={index} className="text-xs">
                  <span className="text-gray-500">
                    [{msg.timestamp.split('T')[1].split('.')[0]}]
                  </span>
                  <span className="ml-2">{msg.message}</span>
                </div>
              ))}
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
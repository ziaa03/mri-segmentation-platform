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
    DebugLogger.log('CardiacAnalysisPage', 'Processing segmentation data', data);
    
    if (!data) {
      DebugLogger.error('CardiacAnalysisPage', 'No segmentation data received');
      return;
    }

    // Handle different response formats from the backend
    let segmentationResults = null;
    
    if (data.segmentations && Array.isArray(data.segmentations)) {
      // Response format: { segmentations: [...] }
      segmentationResults = data.segmentations;
    } else if (Array.isArray(data)) {
      // Response format: [...]
      segmentationResults = data;
    } else if (data.frames) {
      // Direct segmentation document
      segmentationResults = [data];
    }

    if (!segmentationResults || segmentationResults.length === 0) {
      DebugLogger.error('CardiacAnalysisPage', 'No segmentation results found in data');
      setErrorMessage('No segmentation results found in response');
      return;
    }

    // Take the first (most recent) segmentation result
    const segmentationDocument = segmentationResults[0];

    if (!segmentationDocument || !segmentationDocument.frames) {
      DebugLogger.error('CardiacAnalysisPage', 'Invalid segmentation data structure', segmentationDocument);
      setErrorMessage('Invalid segmentation data structure');
      return;
    }

    DebugLogger.log('CardiacAnalysisPage', 'Processing segmentation document', segmentationDocument);

    // Transform the backend structure to match what the frontend expects
    const transformedData = {
      masks: [], // Will be populated with transformed frame/slice data
      segments: [], // Will be populated with available classes
      name: segmentationDocument.name || 'AI Segmentation Results',
      description: segmentationDocument.description || 'Automated cardiac segmentation'
    };

    // Extract all unique classes from the segmentation data
    const uniqueClasses = new Set();
    const classColors = {
      'RV': '#FF6B6B',    // Red for Right Ventricle
      'LVC': '#4ECDC4',   // Teal for Left Ventricle Cavity  
      'LV': '#4ECDC4',    // Alias for LVC
      'MYO': '#45B7D1',   // Blue for Myocardium
      'LA': '#9C27B0',    // Purple for Left Atrium
      'RA': '#FF5722'     // Deep orange for Right Atrium
    };

    let maxFrameIndex = -1;
    let maxSliceIndex = -1;

    // Process frames and slices to create masks array structure
    segmentationDocument.frames.forEach(frame => {
      const frameIndex = frame.frameindex;
      maxFrameIndex = Math.max(maxFrameIndex, frameIndex);
      
      if (!transformedData.masks[frameIndex]) {
        transformedData.masks[frameIndex] = [];
      }

      frame.slices.forEach(slice => {
        const sliceIndex = slice.sliceindex;
        maxSliceIndex = Math.max(maxSliceIndex, sliceIndex);

        // Collect unique classes from this slice
        slice.componentboundingboxes?.forEach(box => {
          if (box.class) uniqueClasses.add(box.class);
        });
        slice.segmentationmasks?.forEach(mask => {
          if (mask.class) uniqueClasses.add(mask.class);
        });

        // Transform bounding boxes to match expected format
        const transformedBoundingBoxes = (slice.componentboundingboxes || []).map(box => ({
          class: box.class,
          confidence: box.confidence || 0,
          x_min: box.x_min,
          y_min: box.y_min,
          x_max: box.x_max,
          y_max: box.y_max,
          bbox: [box.x_min, box.y_min, box.x_max, box.y_max] // For compatibility
        }));

        // Transform segmentation masks to match expected format
        const transformedSegmentationMasks = (slice.segmentationmasks || []).map(mask => ({
          class: mask.class,
          segmentationmaskcontents: mask.segmentationmaskcontents, // Keep original field name
          rle: mask.segmentationmaskcontents, // Alias for backward compatibility
          confidence: mask.confidence || 1.0
        }));

        // Store slice data in the masks array
        transformedData.masks[frameIndex][sliceIndex] = {
          boundingBoxes: transformedBoundingBoxes,
          segmentationMasks: transformedSegmentationMasks,
          frameIndex: frameIndex,
          sliceIndex: sliceIndex
        };

        DebugLogger.log('CardiacAnalysisPage', `Processed frame ${frameIndex}, slice ${sliceIndex}`, {
          boundingBoxes: transformedBoundingBoxes.length,
          segmentationMasks: transformedSegmentationMasks.length
        });
      });
    });

    // Create segments array from unique classes
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
    
    // Reset navigation to first frame/slice if current indices are out of bounds
    if (currentTimeIndex > maxFrameIndex) {
      setCurrentTimeIndex(0);
    }
    if (currentLayerIndex > maxSliceIndex) {
      setCurrentLayerIndex(0);
    }
    
    DebugLogger.log('CardiacAnalysisPage', `Set boundaries - Time: 0-${maxFrameIndex}, Layer: 0-${maxSliceIndex}`);

    // Set segment items
    setSegmentItems(transformedData.segments);
    DebugLogger.log('CardiacAnalysisPage', 'Set segment items', transformedData.segments);

    setProcessingComplete(true);
    addDebugMessage(`Segmentation processing completed successfully. Found ${uniqueClasses.size} classes across ${maxFrameIndex + 1} frames and ${maxSliceIndex + 1} slices.`);
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
      DebugLogger.log('CardiacAnalysisPage', `Making POST request to /segmentation/start-segmentation/${projectId}`);
      
      const response = await api.post(`/segmentation/start-segmentation/${projectId}`, {
        projectId: projectId
      });
      
      DebugLogger.log('CardiacAnalysisPage', 'Segmentation start response', response.data);

      // Check for success in multiple ways
      const isSuccess = response.data.success === true || 
                       response.status === 200 || 
                       (response.data.message && response.data.message.includes('successfully')) ||
                       (response.data.message && response.data.message.includes('started'));

      if (isSuccess) {
        addDebugMessage('Segmentation started successfully');
        setProcessingStatus('segmenting');
        setUploadStatus('processing');
        
        // Don't poll immediately - let user manually check for results
        addDebugMessage('Segmentation job submitted. Processing will take several minutes...');
        
      } else {
        DebugLogger.error('CardiacAnalysisPage', 'Segmentation start failed', response.data);
        throw new Error('Segmentation failed to start: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      setErrorMessage('Segmentation failed: ' + err.message);
      setUploadStatus('error');
      setIsProcessing(false);
      DebugLogger.error('CardiacAnalysisPage', 'Segmentation failed', err);
    }
  };

  // Manual check for results (called by user action)
  const checkForResults = async () => {
    if (!projectId) {
      alert('No active project to check.');
      return;
    }

    addDebugMessage('Manually checking for segmentation results...');
    setIsProcessing(true);

    try {
      const response = await api.get(`/segmentation/segmentation-results/${projectId}`);
      DebugLogger.log('CardiacAnalysisPage', 'Manual check response', response.data);
      
      // Check if we have segmentation results
      const hasResults = response.data && (
        (response.data.segmentations && Array.isArray(response.data.segmentations) && response.data.segmentations.length > 0) ||
        (Array.isArray(response.data) && response.data.length > 0) ||
        (response.data.frames && Array.isArray(response.data.frames))
      );
      
      if (hasResults) {
        // Additional validation to ensure we have actual mask data
        const hasActualMasks = response.data.segmentations ? 
          response.data.segmentations.some(seg => 
            seg.frames && seg.frames.some(frame => 
              frame.slices && frame.slices.some(slice => 
                slice.segmentationmasks && slice.segmentationmasks.length > 0
              )
            )
          ) : false;
        
        if (hasActualMasks || (response.data.frames && response.data.frames.length > 0)) {
          addDebugMessage('Segmentation results found and validated!');
          processSegmentationData(response.data);
          setUploadStatus('success');
          setIsProcessing(false);
        } else {
          addDebugMessage('Results found but no actual mask data yet. Processing may still be in progress.');
          alert('Segmentation is still processing. Please wait a few more minutes and try again.');
          setIsProcessing(false);
        }
      } else {
        addDebugMessage('No segmentation results found yet.');
        alert('No results found yet. Segmentation may still be processing. Please wait and try again in a few minutes.');
        setIsProcessing(false);
      }
    } catch (err) {
      addDebugMessage(`Error checking for results: ${err.message}`);
      alert('Error checking for results: ' + err.message);
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
                    onUploadSelectedMask={handleUploadSelectedMask}
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
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import FileUpload from '../components/FileUpload';
import VisualizationControls from '../components/VisualizationControls';
import AISegmentationDisplay from '../components/AiSegDisplay';
import EditableSegmentation from '../components/EditableSeg';
import AnalysisResults from '../components/AnalysisResults';
import Notification from '../components/Notifications';
import api from '../api/AxiosInstance';

import { 
  processAndUploadMasks, 
  batchUploadAllMasks,
  uploadMaskToS3,
  decodeRLE 
} from '../utils/RLE-Decoder';

// Add a debug logger utility
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

  //Segmentation Masks
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

  // Add this function to handle single mask upload
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

// Add this function to handle batch upload of all masks
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

// Add this function to handle individual mask upload (when user selects a specific mask)
const handleUploadSelectedMask = async (maskData) => {
  if (!projectId || !maskData.rle) {
    alert('No project ID or mask data available.');
    return;
  }

  setUploadingMasks(true);
  addDebugMessage(`Uploading selected mask: ${maskData.class}`);

  try {
    // Decode the RLE data
    const binaryMask = decodeRLE(maskData.rle, 512, 512);
    
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

  // Process segmentation data and set boundaries - updated to match backend structure
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
      return;
    }

    // Take the first (most recent) segmentation result
    const segmentationDocument = segmentationResults[0];

    if (!segmentationDocument || !segmentationDocument.frames) {
      DebugLogger.error('CardiacAnalysisPage', 'Invalid segmentation data structure');
      return;
    }

    // Transform the backend structure to match what the frontend expects
    const transformedData = {
      masks: [], // Will be populated with transformed frame/slice data
      segments: [], // Will be populated with available classes
      name: segmentationDocument.name,
      description: segmentationDocument.description
    };

    // Extract all unique classes from the segmentation data
    const uniqueClasses = new Set();
    const classColors = {
      'RV': '#FF6B6B',    // Red for Right Ventricle
      'LVC': '#4ECDC4',   // Teal for Left Ventricle Cavity  
      'MYO': '#45B7D1'    // Blue for Myocardium
    };

    // Process frames and slices to create masks array structure
    segmentationDocument.frames.forEach(frame => {
      if (!transformedData.masks[frame.frameindex]) {
        transformedData.masks[frame.frameindex] = [];
      }

      frame.slices.forEach(slice => {
        // Collect unique classes from this slice
        slice.componentboundingboxes?.forEach(box => {
          if (box.class) uniqueClasses.add(box.class);
        });
        slice.segmentationmasks?.forEach(mask => {
          if (mask.class) uniqueClasses.add(mask.class);
        });

        // Store slice data in the masks array
        transformedData.masks[frame.frameindex][slice.sliceindex] = {
          boundingBoxes: slice.componentboundingboxes || [],
          segmentationMasks: slice.segmentationmasks || [],
          frameIndex: frame.frameindex,
          sliceIndex: slice.sliceindex
        };
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

    // Calculate max indices
    const maxFrameIndex = Math.max(...segmentationDocument.frames.map(f => f.frameindex));
    const maxSliceIndex = Math.max(...segmentationDocument.frames.flatMap(f => 
      f.slices.map(s => s.sliceindex)
    ));

    setMaxTimeIndex(Math.max(0, maxFrameIndex));
    setMaxLayerIndex(Math.max(0, maxSliceIndex));
    
    DebugLogger.log('CardiacAnalysisPage', `Set boundaries - Time: 0-${maxFrameIndex}, Layer: 0-${maxSliceIndex}`);

    // Set segment items
    setSegmentItems(transformedData.segments);
    DebugLogger.log('CardiacAnalysisPage', 'Set segment items', transformedData.segments);

    setProcessingComplete(true);
    addDebugMessage('Segmentation processing completed successfully');
  }, [addDebugMessage]);

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
        
        // Add a delay before fetching results to allow processing time
        addDebugMessage('Waiting for segmentation to complete...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        // Poll for segmentation results
        const segmentationResults = await pollForSegmentationResults(projectId);
        
        if (segmentationResults) {
          processSegmentationData(segmentationResults);
          setUploadStatus('success');
        } else {
          throw new Error('No segmentation results received after polling');
        }
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

  // Poll for segmentation results (since processing might take time)
  const pollForSegmentationResults = async (projectId, maxAttempts = 10, interval = 3000) => {
    addDebugMessage(`Starting to poll for segmentation results (max ${maxAttempts} attempts)`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        addDebugMessage(`Polling attempt ${attempt}/${maxAttempts} for project ${projectId}`);
        
        const response = await api.get(`/segmentation/segmentation-results/${projectId}`);
        DebugLogger.log('CardiacAnalysisPage', `Poll attempt ${attempt} response`, response.data);
        
        // Check if we have segmentation results
        const hasResults = response.data && (
          (response.data.segmentations && Array.isArray(response.data.segmentations) && response.data.segmentations.length > 0) ||
          (Array.isArray(response.data) && response.data.length > 0) ||
          (response.data.frames && Array.isArray(response.data.frames))
        );
        
        if (hasResults) {
          addDebugMessage(`Segmentation results found on attempt ${attempt}`);
          return response.data;
        } else {
          addDebugMessage(`No results yet on attempt ${attempt}, waiting ${interval/1000}s...`);
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, interval));
          }
        }
      } catch (err) {
        DebugLogger.error('CardiacAnalysisPage', `Poll attempt ${attempt} failed`, err);
        if (attempt === maxAttempts) {
          throw err;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    addDebugMessage('Polling completed without finding results');
    return null;
  };

  // Fetch segmentation results from backend (single attempt version)
  const fetchSegmentationResults = async (projectId) => {
    addDebugMessage(`Fetching segmentation results for project ${projectId}`);
    
    try {
      const response = await api.get(`/segmentation/segmentation-results/${projectId}`);
      DebugLogger.log('CardiacAnalysisPage', 'Direct fetch response', response.data);
      
      if (response.data) {
        addDebugMessage('Segmentation results fetched successfully');
        return response.data;
      } else {
        throw new Error('Empty response from segmentation results endpoint');
      }
    } catch (err) {
      setErrorMessage('Failed to fetch segmentation results: ' + err.message);
      DebugLogger.error('CardiacAnalysisPage', 'Error fetching segmentation results', err);
      return null;
    }
  };

  // Handle mask selection
  const handleMaskSelected = useCallback((maskData) => {
    setSelectedMask(maskData);
    addDebugMessage(`Mask selected: ${maskData.id || maskData.name || maskData.class}`);
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
    <div className="py-16 px-8 bg-[#FFFCF6] min-h-screen w-full">
      <div className="mx-auto max-w-[98%]">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center text-center mb-12"
        >
          <h2 className="text-4xl font-light text-[#3A4454] mb-6">Cardiac Analysis</h2>
          <p className="text-xl text-[#3A4454] opacity-80 max-w-3xl">
            Upload your cardiac MRI images for AI-powered segmentation and visualization
          </p>
        </motion.div>

        {!processingComplete && (
          <FileUpload
            onFilesSelected={handleFilesSelected}
            uploadStatus={uploadStatus}
            uploadProgress={uploadProgress}
            errorMessage={errorMessage}
          />
        )}

        {processingComplete && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-light text-[#3A4454]">AI Segmentation Results</h3>
                <button
                  onClick={handleReset}
                  className="flex items-center text-[#5B7B9A] hover:text-[#3A4454] transition-colors duration-200"
                >
                  Upload new file
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex">
                <div className="w-1/4 pr-8">
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
                    uploadingMasks={uploadingMasks}
                  />
                </div>

                <div className="w-1/2 px-4">
                  <AISegmentationDisplay
                    segmentationData={segmentationData}
                    currentTimeIndex={currentTimeIndex}
                    currentLayerIndex={currentLayerIndex}
                    segmentItems={segmentItems}
                    onMaskSelected={handleMaskSelected}
                    selectedMask={selectedMask}
                  />
                </div>

                <div className="w-1/4 pl-8">
                  <EditableSegmentation selectedMask={selectedMask} />
                </div>
              </div>

              <AnalysisResults />
            </div>
          </motion.div>
        )}

        {/* Debug Panel - Remove in production */}
        {DebugLogger.isDebugMode && debugMessages.length > 0 && (
          <div className="mt-8 bg-gray-100 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Debug Messages:</h4>
            <div className="max-h-40 overflow-y-auto text-sm">
              {debugMessages.slice(-10).map((msg, index) => (
                <div key={index} className="text-gray-600">
                  <span className="text-gray-400">{msg.timestamp.split('T')[1].split('.')[0]}</span>: {msg.message}
                </div>
              ))}
            </div>
          </div>
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
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import FileUpload from '../components/FileUpload';
import VisualizationControls from '../components/VisualizationControls';
import AISegmentationDisplay from '../components/AiSegDisplay';
import EditableSegmentation from '../components/EditableSeg';
import AnalysisResults from '../components/AnalysisResults';
import Notification from '../components/Notifications';
import api from '../api/AxiosInstance';

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

  // Debug message logging
  const addDebugMessage = useCallback((message) => {
    const timestamp = new Date().toISOString();
    setDebugMessages(prev => [...prev, { timestamp, message }]);
    DebugLogger.log('CardiacAnalysisPage', message);
  }, []);

  // Process segmentation data and set boundaries - updated to match backend structure
  const processSegmentationData = useCallback((data) => {
    DebugLogger.log('CardiacAnalysisPage', 'Processing segmentation data', data);
    
    if (!data) {
      DebugLogger.error('CardiacAnalysisPage', 'No segmentation data received');
      return;
    }

    // The backend returns an array of segmentation mask documents
    // We'll take the first one (most recent) for display
    let segmentationDocument = null;
    
    if (Array.isArray(data)) {
      segmentationDocument = data[0]; // Take the first segmentation result
    } else if (data.frames) {
      segmentationDocument = data; // Direct segmentation document
    }

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
    addDebugMessage(`Starting upload of ${selectedFiles.length} files`);

    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));

    try {
      const response = await api.put('/project/upload-new-project', formData, {
        withCredentials: true,
      });

      if (response.data.success) {
        const { projectId } = response.data;
        setProjectId(projectId);
        addDebugMessage(`Upload successful, project ID: ${projectId}`);

        setUploadStatus('processing');
        setIsProcessing(true);
        
        // Trigger segmentation after file upload
        await triggerSegmentation(projectId);
      } else {
        throw new Error('Upload failed: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      setUploadStatus('error');
      setErrorMessage(err.message);
      DebugLogger.error('CardiacAnalysisPage', 'Upload failed', err);
    }
  };

  // Trigger Segmentation
  const triggerSegmentation = async (projectId) => {
    addDebugMessage(`Starting segmentation for project ${projectId}`);
    
    try {
      const response = await api.post(`/segmentation/start-segmentation/${projectId}`);

      if (response.data.success) {
        addDebugMessage('Segmentation started successfully');
        setProcessingStatus('segmenting');
        
        // Fetch segmentation results once segmentation is complete
        const segmentationResults = await fetchSegmentationResults(projectId);
        
        if (segmentationResults) {
          processSegmentationData(segmentationResults);
          setUploadStatus('success');
        } else {
          throw new Error('No segmentation results received');
        }
      } else {
        throw new Error('Segmentation failed to start: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      setErrorMessage('Segmentation failed: ' + err.message);
      setUploadStatus('error');
      setIsProcessing(false);
      DebugLogger.error('CardiacAnalysisPage', 'Segmentation failed', err);
    }
  };

  // Fetch segmentation results from backend
  const fetchSegmentationResults = async (projectId) => {
    addDebugMessage(`Fetching segmentation results for project ${projectId}`);
    
    try {
      const response = await api.get(`/segmentation/segmentation-results/${projectId}`);
      
      if (response.data) {
        addDebugMessage('Segmentation results fetched successfully');
        DebugLogger.log('CardiacAnalysisPage', 'Segmentation results structure', response.data);
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
    addDebugMessage('Application reset');
  };

  // Save Project Status
  const handleSave = async () => {
    if (!projectId) {
      alert('No active project to save.');
      return;
    }

    try {
      await api.patch('/save-project', {
        projectId: projectId,
        isSaved: true // Mark as saved
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
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
  
  // Segmentation data
  const [segmentationData, setSegmentationData] = useState(null);
  const [selectedMask, setSelectedMask] = useState(null);
  
  // Project data
  const [projectId, setProjectId] = useState(null);

  // Debug message logging
  const addDebugMessage = useCallback((message) => {
    const timestamp = new Date().toISOString();
    setDebugMessages(prev => [...prev, { timestamp, message }]);
    DebugLogger.log('CardiacAnalysisPage', message);
  }, []);

  // Handle file upload and start segmentation
  const handleFilesSelected = async (selectedFiles, status, message) => {
    if (status === 'error') {
      setUploadStatus('error');
      setErrorMessage(message);
      return;
    }

    setUploadStatus('uploading');
    setFiles(selectedFiles);

    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));

    try {
      const response = await api.put('/project/upload-new-project', formData, {
        withCredentials: true,
      });

      if (response.data.success) {
        const { projectId } = response.data;
        setProjectId(projectId);

        // Trigger segmentation after file upload
        await triggerSegmentation(projectId); // Start segmentation
      }
    } catch (err) {
      setUploadStatus('error');
      setErrorMessage(err.message);
    }
  };

  // Trigger Segmentation
  const triggerSegmentation = async (projectId) => {
    try {
      const response = await api.post(`/segmentation/start-segmentation/${projectId}`);

      if (response.data.success) {
        // Fetch segmentation results once segmentation is complete
        const segmentationResults = await fetchSegmentationResults(projectId);
        setSegmentationData(segmentationResults); // Store results for display
        setProcessingComplete(true);
      } else {
        setErrorMessage('Segmentation failed to start');
      }
    } catch (err) {
      setErrorMessage('Segmentation failed');
      console.error('Segmentation error:', err);
    }
  };

  // Fetch segmentation results from backend
  const fetchSegmentationResults = async (projectId) => {
    try {
      const response = await api.get(`/segmentation/segmentation-results/${projectId}`);
      return response.data; // Return the segmentation data
    } catch (err) {
      setErrorMessage('Failed to fetch segmentation results');
      console.error('Error fetching segmentation results:', err);
      return null;
    }
  };

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
    setProjectId(null);
    setSelectedMask(null);
    setDebugMessages([]);
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
  } catch (error) {
    alert('Failed to save project.');
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

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
  const [segmentItems, setSegmentItems] = useState([]);
  
  // Project data
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  // Add debug message
  const addDebugMessage = useCallback((message) => {
    const timestamp = new Date().toISOString();
    setDebugMessages(prev => [...prev, { timestamp, message }]);
    DebugLogger.log('CardiacAnalysisPage', message);
  }, []);

  // Function to handle file selection and upload initiation
const handleFilesSelected = async (selectedFiles, status, message) => {
  addDebugMessage(`File selection: status=${status}, files=${selectedFiles.length}`);

  if (status === 'error') {
    setUploadStatus('error');
    setErrorMessage(message);
    addDebugMessage(`File selection error: ${message}`);
    return;
  }

  setUploadStatus('uploading');
  setErrorMessage('');
  setFiles(selectedFiles);

  const formData = new FormData();

  selectedFiles.forEach(file => {
    formData.append('files', file);  // Ensure the field name is 'files' (matches backend)
    addDebugMessage(`Adding file to upload: ${file.name} (${file.size} bytes)`);
  });

  formData.append('name', 'Cardiac Analysis Project');
  formData.append('description', 'Uploaded from Cardiac Analysis UI');

  try {
    addDebugMessage('Starting upload to server...');
    
    const response = await api.put('/project/upload-new-project', formData, {
      withCredentials: true,  // Ensure cookies are sent with the request
    });

    addDebugMessage('Upload completed successfully. Server response received.');
    addDebugMessage(`Response status: ${response.status}`);
    addDebugMessage('Response data:', response.data);

    if (response.data.success) {
      const { projectId, status } = response.data;
      addDebugMessage(`Project ID: ${projectId}`);
      addDebugMessage(`Project Status: ${status}`);

      setProjectId(projectId);
      setProjectStatus(status);  // Set status from the response

      setUploadStatus('success');
      setIsProcessing(false); // No need for polling
    } else {
      setErrorMessage('Server response missing project information.');
      setIsProcessing(false);
    }
  } catch (err) {
    const errorDetail = err.response?.data || err.message || 'Unknown error';
    DebugLogger.error('CardiacAnalysisPage', 'Upload error:', err);
    addDebugMessage(`Upload failed: ${JSON.stringify(errorDetail)}`);
    setUploadStatus('error');
    setErrorMessage(err.response?.data?.message || err.message || 'Upload failed');
    setIsProcessing(false);
  }
};

  // Handlers for VisualizationControls
  const handleTimeSliderChange = (e) => {
    const newTimeIndex = parseInt(e.target.value);
    setCurrentTimeIndex(newTimeIndex);
  };

  const handleLayerSliderChange = (e) => {
    const newLayerIndex = parseInt(e.target.value);
    setCurrentLayerIndex(newLayerIndex);
  };

  const handleReset = () => {
    addDebugMessage('Resetting application state');
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

  const handleSave = async () => {
    if (!projectId) {
      alert('No active project to save.');
      addDebugMessage('Save attempted but no project ID available');
      return;
    }
    
    try {
      addDebugMessage(`Saving project ${projectId} with name "${projectName}"`);
      await api.patch(`/upload/projects/${projectId}`, {
        name: projectName,
        description: projectDescription
      });
      
      addDebugMessage('Project saved successfully');
      alert('Project saved successfully.');
    } catch (error) {
      const errorDetail = error.response?.data || error.message || 'Unknown error';
      addDebugMessage(`Save failed: ${JSON.stringify(errorDetail)}`);
      DebugLogger.error('CardiacAnalysisPage', 'Save error:', error);
      alert('Failed to save project: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleExport = async () => {
    if (!projectId) {
      alert('No active project to export.');
      addDebugMessage('Export attempted but no project ID available');
      return;
    }
    
    try {
      addDebugMessage(`Exporting project ${projectId}`);
      const response = await api.get(`/projects/${projectId}/export`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cardiac-analysis-${projectId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      addDebugMessage('Export completed successfully');
    } catch (error) {
      const errorDetail = error.response?.data || error.message || 'Unknown error';
      addDebugMessage(`Export failed: ${JSON.stringify(errorDetail)}`);
      DebugLogger.error('CardiacAnalysisPage', 'Export error:', error);
      alert('Failed to export project: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleMaskSelected = (mask) => {
    setSelectedMask(mask);
    addDebugMessage(`Selected mask: ${JSON.stringify(mask)}`);
  };

  const handleSegmentationUpdate = async (updatedMask, description) => {
    if (!projectId || !selectedMask) {
      addDebugMessage('Update attempted but no project ID or selected mask available');
      return;
    }
    
    try {
      addDebugMessage(`Updating segmentation for mask ${selectedMask.id}`);
      await api.post(`/projects/${projectId}/segmentation/update`, {
        maskId: selectedMask.id,
        maskData: updatedMask,
        description: description
      });
      
      addDebugMessage('Segmentation update successful');
      // Refresh segmentation data
      fetchSegmentationData();
    } catch (error) {
      const errorDetail = error.response?.data || error.message || 'Unknown error';
      addDebugMessage(`Failed to update segmentation: ${JSON.stringify(errorDetail)}`);
      DebugLogger.error('CardiacAnalysisPage', 'Segmentation update error:', error);
      alert('Failed to update segmentation');
    }
  };

  // Debug panel component
  const DebugPanel = () => {
    if (!DebugLogger.isDebugMode) return null;
    
    return (
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <div className="flex justify-between mb-2">
          <h3 className="text-lg font-medium">Debug Information</h3>
          <button 
            onClick={() => setDebugMessages([])}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Clear
          </button>
        </div>
        <div className="mb-4">
          <p><strong>Project ID:</strong> {projectId || 'None'}</p>
          <p><strong>Upload Status:</strong> {uploadStatus || 'None'}</p>
          <p><strong>Processing:</strong> {isProcessing ? 'Yes' : 'No'}</p>
          <p><strong>Processing Status:</strong> {processingStatus || 'N/A'}</p>
          <p><strong>Processing Progress:</strong> {processingProgress}%</p>
          <p><strong>Processing Complete:</strong> {processingComplete ? 'Yes' : 'No'}</p>
        </div>
        <div className="border rounded max-h-48 overflow-y-auto bg-gray-800 text-white p-2 font-mono text-xs">
          {debugMessages.map((entry, index) => (
            <div key={index} className="mb-1">
              <span className="text-gray-400">[{entry.timestamp}]</span> {entry.message}
            </div>
          ))}
          {debugMessages.length === 0 && <p>No debug messages</p>}
        </div>
      </div>
    );
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
            isProcessing={isProcessing}
            processingProgress={processingProgress}
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Upload new file
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex">
                {/* 1. Left Panel - Slice & Frame Controls */}
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
                    projectName={projectName}
                    projectDescription={projectDescription}
                    setProjectName={setProjectName}
                    setProjectDescription={setProjectDescription}
                  />
                </div>

                {/* 2. Middle Panel - AI Segmentations */}
                <div className="w-1/2 px-4">
                  <AISegmentationDisplay
                    currentTimeIndex={currentTimeIndex}
                    currentLayerIndex={currentLayerIndex}
                    segmentationData={segmentationData}
                    segmentItems={segmentItems}
                    onMaskSelected={handleMaskSelected}
                    selectedMask={selectedMask}
                  />
                </div>

                {/* 3. Right Panel - Editable Segmentation & Description */}
                <div className="w-1/4 pl-8">
                  <EditableSegmentation 
                    selectedMask={selectedMask} 
                    onUpdate={handleSegmentationUpdate} 
                  />
                </div>
              </div>

              {/* Analysis Results Section */}
              <AnalysisResults projectId={projectId} />
            </div>
          </motion.div>
        )}

        <Notification
          uploadStatus={uploadStatus}
          errorMessage={errorMessage}
          uploadProgress={uploadProgress}
          onClose={() => setUploadStatus(null)}
        />
        
        {/* Debug Panel */}
        {/* <DebugPanel /> */}
      </div>
    </div>
  );
};

export default CardiacAnalysisPage;
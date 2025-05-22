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
  const [maxTimeIndex, setMaxTimeIndex] = useState(20);
  const [maxLayerIndex, setMaxLayerIndex] = useState(30);
  
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

  // Function to setup demo data
  const setupDemoData = useCallback(() => {
    addDebugMessage('Setting up demo segmentation data...');

    // Set up hardcoded segment items
    const demoSegmentItems = [
      {
        id: 'lv_endo',
        name: 'LV Endocardium',
        color: '#FF6B6B',
        confidenceScore: 0.94,
        volume: 68.2,
        area: 15.3,
        visible: true
      },
      {
        id: 'lv_epi',
        name: 'LV Epicardium',
        color: '#4ECDC4',
        confidenceScore: 0.91,
        volume: 134.7,
        area: 28.6,
        visible: true
      },
      {
        id: 'rv_endo',
        name: 'RV Endocardium',
        color: '#45B7D1',
        confidenceScore: 0.89,
        volume: 72.1,
        area: 18.9,
        visible: true
      },
      {
        id: 'la',
        name: 'Left Atrium',
        color: '#F7DC6F',
        confidenceScore: 0.87,
        volume: 45.3,
        area: 12.1,
        visible: false
      },
      {
        id: 'ra',
        name: 'Right Atrium',
        color: '#BB8FCE',
        confidenceScore: 0.85,
        volume: 41.8,
        area: 11.7,
        visible: false
      },
      {
        id: 'aorta',
        name: 'Ascending Aorta',
        color: '#F1948A',
        confidenceScore: 0.92,
        volume: 8.4,
        area: 3.2,
        visible: false
      }
    ];

    setSegmentItems(demoSegmentItems);
    addDebugMessage(`Set ${demoSegmentItems.length} segment items`);

    // Create dummy segmentation masks
    const width = 64;
    const height = 64;

    const createDummyCircleMask = () =>
      Array.from({ length: height }, (_, y) =>
        Array.from({ length: width }, (_, x) =>
          (x - 32) ** 2 + (y - 32) ** 2 < 400 ? 1 : 0
        )
      );

    const demoSegmentationData = {
      lv_endo: createDummyCircleMask(),
      lv_epi: createDummyCircleMask(),
      rv_endo: createDummyCircleMask(),
      la: createDummyCircleMask(),
      ra: createDummyCircleMask(),
      aorta: createDummyCircleMask(),
    };

    setSegmentationData(demoSegmentationData);
    addDebugMessage('Created dummy segmentation masks');

    // Mark processing as complete
    setProcessingComplete(true);
    setIsProcessing(false);
    addDebugMessage('Demo setup complete - processingComplete set to true');
  }, [addDebugMessage]);

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
    setIsProcessing(true);
    setProcessingComplete(false);

    const formData = new FormData();

    selectedFiles.forEach(file => {
      formData.append('files', file);
      addDebugMessage(`Adding file to upload: ${file.name} (${file.size} bytes)`);
    });

    formData.append('name', 'Cardiac Analysis Project');
    formData.append('description', 'Uploaded from Cardiac Analysis UI');

    try {
      addDebugMessage('Starting upload to server...');
      
      const response = await api.put('/project/upload-new-project', formData, {
        withCredentials: true,
      });

      addDebugMessage('Upload completed successfully. Server response received.');
      addDebugMessage(`Response status: ${response.status}`);
      addDebugMessage('Response data:', response.data);

      // Check if response is successful (status 200-299)
      if (response.status >= 200 && response.status < 300) {
        // Handle both cases: when server returns success property and when it doesn't
        const projectId = response.data?.projectId || `demo_${Date.now()}`;
        const status = response.data?.status || 'completed';
        
        addDebugMessage(`Project ID: ${projectId}`);
        addDebugMessage(`Project Status: ${status}`);
        addDebugMessage('Server response successful - setting up demo data');

        setProjectId(projectId);
        setProcessingStatus(status);
        setUploadStatus('success');
        
        // Set up demo data after successful upload
        addDebugMessage('Upload successful, setting up demo data...');
        setupDemoData();

      } else {
        addDebugMessage('Server response indicates failure');
        setErrorMessage('Server response indicates upload failure.');
        setIsProcessing(false);
        setProcessingComplete(false);
      }
    } catch (err) {
      const errorDetail = err.response?.data || err.message || 'Unknown error';
      DebugLogger.error('CardiacAnalysisPage', 'Upload error:', err);
      addDebugMessage(`Upload failed: ${JSON.stringify(errorDetail)}`);
      setUploadStatus('error');
      setErrorMessage(err.response?.data?.message || err.message || 'Upload failed');
      setIsProcessing(false);
      setProcessingComplete(false);
    }
  };

  // Handlers for VisualizationControls
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

  const handleReset = () => {
    addDebugMessage('Resetting application state');
    setFiles([]);
    setUploadStatus(null);
    setUploadProgress(0);
    setErrorMessage('');
    setIsProcessing(false);
    setProcessingComplete(false);
    setSegmentationData(null);
    setSegmentItems([]);
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
      setupDemoData();
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
          <p><strong>Segment Items Count:</strong> {segmentItems.length}</p>
          <p><strong>Segmentation Data:</strong> {segmentationData ? 'Available' : 'None'}</p>
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
        <DebugPanel />
      </div>
    </div>
  );
};

export default CardiacAnalysisPage;
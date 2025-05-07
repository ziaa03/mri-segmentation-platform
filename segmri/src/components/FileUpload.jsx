import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FileUpload = ({ onFilesSelected, uploadStatus, uploadProgress, errorMessage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]); // Added state for selected files
  const fileInputRef = useRef(null);

  // Moved handleFiles definition before its usage
  const handleFiles = useCallback((selectedFiles) => {
    const newFiles = [...selectedFiles];

    // Validate file types - moved this logic here
    const validFiles = newFiles.filter(file => {
      const validTypes = [
        'application/dicom',
        '.dcm',
        'image/dicom',
        '.nii',
        'application/octet-stream',
      ];

      if (file.name.endsWith('.dcm') || file.name.endsWith('.nii') || file.name.endsWith('.nii.gz')) {
        return true;
      }

      return validTypes.includes(file.type);
    });

    if (validFiles.length !== newFiles.length) {
      //bubble up error to parent
      onFilesSelected([], 'error', 'Some files were rejected. Please upload DICOM or supported medical image formats only.');
      return;
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles); // Store the selected files in state
      onFilesSelected(validFiles, 'idle', ''); // Notify parent component
    }
  }, [onFilesSelected]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInputChange = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="mb-16"
    >
      {/* File Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
          isDragging
            ? 'border-[#5B7B9A] bg-blue-50'
            : 'border-gray-300 hover:border-[#5B7B9A] hover:bg-gray-50'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".dcm,.nii,.nii.gz,image/png,image/jpeg,image/jpg,application/octet-stream,application/dicom" // Ensure all types are here
          multiple
          onChange={handleFileInputChange}
        />

        <div className="space-y-4">
          <div className="flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-[#5B7B9A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <h3 className="text-2xl font-light text-[#3A4454]">
            {isDragging ? 'Drop your files here' : 'Drag & drop your files here'}
          </h3>

          <p className="text-[#3A4454] opacity-70">
            or <button
              className="text-[#5B7B9A] font-medium hover:underline focus:outline-none"
              onClick={() => fileInputRef.current?.click()}
            >
              browse files
            </button>
          </p>

          <p className="text-sm text-[#3A4454] opacity-60">
            Accepted formats: DICOM (.dcm), NIfTI (.nii, .nii.gz)
          </p>
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {uploadStatus === 'idle' && selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 overflow-hidden"
          >
            <h3 className="text-lg font-medium text-[#3A4454] mb-3">Selected Files</h3>
            <div className="space-y-2">
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="text-[#3A4454]">{file.name}</div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Button and Progress */}
      <div className="mt-6">
        {uploadStatus === 'uploading' && (
          <div className="space-y-2">
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#5B7B9A] rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-[#3A4454]">Uploading... {uploadProgress}%</p>
          </div>
        )}

        {uploadStatus === 'success' && ( 
          <div className="flex items-center text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p>Upload complete!</p>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="flex items-center text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{errorMessage || 'An error occurred during upload.'}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FileUpload;
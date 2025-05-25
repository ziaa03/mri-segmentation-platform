import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  File, 
  CheckCircle, 
  AlertCircle, 
  FileImage,
  Loader,
  HardDrive,
  Clock,
  Zap,
  Info
} from 'lucide-react';

const FileUpload = ({ 
  onFilesSelected, 
  uploadStatus, 
  uploadProgress, 
  errorMessage,
  maxFiles = 10,
  maxSizeMB = 100,
  acceptedFormats = ['.dcm', '.nii', '.nii.gz', '.mha', '.mhd', '.jpg', '.jpeg', '.png']
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const fileInputRef = useRef(null);

  // File size formatter
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // File type checker
  const getFileType = (filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    const types = {
      'dcm': { name: 'DICOM', icon: FileImage, color: 'blue' },
      'nii': { name: 'NIfTI', icon: FileImage, color: 'green' },
      'gz': { name: 'NIfTI.gz', icon: FileImage, color: 'green' },
      'mha': { name: 'MetaImage', icon: FileImage, color: 'purple' },
      'mhd': { name: 'MetaImage', icon: FileImage, color: 'purple' },
      'jpg': { name: 'JPEG', icon: FileImage, color: 'orange' },
      'jpeg': { name: 'JPEG', icon: FileImage, color: 'orange' },
      'png': { name: 'PNG', icon: FileImage, color: 'orange' }
    };
    
    // Special case for .nii.gz files
    if (filename.toLowerCase().endsWith('.nii.gz')) {
      return types['gz'];
    }
    
    return types[ext] || { name: 'Unknown', icon: File, color: 'gray' };
  };

  // Validate files
const validateFiles = (files) => {
  const errors = [];
  const validFiles = [];

  if (files.length > maxFiles) {
    errors.push(`Maximum ${maxFiles} files allowed. You selected ${files.length} files.`);
    return { validFiles: [], errors };
  }

  Array.from(files).forEach((file, index) => {
    const fileErrors = [];

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      fileErrors.push(`File "${file.name}" is too large. Maximum size: ${maxSizeMB}MB`);
    }

    // Check file format
    const isValidFormat = acceptedFormats.some(format =>
      file.name.toLowerCase().endsWith(format.toLowerCase())
    );

    if (!isValidFormat) {
      fileErrors.push(`File "${file.name}" has an unsupported format. Accepted formats: ${acceptedFormats.join(', ')}`);
    }

    // Check for duplicate names in current selection
    const duplicateIndex = validFiles.findIndex(validFile => validFile.name === file.name);
    if (duplicateIndex !== -1) {
      fileErrors.push(`Duplicate file name: "${file.name}"`);
    }

    // Check for duplicate names in already uploaded files
    if (selectedFiles.some(f => f.name === file.name)) {
      fileErrors.push(`File "${file.name}" has already been uploaded.`);
    }

    if (fileErrors.length === 0) {
      validFiles.push({
        file,
        id: `${file.name}-${file.size}-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: getFileType(file.name),
        lastModified: file.lastModified
      });
    } else {
      errors.push(...fileErrors);
    }
  });

  return { validFiles, errors };
};

  // Handle file selection
  const handleFiles = useCallback((files) => {
    const { validFiles, errors } = validateFiles(files);
    
    setValidationErrors(errors);

  if (errors.some(e => e.includes('already been uploaded'))) {
    // Optionally, you can show a toast or alert here
    // alert('Some files have already been uploaded.');
  }

  if (validFiles.length > 0) {
    setSelectedFiles(prev => [...prev, ...validFiles]);
    onFilesSelected([...selectedFiles, ...validFiles].map(f => f.file), 'success', `${validFiles.length} files selected successfully`);
  } else if (errors.length > 0) {
    onFilesSelected([], 'error', errors[0]);
  }
}, [onFilesSelected, maxFiles, maxSizeMB, acceptedFormats, selectedFiles]);

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // File input handler
  const handleInputChange = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  // Remove file
  const removeFile = (fileId) => {
    const updatedFiles = selectedFiles.filter(f => f.id !== fileId);
    setSelectedFiles(updatedFiles);
    
    if (updatedFiles.length === 0) {
      setValidationErrors([]);
      onFilesSelected([], 'reset', '');
    } else {
      onFilesSelected(updatedFiles.map(f => f.file), 'success', `${updatedFiles.length} files selected`);
    }
  };

  // Clear all files
  const clearAllFiles = () => {
    setSelectedFiles([]);
    setValidationErrors([]);
    onFilesSelected([], 'reset', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <Loader className="animate-spin" size={20} />;
      case 'processing':
        return <Zap className="animate-pulse" size={20} />;
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      default:
        return <Upload size={20} />;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'uploading':
      case 'processing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Uploading files...';
      case 'processing':
        return 'Processing images and starting AI analysis...';
      case 'success':
        return 'Upload completed successfully!';
      case 'error':
        return errorMessage || 'Upload failed';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Upload size={24} className="text-blue-600" />
                Upload Medical Images
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Upload DICOM, NIfTI, or MetaImage files for AI-powered cardiac segmentation
              </p>
            </div>
            {selectedFiles.length > 0 && (
              <button
                onClick={clearAllFiles}
                className="text-gray-500 hover:text-red-600 transition-colors"
                title="Clear all files"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : uploadStatus === 'error'
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedFormats.join(',')}
              onChange={handleInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
            />

            <div className="space-y-4">
              <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-full ${
                uploadStatus === 'error' ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                <div className={getStatusColor()}>
                  {getStatusIcon()}
                </div>
              </div>

              {uploadStatus ? (
                <div className="space-y-2">
                  <p className={`text-lg font-medium ${getStatusColor()}`}>
                    {getStatusMessage()}
                  </p>
                  {uploadStatus === 'uploading' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-700">
                    Drop files here or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports DICOM (.dcm), NIfTI (.nii, .nii.gz)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* File Format Info */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Supported Medical Image Formats:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div>• DICOM (.dcm) - Medical imaging standard</div>
                  <div>• NIfTI (.nii, .nii.gz) - Neuroimaging format</div>
                  <div>• Max size: {maxSizeMB}MB per file</div>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          <AnimatePresence>
            {validationErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-800 mb-2">File Validation Errors:</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selected Files List */}
          <AnimatePresence>
            {selectedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-800">
                    Selected Files ({selectedFiles.length})
                  </h4>
                  <div className="text-sm text-gray-600">
                    Total size: {formatFileSize(selectedFiles.reduce((sum, f) => sum + f.size, 0))}
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedFiles.map((fileData) => (
                    <motion.div
                      key={fileData.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`p-2 rounded-lg bg-${fileData.type.color}-100 text-${fileData.type.color}-600`}>
                          <fileData.type.icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate">
                            {fileData.name}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <HardDrive size={12} />
                              {formatFileSize(fileData.size)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(fileData.lastModified).toLocaleDateString()}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full bg-${fileData.type.color}-100 text-${fileData.type.color}-800`}>
                              {fileData.type.name}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeFile(fileData.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
                        title="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  ))}
                </div>

                {/* Upload Summary */}
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    Ready to upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} for AI analysis
                  </div>
                  <div className="text-xs text-blue-600">
                    Processing may take 2-5 minutes depending on file size
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default FileUpload;
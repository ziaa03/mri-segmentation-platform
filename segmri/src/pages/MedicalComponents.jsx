import React, { useState, useCallback, useRef } from 'react';
import { 
  Heart, Upload, Brain, CheckCircle, AlertTriangle, FileImage,
  User, Calendar, Settings, Bell, Search, Menu, FolderOpen,
  Archive, Database, Activity, Shield, HelpCircle, LogOut,
  ChevronDown, Plus, Filter, Download, Share
} from 'lucide-react';

// Professional Medical Header Component (FIXED - removed sidebar issues)
export const ProfessionalMedicalHeader = ({ patientId, studyDate, isProcessing, userName = "Dr. Smith" }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-xl">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-xl">
              <Heart className="w-8 h-8 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CardioAI Pro</h1>
              <p className="text-cyan-300/70 text-sm">Advanced Medical Imaging Suite</p>
            </div>
          </div>

          {/* Center Info */}
          <div className="hidden md:flex items-center space-x-8">
            {patientId && (
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wide">Project ID</div>
                <div className="text-sm font-mono text-white">{patientId}</div>
              </div>
            )}
            {studyDate && (
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wide">Study Date</div>
                <div className="text-sm text-white">{studyDate}</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Status</div>
              <div className={`text-sm font-medium ${isProcessing ? 'text-amber-400' : 'text-green-400'}`}>
                {isProcessing ? 'Processing' : 'Ready'}
              </div>
            </div>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-3 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors border border-slate-600/50"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-medium">{userName}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50">
                <div className="py-2">
                  <div className="px-4 py-2 border-b border-slate-600">
                    <div className="text-sm text-white font-medium">{userName}</div>
                    <div className="text-xs text-slate-400">Medical Professional</div>
                  </div>
                  <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center space-x-2">
                    <HelpCircle className="w-4 h-4" />
                    <span>Help</span>
                  </button>
                  <hr className="border-slate-600 my-2" />
                  <button className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 flex items-center space-x-2">
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced File Upload Component
export const EnhancedMedicalFileUpload = ({ onFilesSelected, uploadStatus, uploadProgress, errorMessage }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'batch'
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(files);
      onFilesSelected(files, 'success', `${files.length} files selected`);
    }
  }, [onFilesSelected]);

  const handleInputChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      onFilesSelected(files, 'success', `${files.length} files selected`);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-cyan-400/30 rounded-xl shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700/50 to-cyan-900/30 p-6 border-b border-cyan-400/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-xl">
              <FileImage className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-cyan-100">Medical Data Import</h3>
              <p className="text-cyan-300/70 text-sm">Upload NIfTI files for AI analysis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="p-6">
        <div
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
            dragActive 
              ? 'border-cyan-400 bg-cyan-400/10 scale-105' 
              : uploadStatus === 'error'
              ? 'border-red-400/50 bg-red-400/5'
              : 'border-slate-600 bg-slate-800/30 hover:border-cyan-400/50 hover:bg-cyan-400/5'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={uploadMode === 'batch'}
            accept=".dcm,.nii,.nii.gz,.zip,.tar,.tar.gz"
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
          />

          <div className="space-y-6">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
              {uploadStatus === 'uploading' ? (
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-cyan-400 border-t-transparent" />
              ) : uploadStatus === 'processing' ? (
                <Brain className="w-10 h-10 text-cyan-400 animate-pulse" />
              ) : uploadStatus === 'success' ? (
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              ) : (
                <Upload className="w-10 h-10 text-cyan-400" />
              )}
            </div>

            {/* Status Text */}
            <div className="space-y-3">
              {uploadStatus === 'uploading' ? (
                <div className="space-y-3">
                  <h4 className="text-cyan-300 font-semibold text-lg">Uploading Medical Data</h4>
                  <div className="max-w-xs mx-auto">
                    <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-cyan-300/70 text-sm mt-2">{uploadProgress}% Complete</p>
                  </div>
                </div>
              ) : uploadStatus === 'processing' ? (
                <div className="space-y-2">
                  <h4 className="text-cyan-400 font-semibold text-lg">AI Analysis in Progress</h4>
                  <p className="text-slate-400">Advanced neural network processing • Estimated 3-8 minutes</p>
                  <div className="flex items-center justify-center space-x-2 text-cyan-300/70 text-sm">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    <span>GPU Processing Active</span>
                  </div>
                </div>
              ) : uploadStatus === 'success' ? (
                <div className="space-y-2">
                  <h4 className="text-emerald-400 font-semibold text-lg">Analysis Complete</h4>
                  <p className="text-slate-400">Ready for visualization and segmentation</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-cyan-100 font-semibold text-lg">
                    Drop medical images here
                  </h4>
                  <p className="text-slate-400">
                    Or click to browse • Supports NIfTI (.nii, .nii.gz)
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-xs text-slate-500">
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                      <span>Max 2GB per file</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                      <span>HIPAA Compliant</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-4 mt-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Browse Files</span>
          </button>
          
          {selectedFiles.length > 0 && (
            <button className="flex items-center space-x-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="border-t border-cyan-200/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-cyan-300 font-medium">Selected Files ({selectedFiles.length})</h4>
          </div>
          
          <div className="max-h-40 overflow-y-auto space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                    <FileImage className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-cyan-100 font-medium truncate max-w-xs">{file.name}</p>
                    <p className="text-slate-400 text-sm">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span className="text-emerald-400 text-sm">Ready</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="border-t border-red-500/20 p-6">
          <div className="flex items-start space-x-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-red-400 font-medium">Upload Error</h5>
              <p className="text-red-300 text-sm mt-1">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
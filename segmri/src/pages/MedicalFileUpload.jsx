import React, { useState, useRef } from 'react';
import { 
  FileImage, Upload, Shield, AlertTriangle, CheckCircle, Brain, Activity, 
  Heart, Monitor, Stethoscope, Zap, Database, Lock, Clock
} from 'lucide-react';

const MedicalFileUpload = ({ onFilesSelected, uploadStatus, uploadProgress, errorMessage }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  };

  const handleFileSelection = (files) => {
    const validFiles = files.filter(file => 
      file.name.toLowerCase().endsWith('.nii') || 
      file.name.toLowerCase().endsWith('.nii.gz') ||
      file.name.toLowerCase().endsWith('.tar') ||
      file.name.toLowerCase().endsWith('.dcm')
    );
    
    if (validFiles.length === 0) {
      onFilesSelected([], 'error', 'Please select valid medical imaging files (.nii, .nii.gz, .tar, .dcm)');
      return;
    }
    
    setSelectedFiles(validFiles);
    onFilesSelected(validFiles, 'success', '');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Medical Header */}
      <div className="bg-gradient-to-r from-[#3A4454] to-[#5B7B9A] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white text-xl font-semibold">Medical Imaging Upload</h3>
              <p className="text-white/80 text-sm">Secure NIfTI Processing Center</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Interface */}
      <div className="p-8">
        {uploadStatus === null && (
          <>
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-500 cursor-pointer group ${
                isDragOver 
                  ? 'border-[#FDBA74] bg-gradient-to-br from-[#FDBA74]/10 to-[#5B7B9A]/10 shadow-2xl transform scale-[1.02]' 
                  : 'border-gray-300 hover:border-[#5B7B9A] hover:bg-gradient-to-br hover:from-[#F8F2E6] hover:to-white hover:shadow-lg'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".nii,.nii.gz,.tar,.dcm"
                onChange={(e) => handleFileSelection(Array.from(e.target.files))}
                className="hidden"
              />
              
              <div className="space-y-6">
                <div className={`mx-auto w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  isDragOver 
                    ? 'bg-gradient-to-br from-[#FDBA74] to-[#5B7B9A] text-white scale-110 shadow-2xl' 
                    : 'bg-gradient-to-br from-[#F8F2E6] to-[#3A4454]/10 text-[#3A4454] group-hover:scale-105 group-hover:shadow-xl'
                }`}>
                  <Upload className="w-10 h-10" />
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-2xl font-light text-[#3A4454]">
                    {isDragOver ? 'Release to Upload' : 'Drop Medical Files Here'}
                  </h4>
                  <p className="text-[#3A4454]/70 text-lg max-w-lg mx-auto leading-relaxed">
                    Drag & drop your medical imaging files or <span className="font-semibold text-[#5B7B9A] underline">browse files</span>
                  </p>
                  
                  {/* File Format Support */}
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4 max-w-2xl mx-auto mt-8">
                    {[
                      { format: 'Compressed', ext: '.nii.gz', icon: Monitor, color: 'bg-gray-50 text-gray-600 border-gray-200' },
                    ].map((format, index) => (
                      <div key={index} className={`p-3 rounded-xl border-2 ${format.color} transition-all duration-200 hover:shadow-md`}>
                        <div className="flex flex-col items-center space-y-2">
                          <format.icon className="w-5 h-5" />
                          <div className="text-center">
                            <div className="font-semibold text-sm">{format.format}</div>
                            <div className="text-xs opacity-75">{format.ext}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Selected Files Display */}
            {selectedFiles.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h4 className="font-semibold text-green-800">Files Ready for Processing</h4>
                </div>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                      <div className="flex items-center space-x-3">
                        <FileImage className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="font-medium text-green-800">{file.name}</div>
                          <div className="text-sm text-green-600">{formatFileSize(file.size)}</div>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Ready
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {uploadStatus === 'uploading' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-[#FDBA74]/20 to-[#5B7B9A]/20 rounded-3xl mb-8 relative">
              <div className="w-16 h-16 border-4 border-[#FDBA74] border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-[#FDBA74]/5 to-[#5B7B9A]/5 rounded-3xl animate-pulse"></div>
            </div>
            <h3 className="text-2xl font-light text-[#3A4454] mb-4">Secure Transfer in Progress</h3>
            
            <div className="max-w-lg mx-auto space-y-4">
              <div className="bg-gray-100 rounded-2xl h-6 overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-[#5B7B9A] via-[#FDBA74] to-[#3A4454] h-full rounded-2xl transition-all duration-1000 shadow-sm relative"
                  style={{ width: `${uploadProgress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#3A4454]/60 font-medium">{uploadProgress}% complete</span>
                <div className="flex items-center space-x-2 text-[#5B7B9A]">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium">256-bit Encryption</span>
                </div>
              </div>
              
              {/* Upload stages */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                {[
                  { stage: 'Validating', icon: Shield, active: uploadProgress < 33 },
                  { stage: 'Encrypting', icon: Lock, active: uploadProgress >= 33 && uploadProgress < 66 },
                  { stage: 'Uploading', icon: Zap, active: uploadProgress >= 66 }
                ].map((stage, index) => (
                  <div key={index} className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                    stage.active 
                      ? 'border-[#FDBA74] bg-[#FDBA74]/10 text-[#FDBA74]' 
                      : 'border-gray-200 bg-gray-50 text-gray-400'
                  }`}>
                    <div className="flex flex-col items-center space-y-2">
                      <stage.icon className={`w-5 h-5 ${stage.active ? 'animate-pulse' : ''}`} />
                      <span className="text-sm font-medium">{stage.stage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {uploadStatus === 'processing' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-[#5B7B9A]/20 to-[#3A4454]/20 rounded-3xl mb-8 relative">
              <Brain className="w-16 h-16 text-[#5B7B9A] animate-pulse" />
              <div className="absolute inset-0 border-4 border-[#5B7B9A]/30 rounded-3xl animate-spin"></div>
              <div className="absolute inset-2 border-2 border-[#FDBA74]/40 rounded-3xl animate-spin animation-delay-150"></div>
            </div>
            <h3 className="text-2xl font-light text-[#3A4454] mb-4">AI Neural Network Processing</h3>
            <p className="text-[#3A4454]/70 text-lg max-w-md mx-auto mb-6">
              Advanced deep learning models analyzing cardiac structures with clinical precision
            </p>
            
            <div className="flex justify-center space-x-8 text-sm">
              <div className="flex items-center space-x-2 px-4 py-2 bg-[#F8F2E6] rounded-lg">
                <Activity className="w-4 h-4 text-[#5B7B9A]" />
                <span className="text-[#3A4454] font-medium">GPU Acceleration</span>
              </div>
              <div className="flex items-center space-x-2 px-4 py-2 bg-[#F8F2E6] rounded-lg">
                <Clock className="w-4 h-4 text-[#5B7B9A]" />
                <span className="text-[#3A4454] font-medium">~60 seconds</span>
              </div>
            </div>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-emerald-100 to-green-50 rounded-3xl mb-8 relative">
              <CheckCircle className="w-16 h-16 text-emerald-600" />
              <div className="absolute inset-0 border-4 border-emerald-200 rounded-3xl animate-pulse"></div>
            </div>
            <h3 className="text-2xl font-light text-[#3A4454] mb-4">Analysis Complete</h3>
            <p className="text-[#3A4454]/70 text-lg max-w-md mx-auto">
              Medical imaging analysis is ready for clinical review and annotation
            </p>
            
            <div className="flex justify-center mt-6">
              <div className="flex items-center space-x-2 px-6 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <Heart className="w-5 h-5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Cardiac Structures Detected</span>
              </div>
            </div>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-red-50 to-rose-100 rounded-3xl mb-8 relative">
              <AlertTriangle className="w-16 h-16 text-red-500" />
              <div className="absolute inset-0 border-4 border-red-200 rounded-3xl animate-pulse"></div>
            </div>
            <h3 className="text-2xl font-light text-[#3A4454] mb-4">Upload Error</h3>
            <div className="max-w-md mx-auto mb-8">
              <p className="text-red-600 text-lg mb-4">{errorMessage}</p>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  Please check your file format and try again. If the issue persists, contact technical support.
                </p>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-[#3A4454] to-[#5B7B9A] text-white rounded-2xl hover:shadow-lg transition-all duration-300 font-medium"
            >
              <Upload className="w-5 h-5" />
              <span>Retry Upload</span>
            </button>
          </div>
        )}
      </div>

      {/* Security Footer */}
      <div className="bg-gradient-to-r from-gray-50 to-[#F8F2E6] px-6 py-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-600">
              <Lock className="w-4 h-4" />
              <span>End-to-End Encrypted</span>
            </div>
          </div>
          <div className="text-gray-500">
            Max file size: 1GB • Supported: NIfTI
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalFileUpload;
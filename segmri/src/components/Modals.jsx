import React from 'react';
import { Download, Trash2, Loader, AlertCircle, Info } from 'lucide-react';

/**
 * Export Modal Component
 * 
 * Displays reconstruction details and initiates TAR file download
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Handler to close modal
 * @param {object} reconstructionData - Reconstruction metadata
 * @param {function} onExport - Handler to execute export
 * @param {boolean} isExporting - Loading state during export
 */
export const ExportModal = ({ isOpen, onClose, reconstructionData, onExport, isExporting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-scale-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Download className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Export Reconstruction</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
              disabled={isExporting}
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Reconstruction Details */}
          <div className="space-y-4 mb-6">
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Name:</span>
                <span className="text-white font-medium text-right max-w-[60%] truncate">
                  {reconstructionData?.name || 'Reconstruction'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Format:</span>
                <span className="text-white font-medium uppercase">
                  {reconstructionData?.exportFormat || 'GLB'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">File Size:</span>
                <span className="text-white font-medium">
                  {reconstructionData?.filesize 
                    ? `${(reconstructionData.filesize / 1024 / 1024).toFixed(2)} MB`
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Frames:</span>
                <span className="text-white font-medium">
                  {reconstructionData?.totalFrames || 'N/A'}
                </span>
              </div>
              {reconstructionData?.edFrameIndex && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">ED Frame:</span>
                  <span className="text-white font-medium">
                    {reconstructionData.edFrameIndex}
                  </span>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-slate-300 space-y-1">
                  <p><strong className="text-blue-300">Export Contents:</strong></p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400 ml-1">
                    <li>TAR archive with all mesh files</li>
                    <li>One {reconstructionData?.exportFormat?.toUpperCase() || 'GLB'} file per frame</li>
                    <li>ED (End-Diastolic) frame marked</li>
                    <li>Ready for 3D software import</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onExport}
              disabled={isExporting || !reconstructionData?.tarUrl}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
            >
              {isExporting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download TAR</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Delete Confirmation Modal Component
 * 
 * Shows confirmation dialog before deleting reconstruction
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Handler to close modal
 * @param {object} reconstructionData - Reconstruction metadata
 * @param {function} onDelete - Handler to execute deletion
 * @param {boolean} isDeleting - Loading state during deletion
 */
export const DeleteConfirmModal = ({ isOpen, onClose, reconstructionData, onDelete, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-red-900/50 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-scale-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Delete Reconstruction</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
              disabled={isDeleting}
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Warning Content */}
          <div className="space-y-4 mb-6">
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <p className="text-red-200 text-sm mb-3 font-medium">
                Are you sure you want to delete this reconstruction? This action cannot be undone.
              </p>
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Name:</span>
                  <span className="text-white font-medium text-right max-w-[60%] truncate">
                    {reconstructionData?.name || 'Reconstruction'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Created:</span>
                  <span className="text-white">
                    {reconstructionData?.created_at 
                      ? new Date(reconstructionData.created_at).toLocaleDateString()
                      : 'N/A'
                    }
                  </span>
                </div>
                {reconstructionData?.filesize && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Size:</span>
                    <span className="text-white">
                      {(reconstructionData.filesize / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Warning Box */}
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-200 leading-relaxed">
                  <strong className="block mb-1">Warning:</strong>
                  This will permanently delete all mesh files, metadata, and download URLs 
                  associated with this reconstruction from the database and cloud storage.
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
            >
              {isDeleting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Success Toast Notification (Optional)
 * 
 * Shows temporary success message
 * 
 * @param {string} message - Success message to display
 * @param {function} onClose - Handler to close toast
 */
export const SuccessToast = ({ message, onClose }) => {
  return (
    <div className="fixed bottom-4 right-4 bg-green-900 border border-green-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50 animate-slide-up">
      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
      <span className="font-medium">{message}</span>
      <button 
        onClick={onClose} 
        className="ml-2 hover:opacity-70 text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
};

/**
 * Error Toast Notification
 * 
 * Shows temporary error message
 * 
 * @param {string} message - Error message to display
 * @param {function} onClose - Handler to close toast
 */
export const ErrorToast = ({ message, onClose }) => {
  return (
    <div className="fixed bottom-4 right-4 bg-red-900 border border-red-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50 animate-slide-up">
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium">{message}</span>
      <button 
        onClick={onClose} 
        className="ml-2 hover:opacity-70 text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
};

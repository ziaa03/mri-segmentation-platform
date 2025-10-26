import React, { useState } from 'react';
import { 
  ArrowLeft, Database, Loader, Play, CheckCircle2, Clock, AlertCircle,
  Download, Trash2
} from 'lucide-react';
import { ExportModal, DeleteConfirmModal, SuccessToast, ErrorToast } from './Modals';

// Custom spinner style (fallback if Tailwind animate-spin isn't working)
const spinnerStyles = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  .custom-spin {
    animation: spin 1s linear infinite;
  }
`;

export default function ReconstructionHistoryPage({ 
  reconstructionHistory, 
  onBack,
  onLoadReconstruction,
  api, // Axios instance for API calls
  projectId, // Project ID for deleting all reconstructions
  onRefreshHistory, // Callback to refresh the history after delete
  isLoadingReconstruction = false
}) {
  const [selectedJob, setSelectedJob] = useState(null);
  
  // Modal state management
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedReconstruction, setSelectedReconstruction] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Toast notifications
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    const duration = (new Date(endTime) - new Date(startTime)) / 1000;
    if (duration < 60) return `${Math.round(duration)}s`;
    return `${Math.round(duration / 60)}m ${Math.round(duration % 60)}s`;
  };

  const handleLoadReconstruction = (job) => {
    setSelectedJob(job.uuid);
    onLoadReconstruction(job);
  };

  // Open Export Modal
  const handleExportClick = (job) => {
    // Transform job data to match modal expectations
    const reconstructionData = {
      name: `Reconstruction ${job.uuid?.substring(0, 8) || 'Unknown'}`,
      exportFormat: job.meshFormat || 'glb',
      filesize: job.metadata?.filesize || job.meshFileSize,
      totalFrames: job.metadata?.totalFrames || job.parameters?.totalFrames,
      edFrameIndex: job.parameters?.edFrameIndex || job.metadata?.edFrameIndex,
      tarUrl: job.downloadUrl || job.meshTarUrl // This is the presigned S3 URL
    };
    
    setSelectedReconstruction({ ...job, ...reconstructionData });
    setExportModalOpen(true);
  };

  // Open Delete Modal - Warns about deleting ALL reconstructions
  const handleDeleteClick = (job) => {
    const reconstructionData = {
      name: `All Reconstructions for Project`,
      created_at: job.createdAt,
      filesize: job.metadata?.filesize || job.meshFileSize,
      totalCount: reconstructionHistory.length // Show how many will be deleted
    };
    
    setSelectedReconstruction({ ...job, ...reconstructionData });
    setDeleteModalOpen(true);
  };

  // Execute Export - Just download the presigned URL
  const handleExport = async () => {
    if (!selectedReconstruction?.tarUrl) {
      setErrorMessage('Download URL not available');
      return;
    }

    setIsExporting(true);
    try {
      // Direct download using the presigned S3 URL
      const link = document.createElement('a');
      link.href = selectedReconstruction.tarUrl;
      
      // Use actual filename from backend if available, otherwise generate one
      const filename = selectedReconstruction.metadata?.filename 
        || `reconstruction_${selectedReconstruction.uuid?.substring(0, 8) || 'export'}.tar`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessMessage('Download started successfully!');
      setExportModalOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      setErrorMessage(error.message || 'Failed to export reconstruction');
    } finally {
      setIsExporting(false);
    }
  };

  // Execute Delete - Delete ALL reconstructions for the project
  const handleDelete = async () => {
    if (!projectId) {
      setErrorMessage('Project ID not found');
      return;
    }

    setIsDeleting(true);
    try {
      // Call existing backend route that deletes ALL reconstructions for this project
      const response = await api.delete(
        `/reconstruction/delete-project-reconstructions/${projectId}`
      );

      if (response.data.success) {
        setSuccessMessage(`Successfully deleted ${response.data.deletedCount} reconstruction(s)!`);
        setDeleteModalOpen(false);
        
        // Refresh the history list (will be empty now)
        if (onRefreshHistory) {
          await onRefreshHistory();
        }
        
        // Optionally go back to viewer after deletion
        // setTimeout(() => onBack(), 2000);
      } else {
        throw new Error(response.data.message || 'Failed to delete reconstructions');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setErrorMessage(
        error.response?.data?.message || 
        error.message || 
        'Failed to delete reconstructions'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden flex flex-col">
      {/* Inject custom spinner styles */}
      <style>{spinnerStyles}</style>
      
      {/* Professional Header */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4 flex-shrink-0 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              disabled={isLoadingReconstruction}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 rounded-lg transition-all text-sm font-medium border border-slate-700/50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Viewer</span>
            </button>
            <div className="h-8 w-px bg-slate-700/50" />
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Reconstruction Archive</h1>
                <p className="text-xs text-slate-400 flex items-center space-x-2">
                  <span>{reconstructionHistory.length} completed reconstruction{reconstructionHistory.length !== 1 ? 's' : ''}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span className="text-blue-400">Ready to load</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoadingReconstruction && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-lg z-50 flex items-center justify-center">
          <div className="bg-slate-900/95 border border-blue-500/30 rounded-2xl p-10 max-w-md text-center shadow-2xl shadow-blue-500/20">
            <div className="relative mb-6 flex items-center justify-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-2xl absolute" />
              <div className="relative">
                <Loader className="w-14 h-14 text-blue-400 animate-spin custom-spin" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Loading Reconstruction</h3>
            <p className="text-sm text-slate-400 mb-4">
              Extracting and processing 3D mesh data...
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {reconstructionHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-800/50 to-slate-800/30 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-700/50 shadow-xl">
                <Database className="w-12 h-12 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-400 mb-2">No Reconstruction History</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Completed cardiac reconstructions will appear here for analysis and review.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {reconstructionHistory.map((job, index) => {
              const isCurrentlyLoading = selectedJob === job.uuid && isLoadingReconstruction;
              const isLatest = index === 0;

              return (
                <div
                  key={job.uuid || index}
                  className={`bg-slate-800/50 border rounded-lg p-4 transition-all relative ${
                    isCurrentlyLoading 
                      ? 'border-blue-600/50 ring-2 ring-blue-500/20' 
                      : 'border-slate-700 hover:border-blue-600/50'
                  }`}
                >
                  {/* TOP SECTION */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                          Reconstruction #{reconstructionHistory.length - index}
                        </h3>
                        {isLatest && (
                          <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] font-medium rounded">
                            Latest
                          </span>
                        )}
                      </div>
                      {job.uuid && (
                        <p className="text-[10px] text-slate-500 font-mono mb-1">
                          ID: {job.uuid.substring(0, 8)}...
                        </p>
                      )}
                      <p className="text-xs text-slate-400">
                        {formatDate(job.createdAt)}
                      </p>
                    </div>
                    {isCurrentlyLoading && (
                      <div className="flex-shrink-0">
                        <Loader className="w-5 h-5 text-blue-400 animate-spin custom-spin" />
                      </div>
                    )}
                  </div>

                  {/* STATS GRID */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-slate-900/50 rounded p-2">
                      <div className="text-[10px] text-slate-500 uppercase mb-0.5">ED Frame</div>
                      <div className="text-sm font-semibold text-slate-300">
                        {job.parameters?.edFrameIndex ?? job.metadata?.edFrameIndex ?? 'N/A'}
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded p-2">
                      <div className="text-[10px] text-slate-500 uppercase mb-0.5">Resolution</div>
                      <div className="text-sm font-semibold text-slate-300">
                        {job.parameters?.resolution || job.metadata?.resolution || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded p-2">
                      <div className="text-[10px] text-slate-500 uppercase mb-0.5">Iterations</div>
                      <div className="text-sm font-semibold text-slate-300">
                        {job.parameters?.numIterations || job.metadata?.numIterations || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded p-2">
                      <div className="text-[10px] text-slate-500 uppercase mb-0.5">File Size</div>
                      <div className="text-sm font-semibold text-slate-300">
                        {job.metadata?.filesize || job.meshFileSize
                          ? `${((job.metadata?.filesize || job.meshFileSize) / 1024 / 1024).toFixed(1)} MB`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS SECTION */}
                  <div className="flex items-center space-x-2 mb-3">
                    {/* Load Button */}
                    <button
                      onClick={() => !isLoadingReconstruction && handleLoadReconstruction(job)}
                      disabled={isLoadingReconstruction}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Load</span>
                    </button>

                    {/* Export Button */}
                    <button
                      onClick={() => handleExportClick(job)}
                      disabled={!job.downloadUrl && !job.meshTarUrl}
                      className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Export Reconstruction"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Delete Button - Deletes ALL reconstructions for project */}
                    <button
                      onClick={() => handleDeleteClick(job)}
                      className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all"
                      title="Delete All Reconstructions"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* FOOTER */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <div className="text-[10px] text-slate-500">
                      {job.completedAt && (
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3 h-3" />
                          <span>Duration: {formatDuration(job.createdAt, job.completedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!job.downloadUrl && !job.meshTarUrl && (
                    <div className="mt-2 flex items-center space-x-1 text-xs text-yellow-400">
                      <AlertCircle className="w-3 h-3" />
                      <span>Download URL unavailable</span>
                    </div>
                  )}
                </div>
              );
            })}
            </div>

            {/* Footer Info */}
            <div className="mt-6 flex items-center justify-between px-4">
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <span>All reconstructions are ready for analysis</span>
              </div>
              <div className="text-xs text-slate-500">
                Sorted by most recent
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        reconstructionData={selectedReconstruction}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        reconstructionData={selectedReconstruction}
        onDelete={handleDelete}
        isDeleting={isDeleting}
      />

      {/* Success Toast */}
      {successMessage && (
        <SuccessToast
          message={successMessage}
          onClose={() => setSuccessMessage('')}
        />
      )}

      {/* Error Toast */}
      {errorMessage && (
        <ErrorToast
          message={errorMessage}
          onClose={() => setErrorMessage('')}
        />
      )}
    </div>
  );
}
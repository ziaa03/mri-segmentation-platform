import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Upload, 
  Loader, 
  X,
  Zap,
  Clock,
  Info,
  Brain
} from 'lucide-react';

const Notification = ({ 
  uploadStatus, 
  errorMessage, 
  uploadProgress,
  autoHide = true,
  hideDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hideTimer, setHideTimer] = useState(null);

  // Show/hide notification based on status
  useEffect(() => {
    if (uploadStatus && uploadStatus !== 'reset') {
      setIsVisible(true);
      
      // Clear existing timer
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      
      // Auto-hide for success status
      if (autoHide && uploadStatus === 'success') {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, hideDelay);
        setHideTimer(timer);
      }
    } else {
      setIsVisible(false);
    }

    return () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
    };
  }, [uploadStatus, autoHide, hideDelay]);

  const handleClose = () => {
    setIsVisible(false);
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
  };

  const getNotificationConfig = () => {
    switch (uploadStatus) {
      case 'uploading':
        return {
          icon: Upload,
          iconClass: 'text-blue-600 animate-pulse',
          bgClass: 'bg-blue-50 border-blue-200',
          textClass: 'text-blue-800',
          title: 'Uploading Files',
          message: 'Your medical images are being uploaded to the server...',
          showProgress: true,
          showClose: false
        };
      
      case 'processing':
        return {
          icon: Brain,
          iconClass: 'text-purple-600',
          bgClass: 'bg-purple-50 border-purple-200',
          textClass: 'text-purple-800',
          title: 'AI Processing Started',
          message: 'Your images have been submitted for GPU processing.',
          showProgress: false,
          showClose: true,
          showSpinner: false
        };
      
      case 'success':
        return {
          icon: CheckCircle,
          iconClass: 'text-green-600',
          bgClass: 'bg-green-50 border-green-200',
          textClass: 'text-green-800',
          title: 'Analysis Complete!',
          message: 'Your cardiac images have been successfully processed and segmented.',
          showProgress: false,
          showClose: true
        };
      
      case 'error':
        return {
          icon: XCircle,
          iconClass: 'text-red-600',
          bgClass: 'bg-red-50 border-red-200',
          textClass: 'text-red-800',
          title: 'Upload Failed',
          message: errorMessage || 'An error occurred during upload. Please try again.',
          showProgress: false,
          showClose: true
        };
      
      default:
        return null;
    }
  };

  const config = getNotificationConfig();
  
  if (!config || !isVisible) {
    return null;
  }

  const progressSteps = [
    { label: 'Uploading', status: uploadStatus === 'uploading' ? 'active' : uploadProgress > 0 ? 'complete' : 'pending' },
    { label: 'Processing', status: uploadStatus === 'processing' ? 'active' : uploadStatus === 'success' ? 'complete' : 'pending' },
    { label: 'Analysis', status: uploadStatus === 'success' ? 'complete' : 'pending' }
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ 
          type: "spring", 
          stiffness: 500, 
          damping: 40,
          duration: 0.3 
        }}
        className="fixed bottom-6 right-6 z-50 max-w-md w-full mx-4 md:mx-0"
      >
        <div className={`p-4 rounded-xl border-2 backdrop-blur-sm shadow-xl ${config.bgClass}`}>
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`flex-shrink-0 ${config.iconClass}`}>
              {config.showSpinner ? (
                <Loader className="animate-spin" size={24} />
              ) : (
                <config.icon size={24} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className={`font-semibold ${config.textClass}`}>
                  {config.title}
                </h4>
                {config.showClose && (
                  <button
                    onClick={handleClose}
                    className={`ml-2 ${config.textClass} hover:opacity-70 transition-opacity`}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              
              <p className={`text-sm ${config.textClass} opacity-90 mb-3`}>
                {config.message}
              </p>

              {/* Progress Bar for Upload */}
              {config.showProgress && uploadProgress !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-blue-600">
                    <span>Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <motion.div 
                      className="bg-blue-600 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* Processing Status Message */}
              {uploadStatus === 'processing' && (
                <div className="space-y-2">
                  <div className="text-xs text-purple-600 bg-purple-100 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <Clock size={12} />
                      <span>Processing typically takes 2-10 minutes</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Details */}
              {uploadStatus === 'success' && (
                <div className="flex items-center gap-4 text-xs text-green-700 mt-2">
                  <div className="flex items-center gap-1">
                    <Zap size={12} />
                    <span>AI Powered</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle size={12} />
                    <span>High Accuracy</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>Real-time</span>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {uploadStatus === 'error' && errorMessage && (
                <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                  <div className="flex items-start gap-2">
                    <Info size={12} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Error Details:</p>
                      <p className="mt-1">{errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Actions */}
          {uploadStatus === 'error' && (
            <div className="mt-3 pt-3 border-t border-red-200">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Retry Upload
                </button>
              </div>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="flex justify-between items-center">
                <div className="text-xs text-green-600">
                  Ready to view results
                </div>
                <button
                  onClick={handleClose}
                  className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  View Analysis
                </button>
              </div>
            </div>
          )}

          {/* Processing Animation Background */}
          {uploadStatus === 'processing' && (
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse" />
              <motion.div
                className="absolute top-0 left-0 h-full w-1 bg-purple-400"
                animate={{
                  x: [0, 400, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Toast Notification Component for quick messages
export const Toast = ({ 
  message, 
  type = 'info', 
  isVisible, 
  onClose,
  duration = 3000 
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgClass: 'bg-green-600',
          textClass: 'text-white'
        };
      case 'error':
        return {
          icon: XCircle,
          bgClass: 'bg-red-600',
          textClass: 'text-white'
        };
      case 'warning':
        return {
          icon: AlertCircle,
          bgClass: 'bg-yellow-600',
          textClass: 'text-white'
        };
      default:
        return {
          icon: Info,
          bgClass: 'bg-blue-600',
          textClass: 'text-white'
        };
    }
  };

  const config = getToastConfig();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          className="fixed top-6 right-6 z-50 max-w-sm"
        >
          <div className={`p-4 rounded-lg shadow-lg ${config.bgClass}`}>
            <div className="flex items-center gap-3">
              <config.icon size={20} className={config.textClass} />
              <p className={`font-medium ${config.textClass}`}>{message}</p>
              <button
                onClick={onClose}
                className={`ml-auto ${config.textClass} hover:opacity-70`}
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notification;
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Notification = ({ uploadStatus, errorMessage, uploadProgress, onClose }) => {
  return (
    <AnimatePresence>
      {uploadStatus && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className={`fixed bottom-6 right-6 p-4 rounded-lg shadow-lg flex items-center ${
            uploadStatus === 'success' ? 'bg-green-50 text-green-800' :
            uploadStatus === 'error' ? 'bg-red-50 text-red-800' :
            'bg-blue-50 text-blue-800'
          }`}
        >
          {uploadStatus === 'success' && (
            <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" className="h-6 w-6 mr-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}

          {uploadStatus === 'error' && (
            <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" className="h-6 w-6 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}

          {uploadStatus === 'uploading' && (
            <div className="h-6 w-6 mr-3 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
          )}

          <div>
            <h4 className="font-medium">
              {uploadStatus === 'success' && 'Upload Complete!'}
              {uploadStatus === 'error' && 'Upload Failed'}
              {uploadStatus === 'uploading' && 'Uploading Files...'}
            </h4>
            <p className="text-sm opacity-90">
              {uploadStatus === 'success' && 'Your files are being processed.'}
              {uploadStatus === 'error' && errorMessage}
              {uploadStatus === 'uploading' && `${uploadProgress}% complete`}
            </p>
          </div>

          <button
            onClick={onClose}
            className="ml-6 p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors duration-200"
          >
            <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notification;
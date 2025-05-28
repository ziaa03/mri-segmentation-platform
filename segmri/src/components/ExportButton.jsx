import React from 'react';
import api from '../api/AxiosInstance';

const ExportButton = ({ projectId }) => {
  const handleExport = async () => {
    try {
      const response = await api.get(`/segmentation/export-project-data/${projectId}`, {
        withCredentials: true,
      });

      if (response.data?.success && response.data?.exportPackageUrl) {
        window.open(response.data.exportPackageUrl, '_blank');
      } else {
        alert('Export failed: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export project data.');
    }
  };

  return (
    <button
      onClick={handleExport}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
    >
      Export Project
    </button>
  );
};

export default ExportButton;

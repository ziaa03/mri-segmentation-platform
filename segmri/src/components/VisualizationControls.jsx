import React from 'react';

const VisualizationControls = ({
  currentTimeIndex,
  maxTimeIndex,
  currentLayerIndex,
  maxLayerIndex,
  onTimeSliderChange,
  onLayerSliderChange,
  onSave,
  onExport,
  projectName,
  projectDescription,
  setProjectName,
  setProjectDescription
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-medium mb-6 text-[#3A4454]">Slice & Frame Controls</h3>
      
      {/* Project Details */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">Description</label>
        <textarea
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Slice Control */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">Slice</label>
          <span className="text-sm text-gray-500">{currentLayerIndex + 1}/{maxLayerIndex + 1}</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxLayerIndex}
          value={currentLayerIndex}
          onChange={onLayerSliderChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1</span>
          <span>{Math.floor(maxLayerIndex / 2) + 1}</span>
          <span>{maxLayerIndex + 1}</span>
        </div>
      </div>

      {/* Frame Control */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">Frame</label>
          <span className="text-sm text-gray-500">{currentTimeIndex + 1}/{maxTimeIndex + 1}</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxTimeIndex}
          value={currentTimeIndex}
          onChange={onTimeSliderChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1</span>
          <span>{Math.floor(maxTimeIndex / 2) + 1}</span>
          <span>{maxTimeIndex + 1}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col space-y-3">
        <button
          onClick={onSave}
          className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          Save
        </button>
        
        <button
          onClick={onExport}
          className="flex items-center justify-center w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
      </div>
    </div>
  );
};

export default VisualizationControls;
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const AISegmentationDisplay = ({
  currentTimeIndex,
  currentLayerIndex,
  segmentationData,
  segmentItems = [],
  onMaskSelected,
  selectedMask
}) => {
  const [loading, setLoading] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [maskSrc, setMaskSrc] = useState(null);
  const [error, setError] = useState(null);
  const [visibleSegments, setVisibleSegments] = useState([]);

  // Initialize visible segments based on available segment items
  useEffect(() => {
    if (segmentItems.length > 0) {
      setVisibleSegments(segmentItems.map(item => item.id));
    }
  }, [segmentItems]);

  // Load image and mask when indices change
  useEffect(() => {
    const fetchImages = async () => {
      if (!segmentationData) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Check if we have mask data for the current indices
        if (segmentationData.masks && 
            segmentationData.masks[currentTimeIndex] && 
            segmentationData.masks[currentTimeIndex][currentLayerIndex]) {
          
          // Get base image URL
          const baseImgUrl = segmentationData.masks[currentTimeIndex][currentLayerIndex].baseImage;
          
          // Get mask URL
          const maskUrl = segmentationData.masks[currentTimeIndex][currentLayerIndex].maskImage;
          
          // Load both images
          setImageSrc(baseImgUrl);
          setMaskSrc(maskUrl);
        } else {
          setError('Image not available for the selected frame and slice');
        }
      } catch (err) {
        console.error('Failed to load segmentation images:', err);
        setError('Failed to load images');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [currentTimeIndex, currentLayerIndex, segmentationData]);

  const handleSegmentToggle = (segId) => {
    setVisibleSegments(prev => {
      if (prev.includes(segId)) {
        return prev.filter(id => id !== segId);
      } else {
        return [...prev, segId];
      }
    });
  };

  const handleAddSegment = () => {
    // This would typically open a dialog to add a new segment
    alert('Add segment functionality would be implemented here');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-xl font-medium mb-6 text-[#3A4454]">AI Segmentation</h3>
      
      {/* Image Display Area */}
      <div className="relative w-full h-80 bg-gray-100 rounded-lg mb-6 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-red-500">{error}</p>
          </div>
        )}
        
        {imageSrc && (
          <img 
            src={imageSrc} 
            alt={`Frame ${currentTimeIndex + 1}, Slice ${currentLayerIndex + 1}`}
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
        
        {maskSrc && visibleSegments.length > 0 && (
          <img 
            src={maskSrc} 
            alt="Segmentation mask"
            className="absolute inset-0 w-full h-full object-contain opacity-60"
          />
        )}
        
        {/* Display bounding boxes if available */}
        {segmentationData?.boundingBoxes && 
         segmentationData.boundingBoxes[currentTimeIndex] && 
         segmentationData.boundingBoxes[currentTimeIndex][currentLayerIndex] && (
          <div className="absolute inset-0">
            {segmentationData.boundingBoxes[currentTimeIndex][currentLayerIndex]
              .filter(box => visibleSegments.includes(box.class))
              .map((box, index) => (
                <div 
                  key={index}
                  className="absolute border-2 border-blue-500"
                  style={{
                    left: `${box.x}px`,
                    top: `${box.y}px`,
                    width: `${box.width}px`,
                    height: `${box.height}px`,
                  }}
                  onClick={() => onMaskSelected({
                    id: box.class,
                    boundingBox: box,
                    timeIndex: currentTimeIndex,
                    layerIndex: currentLayerIndex
                  })}
                >
                  <div className="absolute top-0 left-0 transform -translate-y-full bg-blue-500 text-white text-xs px-1 rounded">
                    {box.class} ({Math.round(box.confidence * 100)}%)
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>
      
      {/* Segmentation Items List */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Segmentation Items</h4>
          <span className="text-xs text-gray-500">(Click to select)</span>
        </div>
        
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
          {segmentItems.length === 0 ? (
            <p className="text-sm text-gray-500 p-3">No segmentation items available</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {segmentItems.map((item, index) => (
                <li 
                  key={index}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                    selectedMask?.id === item.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onMaskSelected({
                    id: item.id,
                    name: item.name,
                    timeIndex: currentTimeIndex,
                    layerIndex: currentLayerIndex
                  })}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={visibleSegments.includes(item.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSegmentToggle(item.id);
                      }}
                      className="mr-2 h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">{item.name || item.id}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <div 
                      className="h-3 w-3 rounded-full mr-1" 
                      style={{ backgroundColor: item.color || '#3B82F6' }}
                    ></div>
                    <span className="text-xs text-gray-500">
                      {item.confidenceScore ? `${Math.round(item.confidenceScore * 100)}%` : ''}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Add Segment Button */}
        <button
          onClick={handleAddSegment}
          className="mt-2 flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 mr-1" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add segment
        </button>
      </div>
      
      <div className="text-xs text-gray-500 italic">
        This panel displays AI-generated segmentation results (read-only)
      </div>
    </div>
  );
};

export default AISegmentationDisplay;
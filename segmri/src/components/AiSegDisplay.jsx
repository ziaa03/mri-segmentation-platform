import React, { useRef, useEffect, useState } from 'react';
import { decodeRLE, renderMaskOnCanvas } from '../utils/RLE-Decoder';

const AISegmentationDisplay = ({
  segmentationData,
  currentTimeIndex,
  currentLayerIndex,
  segmentItems,
  onMaskSelected,
  selectedMask
}) => {
  const canvasRef = useRef(null);
  const [visibleMasks, setVisibleMasks] = useState({});

  // Get current slice data (matches your existing data structure)
  const getCurrentSliceData = () => {
    if (!segmentationData?.masks?.[currentTimeIndex]?.[currentLayerIndex]) {
      return null;
    }
    return segmentationData.masks[currentTimeIndex][currentLayerIndex];
  };

  // Render masks when data changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sliceData = getCurrentSliceData();
    if (!sliceData) return;

    const ctx = canvas.getContext('2d');
    const width = 512;
    const height = 512;
    
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background (you could load actual DICOM image here)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Render each segmentation mask
    sliceData.segmentationMasks?.forEach(maskData => {
      const maskId = `${maskData.class}_${currentTimeIndex}_${currentLayerIndex}`;
      
      // Check if mask should be visible (default to true)
      if (visibleMasks[maskId] !== false && maskData.rle) {
        try {
          // Decode RLE data
          const binaryMask = decodeRLE(maskData.rle, width, height);
          
          // Get color for this class
          const classColor = getClassColor(maskData.class);
          
          // Render mask on canvas
          renderMaskOnCanvas(canvas, binaryMask, width, height, classColor);
          
        } catch (error) {
          console.error('Error decoding RLE for mask:', maskData.class, error);
        }
      }
    });

  }, [segmentationData, currentTimeIndex, currentLayerIndex, visibleMasks]);

  // Get class color (matches your existing color scheme)
  const getClassColor = (className) => {
    const classColors = {
      'RV': '#FF6B6B',    // Red for Right Ventricle
      'LVC': '#4ECDC4',   // Teal for Left Ventricle Cavity  
      'MYO': '#45B7D1'    // Blue for Myocardium
    };
    return classColors[className] || '#FFD93D';
  };

  // Toggle mask visibility
  const toggleMaskVisibility = (maskId) => {
    setVisibleMasks(prev => ({
      ...prev,
      [maskId]: !prev[maskId]
    }));
  };

  // Handle mask selection
  const handleMaskClick = (maskData) => {
    if (onMaskSelected) {
      onMaskSelected({
        ...maskData,
        frameIndex: currentTimeIndex,
        sliceIndex: currentLayerIndex
      });
    }
  };

  const sliceData = getCurrentSliceData();
  const availableMasks = sliceData?.segmentationMasks || [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h4 className="text-lg font-medium text-gray-900">
          AI Segmentation Display
        </h4>
        <p className="text-sm text-gray-600">
          Frame: {currentTimeIndex + 1}, Slice: {currentLayerIndex + 1}
        </p>
      </div>

      <div className="p-4">
        {/* Canvas for displaying masks */}
        <div className="mb-4">
          <canvas
            ref={canvasRef}
            className="border border-gray-300 rounded-lg cursor-pointer max-w-full h-auto"
            style={{ backgroundColor: '#000' }}
          />
        </div>

        {/* Mask controls */}
        {availableMasks.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-gray-700">Segmentation Masks:</h5>
            {availableMasks.map((mask, index) => {
              const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
              const isVisible = visibleMasks[maskId] !== false;
              
              return (
                <div key={maskId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div 
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={() => handleMaskClick(mask)}
                  >
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: getClassColor(mask.class) }}
                    />
                    <span className="text-sm font-medium">{mask.class}</span>
                    {mask.confidence && (
                      <span className="text-xs text-gray-500">
                        ({(mask.confidence * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleMaskVisibility(maskId)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      isVisible 
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {isVisible ? 'Hide' : 'Show'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* No masks available */}
        {availableMasks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No segmentation masks available for this frame/slice</p>
            <p className="text-sm mt-1">
              Frame {currentTimeIndex + 1}, Slice {currentLayerIndex + 1}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISegmentationDisplay;
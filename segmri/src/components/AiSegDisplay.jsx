import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Settings, Download, Layers } from 'lucide-react';

const AISegmentationDisplay = ({
  currentTimeIndex = 0,
  currentLayerIndex = 0,
  segmentationData,
  segmentItems = [],
  onMaskSelected,
  selectedMask
}) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [visibleSegments, setVisibleSegments] = useState([]);
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);
  const [viewMode, setViewMode] = useState('overlay'); // 'overlay', 'side-by-side', 'original'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [windowLevel, setWindowLevel] = useState({ level: 127, width: 255 });
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [syntheticImage, setSyntheticImage] = useState(null);

  // Hardcoded realistic cardiac MRI segmentation data
  const hardcodedSegmentItems = [
    {
      id: 'lv_endo',
      name: 'LV Endocardium',
      color: '#FF6B6B',
      confidenceScore: 0.94,
      volume: 68.2,
      area: 15.3,
      visible: true
    },
    {
      id: 'lv_epi',
      name: 'LV Epicardium',
      color: '#4ECDC4',
      confidenceScore: 0.91,
      volume: 134.7,
      area: 28.6,
      visible: true
    },
    {
      id: 'rv_endo',
      name: 'RV Endocardium',
      color: '#45B7D1',
      confidenceScore: 0.89,
      volume: 72.1,
      area: 18.9,
      visible: true
    },
    {
      id: 'la',
      name: 'Left Atrium',
      color: '#F7DC6F',
      confidenceScore: 0.87,
      volume: 45.3,
      area: 12.1,
      visible: false
    },
    {
      id: 'ra',
      name: 'Right Atrium',
      color: '#BB8FCE',
      confidenceScore: 0.85,
      volume: 41.8,
      area: 11.7,
      visible: false
    },
    {
      id: 'aorta',
      name: 'Ascending Aorta',
      color: '#F1948A',
      confidenceScore: 0.92,
      volume: 8.4,
      area: 3.2,
      visible: false
    }
  ];

  const activeSegments = segmentItems.length > 0 ? segmentItems : hardcodedSegmentItems;

  // Initialize visible segments
  useEffect(() => {
    if (activeSegments.length > 0) {
      setVisibleSegments(activeSegments.filter(segment => segment.visible).map(s => s.id));
    }
  }, [segmentItems, activeSegments]);

  // Generate synthetic MRI image
  const generateMRIImage = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 512;
    
    // Create gradient background
    const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 250);
    gradient.addColorStop(0, '#666');
    gradient.addColorStop(0.3, '#444');
    gradient.addColorStop(0.7, '#222');
    gradient.addColorStop(1, '#111');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add some noise for realism
    const imageData = ctx.getImageData(0, 0, 512, 512);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 30 - 15;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Draw heart-like structures
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.ellipse(200, 250, 80, 60, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#777';
    ctx.beginPath();
    ctx.ellipse(320, 280, 60, 45, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    return canvas.toDataURL();
  };

  // Generate the synthetic image on component mount
  useEffect(() => {
    setSyntheticImage(generateMRIImage());
  }, []);

  const drawSegmentationOverlay = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw segmentation masks for visible segments
    activeSegments.forEach(segment => {
      if (visibleSegments.includes(segment.id)) {
        ctx.globalAlpha = overlayOpacity;
        ctx.fillStyle = segment.color;
        
        // Generate mock segmentation mask based on segment type
        switch (segment.id) {
          case 'lv_endo':
            ctx.beginPath();
            ctx.ellipse(200, 250, 40, 30, 0, 0, 2 * Math.PI);
            ctx.fill();
            break;
          case 'lv_epi':
            ctx.beginPath();
            ctx.ellipse(200, 250, 80, 60, 0, 0, 2 * Math.PI);
            ctx.globalCompositeOperation = 'source-over';
            ctx.fill();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.ellipse(200, 250, 45, 35, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            break;
          case 'rv_endo':
            ctx.beginPath();
            ctx.ellipse(320, 280, 30, 22, 0, 0, 2 * Math.PI);
            ctx.fill();
            break;
          case 'la':
            ctx.beginPath();
            ctx.ellipse(150, 180, 25, 20, 0, 0, 2 * Math.PI);
            ctx.fill();
            break;
          case 'ra':
            ctx.beginPath();
            ctx.ellipse(370, 200, 22, 18, 0, 0, 2 * Math.PI);
            ctx.fill();
            break;
          case 'aorta':
            ctx.beginPath();
            ctx.ellipse(220, 150, 15, 15, 0, 0, 2 * Math.PI);
            ctx.fill();
            break;
        }
      }
    });
    
    ctx.globalAlpha = 1;
  };

  // Draw overlay when dependencies change
  useEffect(() => {
    if (canvasRef.current && syntheticImage) {
      drawSegmentationOverlay();
    }
  }, [visibleSegments, overlayOpacity, segmentItems, activeSegments, syntheticImage]);

  const toggleSegmentVisibility = (segmentId) => {
    setVisibleSegments(prev => 
      prev.includes(segmentId) 
        ? prev.filter(id => id !== segmentId)
        : [...prev, segmentId]
    );
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.1));
  };

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSegmentClick = (segment) => {
    if (onMaskSelected) {
      onMaskSelected(segment);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Main Image Display */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="relative"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {syntheticImage && (
              <img
                ref={imageRef}
                src={syntheticImage}
                alt="MRI Scan"
                className="max-w-none"
                style={{ width: '512px', height: '512px' }}
              />
            )}
            {viewMode === 'overlay' && (
              <canvas
                ref={canvasRef}
                width={512}
                height={512}
                className="absolute top-0 left-0 pointer-events-none"
              />
            )}
          </div>
        </div>
        
        {/* Controls Overlay */}
        <div className="absolute top-4 left-4 flex gap-2">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
          >
            <ZoomOut size={20} />
          </button>
          <button
            onClick={resetView}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="absolute top-4 right-4 flex gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="p-2 bg-gray-800 text-white rounded-lg"
          >
            <option value="overlay">Overlay</option>
            <option value="side-by-side">Side by Side</option>
            <option value="original">Original</option>
          </select>
        </div>

        {/* Opacity Control */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-gray-800 p-3 rounded-lg">
          <span className="text-sm">Opacity:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={overlayOpacity}
            onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
            className="w-20"
          />
          <span className="text-sm w-8">{Math.round(overlayOpacity * 100)}%</span>
        </div>
      </div>

      {/* Segments Panel */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Layers size={20} />
            Segmentation Results
          </h3>
        </div>
        
        <div className="p-4 space-y-3">
          {activeSegments.map(segment => (
            <div
              key={segment.id}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMask === segment.id 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-transparent bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => handleSegmentClick(segment)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="font-medium">{segment.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSegmentVisibility(segment.id);
                  }}
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  {visibleSegments.includes(segment.id) ? (
                    <Eye size={16} />
                  ) : (
                    <EyeOff size={16} />
                  )}
                </button>
              </div>
              
              <div className="text-sm text-gray-300 space-y-1">
                <div className="flex justify-between">
                  <span>Confidence:</span>
                  <span className="font-mono">{(segment.confidenceScore * 100).toFixed(1)}%</span>
                </div>
                {showMeasurements && (
                  <>
                    <div className="flex justify-between">
                      <span>Volume:</span>
                      <span className="font-mono">{segment.volume.toFixed(1)} ml</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Area:</span>
                      <span className="font-mono">{segment.area.toFixed(1)} cm²</span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Confidence bar */}
              <div className="mt-2 w-full bg-gray-600 rounded-full h-1">
                <div
                  className="bg-green-500 h-1 rounded-full transition-all"
                  style={{ width: `${segment.confidenceScore * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Statistics Summary */}
        <div className="p-4 border-t border-gray-700">
          <h4 className="font-semibold mb-2">Summary</h4>
          <div className="text-sm text-gray-300 space-y-1">
            <div className="flex justify-between">
              <span>Total segments:</span>
              <span>{activeSegments.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Visible:</span>
              <span>{visibleSegments.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg confidence:</span>
              <span>
                {(activeSegments.reduce((sum, s) => sum + s.confidenceScore, 0) / activeSegments.length * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISegmentationDisplay;
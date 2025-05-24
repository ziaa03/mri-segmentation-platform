import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eye, EyeOff, Download, Upload, Info, RotateCcw, ZoomIn, ZoomOut, Play, Pause, Grid, Layers } from 'lucide-react';
import Untar from "untar.js";
import * as daikon from "daikon";

// Enhanced RLE Decoder utility functions
const decodeRLE = (rleString, height, width) => {
  console.log('=== RLE DECODING START ===');
  console.log('Input:', { rleString: rleString?.substring(0, 100) + '...', height, width });
  
  if (!rleString || typeof rleString !== 'string') {
    console.warn('Invalid RLE string provided');
    return new Uint8Array(height * width);
  }

  const size = height * width;
  const mask = new Uint8Array(size);

  try {
    // Your RLE format: "startIdx length startIdx length ..."
    const values = rleString.trim().split(/\s+/).map(x => parseInt(x, 10)).filter(x => !isNaN(x));
    
    console.log('RLE values count:', values.length);
    console.log('First 10 values:', values.slice(0, 10));
    
    if (values.length % 2 !== 0) {
      console.warn('RLE data length is not even, may be incomplete');
    }
    
    let totalPixelsFilled = 0;
    
    // Process pairs of (startIndex, length)
    for (let i = 0; i < values.length - 1; i += 2) {
      const startIdx = values[i];
      const runLength = values[i + 1];
      
      if (startIdx < 0 || startIdx >= size) {
        console.warn(`Start index ${startIdx} out of bounds for image size ${size}`);
        continue;
      }
      
      const endIdx = Math.min(startIdx + runLength, size);
      
      // Fill the mask
      for (let j = startIdx; j < endIdx; j++) {
        if (j < size) {
          mask[j] = 1;
          totalPixelsFilled++;
        }
      }
    }
    
    console.log('RLE decode results:', {
      totalPixelsFilled,
      percentage: ((totalPixelsFilled / size) * 100).toFixed(2) + '%',
      imageSize: `${width}x${height}`,
      totalPixels: size
    });
    
    return mask;
    
  } catch (error) {
    console.error('Error decoding RLE:', error);
    return new Uint8Array(size);
  }
};

const renderMaskOnCanvas = (canvas, binaryMask, width, height, color, opacity = 0.6) => {
  console.log('=== MASK RENDERING START ===');
  console.log('Canvas:', canvas);
  console.log('Mask size:', binaryMask.length);
  console.log('Expected size:', width * height);
  console.log('Color:', color);
  console.log('Opacity:', opacity);

  if (!canvas) {
    console.error('Canvas is null or undefined');
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get canvas context');
    return;
  }

  // Ensure canvas dimensions are set
  if (canvas.width !== width || canvas.height !== height) {
    console.log('Setting canvas dimensions:', { width, height });
    canvas.width = width;
    canvas.height = height;
  }

  try {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Parse color
    const hexColor = color.replace('#', '');
    const r = parseInt(hexColor.substr(0, 2), 16) || 255;
    const g = parseInt(hexColor.substr(2, 2), 16) || 0;
    const b = parseInt(hexColor.substr(4, 2), 16) || 0;
    const alpha = Math.floor(255 * opacity);

    console.log('Color values:', { r, g, b, alpha });

    let pixelCount = 0;
    let firstPixelPos = -1;
    let lastPixelPos = -1;

    // Fill the image data
    for (let i = 0; i < binaryMask.length && i < width * height; i++) {
      if (binaryMask[i] === 1) {
        const pixelIndex = i * 4;
        if (pixelIndex + 3 < data.length) {
          data[pixelIndex] = r;         // Red
          data[pixelIndex + 1] = g;     // Green
          data[pixelIndex + 2] = b;     // Blue
          data[pixelIndex + 3] = alpha; // Alpha
          pixelCount++;
          
          if (firstPixelPos === -1) firstPixelPos = i;
          lastPixelPos = i;
        }
      }
    }

    console.log('Mask rendering stats:', {
      pixelCount,
      firstPixelPos,
      lastPixelPos,
      firstPixelCoords: firstPixelPos >= 0 ? {
        x: firstPixelPos % width,
        y: Math.floor(firstPixelPos / width)
      } : null
    });

    if (pixelCount > 0) {
      ctx.putImageData(imageData, 0, 0);
      console.log('✅ Mask rendered successfully');
    } else {
      console.warn('⚠️ No pixels were rendered (pixelCount = 0)');
    }
    
  } catch (error) {
    console.error('Error rendering mask on canvas:', error);
  }
};

const AISegmentationDisplay = ({
  segmentationData,
  currentTimeIndex,
  currentLayerIndex,
  segmentItems,
  onMaskSelected,
  selectedMask,
  onUploadSelectedMask,
  projectId
}) => {
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const [visibleMasks, setVisibleMasks] = useState({});
  const [maskOpacity, setMaskOpacity] = useState(0.7);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [showStats, setShowStats] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(500);

  // PRESIGNED URL for DICOM images
  // State for DICOM images
  const [dicomImages, setDicomImages] = useState([]);
  const [dicomLoading, setDicomLoading] = useState(false);

  // Fetch and extract DICOMs on mount or when projectId changes
  useEffect(() => {
    if (!projectId) return;
    setDicomLoading(true);

    // Use Axios instead of fetch
    api.get(`/project/get-project-presigned-url`, {
      params: { projectId },
      withCredentials: true
    })
      .then(async response => {
        const data = response.data;
        if (!data.success) throw new Error("Failed to get presigned URL");
        // Download TAR file as ArrayBuffer
        const tarRes = await fetch(data.presignedUrl);
        const tarBuffer = await tarRes.arrayBuffer();

        // Extract TAR in browser
        const files = await Untar(tarBuffer);
        const dicomFiles = files.filter(f => f.name.endsWith(".dcm"));

        // Parse DICOMs using daikon
        const images = [];
        for (const file of dicomFiles) {
          try {
            const data = new DataView(file.buffer);
            const image = daikon.Series.parseImage(new daikon.File([data]));
            if (image) images.push(image);
          } catch (e) {
            // skip invalid files
          }
        }
        setDicomImages(images);
        setDicomLoading(false);
      })
      .catch(() => setDicomLoading(false));
  }, [projectId]);


  // Get current slice data with proper error handling
  const getCurrentSliceData = () => {
    if (!segmentationData?.masks?.[currentTimeIndex]?.[currentLayerIndex]) {
      return null;
    }
    return segmentationData.masks[currentTimeIndex][currentLayerIndex];
  };

  // Enhanced color palette for medical imaging
  const getClassColor = (className) => {
    const classColors = {
      'RV': '#FF6B6B',    // Red for Right Ventricle
      'LV': '#4ECDC4',    // Teal for Left Ventricle
      'LVC': '#45B7D1',   // Blue for Left Ventricle Cavity  
      'MYO': '#FFA726',   // Orange for Myocardium
      'LA': '#9C27B0',    // Purple for Left Atrium
      'RA': '#FF5722',    // Deep orange for Right Atrium
      'AORTA': '#E91E63', // Pink for Aorta
      'PA': '#795548'     // Brown for Pulmonary Artery
    };
    
    // Fallback to dynamic color generation
    if (!classColors[className]) {
      const hash = className.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const hue = Math.abs(hash) % 360;
      return `hsl(${hue}, 70%, 55%)`;
    }
    
    return classColors[className];
  };

  // Enhanced background rendering with realistic cardiac imaging simulation
  const renderBackground = useCallback((ctx, width, height) => {
    if (dicomImages.length > 0) {
      // Pick the correct slice (e.g., currentLayerIndex)
      const image = dicomImages[currentLayerIndex % dicomImages.length];
      if (image) {
        // Convert pixel data to ImageData and draw
        const pixels = image.getInterpretedData();
        const imgData = ctx.createImageData(width, height);
        for (let i = 0; i < pixels.length; i++) {
          const val = pixels[i];
          imgData.data[i * 4 + 0] = val; // R
          imgData.data[i * 4 + 1] = val; // G
          imgData.data[i * 4 + 2] = val; // B
          imgData.data[i * 4 + 3] = 255; // A
        }
        ctx.putImageData(imgData, 0, 0);
        return;
      }
    }
    // fallback: draw gray background
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, width, height);
  }, [dicomImages, currentLayerIndex]);

  // Main render function
  const renderCanvas = useCallback(() => {
  console.log('=== CANVAS RENDERING START ===');
  
  const canvas = canvasRef.current;
  const overlayCanvas = overlayCanvasRef.current;
  
  console.log('Canvas refs:', { 
    canvas: !!canvas, 
    overlayCanvas: !!overlayCanvas,
    canvasWidth: canvas?.width,
    canvasHeight: canvas?.height
  });

  if (!canvas || !overlayCanvas) {
    console.error('Canvas references not available');
    return;
  }

  const sliceData = getCurrentSliceData();
  console.log('Current slice data:', sliceData);
  console.log('Current indices:', { currentTimeIndex, currentLayerIndex });
  console.log('Available masks:', sliceData?.segmentationMasks?.length || 0);

  const ctx = canvas.getContext('2d');
  const overlayCtx = overlayCanvas.getContext('2d');
  const width = 512;
  const height = 512;
  
  // Set canvas dimensions
  canvas.width = width;
  canvas.height = height;
  overlayCanvas.width = width;
  overlayCanvas.height = height;
  
  console.log('Canvas dimensions set:', { width, height });
  
  // Render background
  renderBackground(ctx, width, height);
  
  // Clear overlay
  overlayCtx.clearRect(0, 0, width, height);
  console.log('Overlay cleared');

  if (!sliceData) {
    console.log('No slice data available - rendering background only');
    return;
  }

  console.log('Processing segmentation masks...');
  console.log('Visible masks state:', visibleMasks);

  // Render segmentation masks on overlay
  sliceData.segmentationMasks?.forEach((maskData, index) => {
    const maskId = `${maskData.class}_${currentTimeIndex}_${currentLayerIndex}`;
    const isVisible = visibleMasks[maskId] !== false;
    
    console.log(`Processing mask ${index + 1}/${sliceData.segmentationMasks.length}:`, {
      class: maskData.class,
      maskId: maskId,
      isVisible: isVisible,
      hasRLE: !!maskData.segmentationmaskcontents,
      rleLength: maskData.segmentationmaskcontents?.length || 0
    });
    
    if (isVisible) {
      try {
        const rleData = maskData.segmentationmaskcontents || maskData.rle;
        if (rleData) {
          console.log(`🎭 Rendering mask: ${maskData.class}`);
          console.log('RLE preview:', rleData.substring(0, 100) + '...');
          
          const binaryMask = decodeRLE(rleData, height, width);
          const classColor = getClassColor(maskData.class);
          
          console.log(`Rendering with color: ${classColor}, opacity: ${maskOpacity}`);
          renderMaskOnCanvas(overlayCanvas, binaryMask, width, height, classColor, maskOpacity);
        } else {
          console.warn(`❌ No RLE data found for mask: ${maskData.class}`);
        }
      } catch (error) {
        console.error(`❌ Error processing mask ${maskData.class}:`, error);
      }
    } else {
      console.log(`👁️‍🗨️ Mask ${maskData.class} is hidden`);
    }
  });

  // Render bounding boxes
  sliceData.boundingBoxes?.forEach((box, index) => {
    console.log(`Rendering bounding box ${index + 1}:`, box);
    
    if (box.x_min !== undefined && box.y_min !== undefined && 
        box.x_max !== undefined && box.y_max !== undefined) {
      
      overlayCtx.strokeStyle = getClassColor(box.class);
      overlayCtx.lineWidth = 3; // Make it more visible
      overlayCtx.strokeRect(box.x_min, box.y_min, box.x_max - box.x_min, box.y_max - box.y_min);
      
      // Add label with background
      overlayCtx.fillStyle = getClassColor(box.class);
      overlayCtx.font = 'bold 14px Arial';
      
      const textMetrics = overlayCtx.measureText(box.class);
      overlayCtx.fillRect(box.x_min, box.y_min - 25, textMetrics.width + 8, 20);
      
      overlayCtx.fillStyle = 'white';
      overlayCtx.fillText(box.class, box.x_min + 4, box.y_min - 10);
      
      console.log(`✅ Rendered bounding box for ${box.class}`);
    }
  });

  console.log('=== CANVAS RENDERING COMPLETE ===');
  
}, [segmentationData, currentTimeIndex, currentLayerIndex, visibleMasks, maskOpacity, renderBackground]);


// Test function to manually trigger a mask render (call this from browser console)
window.testMaskRender = () => {
  console.log('=== MANUAL MASK RENDER TEST ===');
  
  // Create test RLE data (your format)
  const testRLE = "23673 3 23927 12 24182 18 24437 23 24693 25";
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  
  const mask = decodeRLE(testRLE, 512, 512);
  renderMaskOnCanvas(canvas, mask, 512, 512, '#FF6B6B', 0.7);
  
  // Add to page for visual inspection
  canvas.style.border = '2px solid red';
  canvas.style.position = 'fixed';
  canvas.style.top = '10px';
  canvas.style.right = '10px';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);
  
  console.log('Test canvas added to page (top right)');
  
  setTimeout(() => {
    document.body.removeChild(canvas);
    console.log('Test canvas removed');
  }, 5000);
};


  // Render when data changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Auto-initialize visible masks
  useEffect(() => {
    const sliceData = getCurrentSliceData();
    if (sliceData?.segmentationMasks) {
      const newVisibleMasks = {};
      sliceData.segmentationMasks.forEach(mask => {
        const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
        if (!(maskId in visibleMasks)) {
          newVisibleMasks[maskId] = true;
        }
      });
      if (Object.keys(newVisibleMasks).length > 0) {
        setVisibleMasks(prev => ({ ...prev, ...newVisibleMasks }));
      }
    }
  }, [currentTimeIndex, currentLayerIndex, segmentationData]);

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

  // Mouse handlers for pan and zoom
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    setPanOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom handlers
  const handleZoom = (delta) => {
    setZoomLevel(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // Reset view
  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Download current mask
  const downloadMask = (maskData) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      
      const rleData = maskData.segmentationmaskcontents || maskData.rle;
      const binaryMask = decodeRLE(rleData, 512, 512);
      const imageData = ctx.createImageData(512, 512);
      const data = imageData.data;
      
      for (let i = 0; i < binaryMask.length; i++) {
        const pixelIndex = i * 4;
        const value = binaryMask[i] * 255;
        data[pixelIndex] = value;     // Red
        data[pixelIndex + 1] = value; // Green
        data[pixelIndex + 2] = value; // Blue
        data[pixelIndex + 3] = 255;   // Alpha
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Download
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mask_${maskData.class}_f${currentTimeIndex}_s${currentLayerIndex}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error downloading mask:', error);
    }
  };

  const sliceData = getCurrentSliceData();
  const availableMasks = sliceData?.segmentationMasks || [];
  const boundingBoxes = sliceData?.boundingBoxes || [];

  // Calculate statistics
  const maskStats = availableMasks.map(mask => {
    try {
      const rleData = mask.segmentationmaskcontents || mask.rle;
      const binaryMask = decodeRLE(rleData, 512, 512);
      const pixelCount = binaryMask.reduce((sum, pixel) => sum + pixel, 0);
      const area = pixelCount * 0.25; // Assuming pixel size of 0.5mm x 0.5mm
      const percentage = ((pixelCount / (512 * 512)) * 100).toFixed(1);
      return { ...mask, pixelCount, area, percentage };
    } catch {
      return { ...mask, pixelCount: 0, area: 0, percentage: 0 };
    }
  });

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Layers size={20} className="text-blue-600" />
              AI Segmentation Display
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Frame {currentTimeIndex + 1} • Slice {currentLayerIndex + 1} • 
              {availableMasks.length} masks • {boundingBoxes.length} boxes
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg transition-colors ${
                showGrid 
                  ? 'text-blue-600 bg-blue-100' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
              title="Toggle Grid"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-2 rounded-lg transition-colors ${
                showStats 
                  ? 'text-blue-600 bg-blue-100' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
              title="Toggle Statistics"
            >
              <Info size={18} />
            </button>
            <button
              onClick={resetView}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Reset View"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Main Canvas Area */}
        <div className="relative mb-6">
  <div 
    className="canvas-container relative border-2 border-gray-300 rounded-lg overflow-hidden bg-black shadow-inner"
    style={{
      width: '512px',
      height: '512px',
      transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
      transformOrigin: 'center center',
      cursor: isDragging ? 'grabbing' : 'grab'
    }}
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUp}
    onMouseLeave={handleMouseUp}
  >
    {/* Background canvas */}
    <canvas
      ref={canvasRef}
      className="background-canvas absolute top-0 left-0"
      width={512}
      height={512}
      style={{ 
        width: '512px', 
        height: '512px',
        display: 'block'
      }}
    />
    
    {/* Overlay canvas for masks */}
    <canvas
      ref={overlayCanvasRef}
      className="overlay-canvas absolute top-0 left-0"
      width={512}
      height={512}
      style={{ 
        width: '512px', 
        height: '512px',
        display: 'block',
        pointerEvents: 'auto'
      }}
    />
    
    {/* Debug overlay - remove in production */}
    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded">
      <div>Frame: {currentTimeIndex + 1}</div>
      <div>Slice: {currentLayerIndex + 1}</div>
      <div>Masks: {availableMasks.length}</div>
      <div>Zoom: {Math.round(zoomLevel * 100)}%</div>
    </div>
  </div>
          
          {/* Enhanced Controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <button
              onClick={() => handleZoom(0.2)}
              className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-lg shadow-md transition-all backdrop-blur-sm"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => handleZoom(-0.2)}
              className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-lg shadow-md transition-all backdrop-blur-sm"
            >
              <ZoomOut size={16} />
            </button>
            <div className="text-xs text-white bg-black/50 px-2 py-1 rounded text-center backdrop-blur-sm">
              {Math.round(zoomLevel * 100)}%
            </div>
          </div>

          {/* Enhanced Opacity Control */}
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-md border border-gray-200">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Mask Opacity
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={maskOpacity}
                onChange={(e) => setMaskOpacity(parseFloat(e.target.value))}
                className="w-24 accent-blue-500"
              />
              <span className="text-xs text-gray-600 min-w-[3ch]">
                {Math.round(maskOpacity * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Mask Controls */}
        {availableMasks.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-lg font-semibold text-gray-800">Segmentation Masks</h5>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  {availableMasks.filter((_, index) => {
                    const maskId = `${availableMasks[index].class}_${currentTimeIndex}_${currentLayerIndex}`;
                    return visibleMasks[maskId] !== false;
                  }).length} of {availableMasks.length} visible
                </div>
                <button
                  onClick={() => {
                    const allVisible = availableMasks.every((_, index) => {
                      const maskId = `${availableMasks[index].class}_${currentTimeIndex}_${currentLayerIndex}`;
                      return visibleMasks[maskId] !== false;
                    });
                    const newState = {};
                    availableMasks.forEach((mask, index) => {
                      const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
                      newState[maskId] = !allVisible;
                    });
                    setVisibleMasks(prev => ({ ...prev, ...newState }));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Toggle All
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {availableMasks.map((mask, index) => {
                const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
                const isVisible = visibleMasks[maskId] !== false;
                const isSelected = selectedMask?.class === mask.class;
                const stats = maskStats[index];
                
                return (
                  <div
                    key={maskId}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-blue-400 bg-blue-50 shadow-md' 
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center space-x-3 cursor-pointer flex-1"
                        onClick={() => handleMaskClick(mask)}
                      >
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white shadow-md flex-shrink-0"
                          style={{ backgroundColor: getClassColor(mask.class) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-800">{mask.class}</span>
                            {mask.confidence && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                {(mask.confidence * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                          {showStats && stats && (
                            <div className="text-xs text-gray-600 mt-1 space-y-1">
                              <div>{stats.pixelCount.toLocaleString()} pixels ({stats.percentage}% of image)</div>
                              <div>{stats.area.toFixed(1)} mm² estimated area</div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => downloadMask(mask)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download Mask"
                        >
                          <Download size={16} />
                        </button>
                        {onUploadSelectedMask && (
                          <button
                            onClick={() => onUploadSelectedMask(mask)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Upload to S3"
                          >
                            <Upload size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => toggleMaskVisibility(maskId)}
                          className={`p-2 rounded-lg transition-colors ${
                            isVisible 
                              ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                              : 'text-gray-400 bg-gray-100 hover:bg-gray-200'
                          }`}
                          title={isVisible ? 'Hide Mask' : 'Show Mask'}
                        >
                          {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Enhanced Bounding Boxes Info */}
        {boundingBoxes.length > 0 && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h5 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <Info size={16} />
              Detected Bounding Boxes ({boundingBoxes.length})
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-700">
              {boundingBoxes.map((box, index) => (
                <div key={index} className="bg-amber-100 p-2 rounded">
                  <div className="font-medium">{box.class}</div>
                  <div>
                    Position: ({box.x_min}, {box.y_min}) to ({box.x_max}, {box.y_max})
                  </div>
                  <div>
                    Size: {box.x_max - box.x_min}×{box.y_max - box.y_min}px
                  </div>
                  {box.confidence && (
                    <div>Confidence: {(box.confidence * 100).toFixed(1)}%</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No data message */}
        {availableMasks.length === 0 && boundingBoxes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Layers size={32} className="text-gray-400" />
            </div>
            <p className="text-lg font-medium">No segmentation data available</p>
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
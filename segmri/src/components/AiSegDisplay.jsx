import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eye, EyeOff, Download, Upload, Info, RotateCcw, ZoomIn, ZoomOut, Play, Pause, Grid, Layers, Square, Eraser, Brush, Trash2 } from 'lucide-react';
import api from '../api/AxiosInstance'; // Ensure this path is correct for your project structure
import { decodeRLE } from '../utils/RLE-Decoder'; // Assuming encodeRLE is not used in this component
import { renderMaskOnCanvas } from '../utils/RLE-Decoder';

// Placeholder for the medical image loading functions from your existing code
const fetchPresignedUrl = async (projectId) => {
  console.log('Fetching presigned URL for projectId:', projectId);
  try {
    const response = await api.get(`/project/get-project-presigned-url?projectId=${projectId}`);
    console.log('Response:', { status: response.status, data: response.data });
    const data = response.data;
    if (data && data.success === false) throw new Error(data.message || 'Backend returned an error');
    const presignedUrl = data?.presignedUrl || data?.url || data?.data?.presignedUrl;
    if (!presignedUrl) {
      console.error('No presigned URL found. Response keys:', Object.keys(data || {}));
      throw new Error('No presigned URL found in response');
    }
    console.log('Got presigned URL');
    return presignedUrl;
  } catch (error) {
    console.error('Error fetching presigned URL:', error);
    throw error;
  }
};

const parseTarFile = (buffer) => {
  const files = [];
  const view = new Uint8Array(buffer);
  let offset = 0;
  while (offset < view.length) {
    const header = view.slice(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    let nameBytes = header.slice(0, 100);
    let nameEnd = nameBytes.indexOf(0);
    if (nameEnd === -1) nameEnd = 100;
    const name = new TextDecoder().decode(nameBytes.slice(0, nameEnd));
    const sizeBytes = header.slice(124, 135);
    const sizeStr = new TextDecoder().decode(sizeBytes).replace(/\0/g, '').trim();
    const size = parseInt(sizeStr, 8) || 0;
    const typeFlag = header[156];
    const isRegularFile = typeFlag === 0 || typeFlag === 48;
    offset += 512;
    if (isRegularFile && size > 0 && name) {
      const fileData = view.slice(offset, offset + size);
      files.push({
        name: name,
        buffer: fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength),
        size: size
      });
    }
    offset += Math.ceil(size / 512) * 512;
  }
  return files;
};

const fetchAndExtractTarFile = async (presignedUrl) => {
  console.log('=== FETCHING TAR FILE ===');
  console.log('Presigned URL:', presignedUrl);
  try {
    const response = await fetch(presignedUrl);
    if (!response.ok) throw new Error(`Failed to fetch tar file: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    console.log('Tar file downloaded, size:', arrayBuffer.byteLength);
    const extractedFiles = parseTarFile(arrayBuffer);
    console.log('Files extracted:', extractedFiles.length);
    const imageFiles = extractedFiles.filter(file =>
      file.name && (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg') || file.name.toLowerCase().endsWith('.png'))
    );
    console.log('Image files found:', imageFiles.length, 'Sample names:', imageFiles.slice(0, 5).map(f => f.name));
    return imageFiles;
  } catch (error) {
    console.error('Error fetching/extracting tar file:', error);
    throw error;
  }
};

const processExtractedImages = (extractedFiles) => {
  console.log('=== PROCESSING EXTRACTED IMAGES ===');
  try {
    const processedImages = extractedFiles
      .filter(file => file.name.endsWith('.jpg') || file.name.endsWith('.jpeg'))
      .map(file => {
        const parts = file.name.split('_');
        if (parts.length < 4) { console.warn(`Unexpected filename format: ${file.name}`); return null; }
        const frameIdx = parseInt(parts[parts.length - 2]);
        const sliceIdx = parseInt(parts[parts.length - 1].split('.')[0]);
        if (isNaN(frameIdx) || isNaN(sliceIdx)) { console.warn(`Could not parse indices from filename: ${file.name}`); return null; }
        const blob = new Blob([file.buffer], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        return { name: file.name, frame: frameIdx, slice: sliceIdx, url: url, blob: blob, size: file.buffer.byteLength };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.frame !== b.frame) return a.frame - b.frame;
        return a.slice - b.slice;
      });
    console.log('Processed images:', { total: processedImages.length, frames: [...new Set(processedImages.map(img => img.frame))], slices: [...new Set(processedImages.map(img => img.slice))], sampleNames: processedImages.slice(0, 3).map(img => img.name) });
    return processedImages;
  } catch (error) {
    console.error('Error processing extracted images:', error);
    return [];
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
  const secondCanvasRef = useRef(null);
  const secondOverlayCanvasRef = useRef(null);

  // State for dynamic canvas dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 512, height: 512 });
  // State for image transformation (scaling, offset)
  const [imageTransform, setImageTransform] = useState(null);

  const [visibleMasks, setVisibleMasks] = useState({});
  const [maskOpacity, setMaskOpacity] = useState(0.7);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [showStats, setShowStats] = useState(true);

  // New states for toolbox controls
  const [selectedClass, setSelectedClass] = useState('MYO');
  const [selectedTool, setSelectedTool] = useState('brush');
  const [drawingHistory, setDrawingHistory] = useState([]);

  const [extractedImages, setExtractedImages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [availableFrames, setAvailableFrames] = useState([]);
  const [availableSlices, setAvailableSlices] = useState([]);

  // Class options for radio buttons
  const classOptions = [
    { value: 'MYO', label: 'MYO', color: '#FFA726' },
    { value: 'LV', label: 'LV', color: '#4ECDC4' },
    { value: 'RV', label: 'RV', color: '#FF6B6B' }
  ];

  // Tool options
  const toolOptions = [
    { value: 'brush', label: 'Brush', icon: Brush },
    { value: 'eraser', label: 'Eraser', icon: Eraser },
    { value: 'boundingbox', label: 'Bounding Box', icon: Square }
  ];

  // Fetch project dimensions when projectId changes
  useEffect(() => {
    const fetchDimensions = async () => {
      if (!projectId) {
        console.warn("AISegDisplay: No projectId, cannot fetch dimensions. Using defaults.");
        setCanvasDimensions({ width: 512, height: 512 });
        return;
      }
      try {
        console.log(`AISegDisplay: Fetching project info for dimensions, projectId: ${projectId}`);
        const response = await api.get(`/project/get-project-info/${projectId}`);
        if (response.data.success && response.data.project && response.data.project.dimensions) {
          const { width, height } = response.data.project.dimensions;
          if (width && height && width > 0 && height > 0) {
            console.log(`AISegDisplay: Dimensions received: ${width}x${height}`);
            setCanvasDimensions({ width, height });
          } else {
            console.warn(`AISegDisplay: Invalid dimensions received (w:${width}, h:${height}). Using defaults.`);
            setCanvasDimensions({ width: 512, height: 512 });
          }
        } else {
          console.error(`AISegDisplay: Failed to fetch project dimensions. Response:`, response.data);
          setCanvasDimensions({ width: 512, height: 512 });
        }
      } catch (error) {
        console.error(`AISegDisplay: Error fetching project dimensions for projectId ${projectId}:`, error);
        setCanvasDimensions({ width: 512, height: 512 });
      }
    };
    fetchDimensions();
  }, [projectId]);

  const renderImageToCanvas = useCallback((ctx, imageUrl, targetCanvasWidth, targetCanvasHeight, callback, currentSetImageTransform) => {
    console.log('=== RENDERING IMAGE TO CANVAS ===');
    console.log('Image URL:', imageUrl);
    console.log('Target Canvas dimensions:', { targetCanvasWidth, targetCanvasHeight });

    const img = new Image();
    img.crossOrigin = "anonymous"; // Important if images are from different origins (like S3 presigned URLs)

    img.onload = () => {
      try {
        console.log('Image loaded:', {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          targetSize: `${targetCanvasWidth}x${targetCanvasHeight}`
        });

        ctx.clearRect(0, 0, targetCanvasWidth, targetCanvasHeight);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetCanvasWidth, targetCanvasHeight);

        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = targetCanvasWidth / targetCanvasHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgAspect > canvasAspect) {
          drawWidth = targetCanvasWidth;
          drawHeight = targetCanvasWidth / imgAspect;
          offsetX = 0;
          offsetY = (targetCanvasHeight - drawHeight) / 2;
        } else {
          drawWidth = targetCanvasHeight * imgAspect;
          drawHeight = targetCanvasHeight;
          offsetX = (targetCanvasWidth - drawWidth) / 2;
          offsetY = 0;
        }

        if (currentSetImageTransform) {
          currentSetImageTransform({
            scaleX: drawWidth / img.naturalWidth,
            scaleY: drawHeight / img.naturalHeight,
            offsetX,
            offsetY,
            drawWidth,
            drawHeight,
            canvasWidthWhenCalculated: targetCanvasWidth,
            canvasHeightWhenCalculated: targetCanvasHeight,
            originalImageWidth: img.naturalWidth,
            originalImageHeight: img.naturalHeight
          });
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        console.log('✅ Image rendered successfully:', {
          drawSize: `${Math.round(drawWidth)}x${Math.round(drawHeight)}`,
          offset: `${Math.round(offsetX)}, ${Math.round(offsetY)}`
        });

        if (callback) callback();

      } catch (error) {
        console.error('Error rendering image:', error);
        if (callback) callback();
      }
    };

    img.onerror = (error) => {
      console.error('Error loading image:', error);
      if (callback) callback();
    };

    img.src = imageUrl;
  }, []);

  const renderFallbackBackground = useCallback((ctx, width, height) => {
    console.log('Rendering fallback background');
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    const mainRadiusX = Math.min(width, height) * 0.25;
    const mainRadiusY = Math.min(width, height) * 0.20;
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, mainRadiusX, mainRadiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-mainRadiusX * 0.25, -mainRadiusY * 0.1, mainRadiusX * 0.5, mainRadiusY * 0.4, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(mainRadiusX * 0.25, -mainRadiusY * 0.1, mainRadiusX * 0.4, mainRadiusY * 0.3, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-width / 2, 0); ctx.lineTo(width / 2, 0);
    ctx.moveTo(0, -height / 2); ctx.lineTo(0, height / 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '12px Arial';
    ctx.fillText(`${width}x${height}`, 10, height - 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No Image Available', width / 2, height / 2 + mainRadiusY + 20);
    ctx.textAlign = 'left';
  }, []);

  const getCurrentSliceData = useCallback(() => {
    if (!segmentationData?.masks?.[currentTimeIndex]?.[currentLayerIndex]) {
      return null;
    }
    return segmentationData.masks[currentTimeIndex][currentLayerIndex];
  }, [segmentationData, currentTimeIndex, currentLayerIndex]);

  const getClassColor = useCallback((className) => {
    const classColors = {
      'RV': '#FF6B6B', 'LV': '#4ECDC4', 'LVC': '#45B7D1',
      'MYO': '#FFA726', 'LA': '#9C27B0', 'RA': '#FF5722',
      'AORTA': '#E91E63', 'PA': '#795548'
    };
    if (!classColors[className]) {
      const hash = className.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
      const hue = Math.abs(hash) % 360;
      return `hsl(${hue}, 70%, 55%)`;
    }
    return classColors[className];
  }, []);

  const renderBackground = useCallback((ctx, width, height) => {
    console.log('Rendering background:', { width, height, hasCurrentImage: !!currentImage, currentFrame: currentTimeIndex, currentSlice: currentLayerIndex });
    if (currentImage && currentImage.url) {
      renderImageToCanvas(ctx, currentImage.url, width, height, null, setImageTransform);
    } else {
      renderFallbackBackground(ctx, width, height);
      setImageTransform(null); // Reset transform if no image
    }
    console.log('Background rendered successfully');
  }, [currentImage, currentTimeIndex, currentLayerIndex, renderImageToCanvas, renderFallbackBackground, setImageTransform]);

  const renderCanvas = useCallback((canvasRef, overlayCanvasRef) => {
    console.log('=== CANVAS RENDERING START ===');
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    if (!canvas || !overlayCanvas) {
      console.error('Canvas references not available');
      return;
    }

    const { width, height } = canvasDimensions; // Use dynamic dimensions

    // Set canvas drawing surface dimensions
    canvas.width = width;
    canvas.height = height;
    overlayCanvas.width = width;
    overlayCanvas.height = height;

    console.log('Canvas dimensions set for drawing:', { width, height });

    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');

    renderBackground(ctx, width, height);
    overlayCtx.clearRect(0, 0, width, height);

    const sliceData = getCurrentSliceData();
    if (!sliceData) {
      console.log('No slice data available - rendering background only');
      return;
    }

    console.log('Processing segmentation masks...');
    sliceData.segmentationMasks?.forEach((maskData) => {
      const maskId = `${maskData.class}_${currentTimeIndex}_${currentLayerIndex}`;
      const isVisible = visibleMasks[maskId] !== false;

      if (isVisible) {
        try {
          const rleData = maskData.segmentationmaskcontents || maskData.rle;
          if (rleData) {
            const binaryMask = decodeRLE(rleData, height, width); // Use dynamic dimensions
            const classColor = getClassColor(maskData.class);
            renderMaskOnCanvas(overlayCanvas, binaryMask, width, height, classColor, maskOpacity, imageTransform);
          } else {
            console.warn(`❌ No RLE data found for mask: ${maskData.class}`);
          }
        } catch (error) {
          console.error(`❌ Error processing mask ${maskData.class}:`, error);
        }
      }
    });

    console.log('=== CANVAS RENDERING COMPLETE ===');
  }, [
    segmentationData, currentTimeIndex, currentLayerIndex, visibleMasks,
    maskOpacity, renderBackground, canvasDimensions, imageTransform,
    getCurrentSliceData, getClassColor
  ]);

  // Clear canvas function for second display
  const clearSecondCanvas = useCallback(() => {
    const canvas = secondCanvasRef.current;
    const overlayCanvas = secondOverlayCanvasRef.current;
    
    if (canvas && overlayCanvas) {
      const ctx = canvas.getContext('2d');
      const overlayCtx = overlayCanvas.getContext('2d');
      
      ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
      overlayCtx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
      
      // Re-render background
      renderBackground(ctx, canvasDimensions.width, canvasDimensions.height);
    }
    
    // Clear drawing history
    setDrawingHistory([]);
  }, [canvasDimensions, renderBackground]);

  // Undo function for second display
  const undoLastAction = useCallback(() => {
    if (drawingHistory.length > 0) {
      const newHistory = [...drawingHistory];
      newHistory.pop();
      setDrawingHistory(newHistory);
      
      // Re-render canvas with remaining history
      const overlayCanvas = secondOverlayCanvasRef.current;
      if (overlayCanvas) {
        const overlayCtx = overlayCanvas.getContext('2d');
        overlayCtx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
        
        // Re-apply all remaining drawing actions
        newHistory.forEach(action => {
          // Apply drawing action based on type
          // This would need to be implemented based on your drawing logic
        });
      }
    }
  }, [drawingHistory, canvasDimensions]);

  // Load extracted images when projectId changes
  useEffect(() => {
    const loadExtractedImages = async () => {
      if (!projectId) { console.log('No projectId, skipping image load'); return; }
      setIsLoadingImages(true); setImageError(null);
      try {
        const presignedUrl = await fetchPresignedUrl(projectId);
        const extractedTarFiles = await fetchAndExtractTarFile(presignedUrl);
        const processedImages = processExtractedImages(extractedTarFiles);
        setExtractedImages(processedImages);
        if (processedImages.length > 0) {
          const frames = [...new Set(processedImages.map(img => img.frame))].sort((a, b) => a - b);
          const slices = [...new Set(processedImages.map(img => img.slice))].sort((a, b) => a - b);
          setAvailableFrames(frames); setAvailableSlices(slices);
          const initialImage = processedImages.find(img => img.frame === (frames[0] ?? 0) && img.slice === (slices[0] ?? 0));
          if (initialImage) setCurrentImage(initialImage);
        }
      } catch (error) {
        console.error('❌ Error loading extracted images:', error);
        setImageError(error.message);
      } finally {
        setIsLoadingImages(false);
      }
    };
    loadExtractedImages();
    return () => { extractedImages.forEach(img => { if (img.url) URL.revokeObjectURL(img.url); }); };
  }, [projectId]);

  // Update current image when time/layer indices change
  useEffect(() => {
    if (extractedImages.length === 0) return;
    const targetImage = extractedImages.find(img => img.frame === currentTimeIndex && img.slice === currentLayerIndex);
    if (targetImage) {
      setCurrentImage(targetImage);
    } else {
      // Fallback logic if needed, or set to null
      const availableFramesSet = new Set(extractedImages.map(img => img.frame));
      const availableSlicesSet = new Set(extractedImages.map(img => img.slice));
      if (availableFramesSet.size > 0 && availableSlicesSet.size > 0) {
        const closestFrame = Array.from(availableFramesSet).sort((a, b) => Math.abs(a - currentTimeIndex) - Math.abs(b - currentTimeIndex))[0];
        const closestSlice = Array.from(availableSlicesSet).sort((a, b) => Math.abs(a - currentLayerIndex) - Math.abs(b - currentLayerIndex))[0];
        const fallbackImage = extractedImages.find(img => img.frame === closestFrame && img.slice === closestSlice);
        setCurrentImage(fallbackImage || null);
        console.log(fallbackImage ? `⚠️ Using closest available image: ${fallbackImage.name}` : '❌ No suitable image found');
      } else {
        setCurrentImage(null);
        console.log('❌ No suitable image found, no frames/slices available.');
      }
    }
  }, [extractedImages, currentTimeIndex, currentLayerIndex]);

  useEffect(() => {
    renderCanvas(canvasRef, overlayCanvasRef);
    renderCanvas(secondCanvasRef, secondOverlayCanvasRef);
  }, [renderCanvas]);

  useEffect(() => {
    const sliceData = getCurrentSliceData();
    if (sliceData?.segmentationMasks) {
      const newVisibleMasks = {};
      sliceData.segmentationMasks.forEach(mask => {
        const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
        if (!(maskId in visibleMasks)) newVisibleMasks[maskId] = true;
      });
      if (Object.keys(newVisibleMasks).length > 0) {
        setVisibleMasks(prev => ({ ...prev, ...newVisibleMasks }));
      }
    }
  }, [currentTimeIndex, currentLayerIndex, segmentationData, getCurrentSliceData, visibleMasks]);

  const toggleMaskVisibility = (maskId) => {
    setVisibleMasks(prev => ({ ...prev, [maskId]: !prev[maskId] }));
  };

  const handleMaskClick = (maskData) => {
    if (onMaskSelected) {
      onMaskSelected({ ...maskData, frameIndex: currentTimeIndex, sliceIndex: currentLayerIndex });
    }
  };

  const handleMouseDown = (e) => { setIsDragging(true); setLastMousePos({ x: e.clientX, y: e.clientY }); };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    setPanOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };
  const handleMouseUp = () => { setIsDragging(false); };
  const handleZoom = (delta) => { setZoomLevel(prev => Math.max(0.5, Math.min(3, prev + delta))); };
  const resetView = () => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); };

  const downloadMask = useCallback((maskData) => {
    try {
      const { width, height } = canvasDimensions; // Use dynamic dimensions
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d');

      const rleData = maskData.segmentationmaskcontents || maskData.rle;
      const binaryMask = decodeRLE(rleData, height, width); // Use dynamic dimensions
      const imageData = ctx.createImageData(width, height); // Use dynamic dimensions
      const data = imageData.data;

      for (let i = 0; i < binaryMask.length; i++) {
        const pixelIndex = i * 4;
        const value = binaryMask[i] * 255;
        data[pixelIndex] = value; data[pixelIndex + 1] = value; data[pixelIndex + 2] = value; data[pixelIndex + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      tempCanvas.toBlob(blob => {
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
  }, [canvasDimensions, currentTimeIndex, currentLayerIndex]);

  const sliceDataForStats = getCurrentSliceData();
  const availableMasksForStats = sliceDataForStats?.segmentationMasks || [];

  // Complete the maskStats calculation
const maskStats = React.useMemo(() => availableMasksForStats.map(mask => {
  try {
    const { width, height } = canvasDimensions;
    const rleData = mask.segmentationmaskcontents || mask.rle;
    const binaryMask = decodeRLE(rleData, height, width);
    const pixelCount = binaryMask.reduce((sum, pixel) => sum + pixel, 0);
    const area = pixelCount * 0.25; // Assuming 0.25 mm² per pixel
    return { ...mask, pixelCount, area };
  } catch (error) {
    console.error('Error calculating stats for mask:', mask.class, error);
    return { ...mask, pixelCount: 0, area: 0 };
  }
}), [availableMasksForStats, canvasDimensions]);

// Add drawing functionality for second canvas
const handleSecondCanvasMouseDown = useCallback((e) => {
  if (selectedTool === 'brush' || selectedTool === 'eraser') {
    const canvas = secondOverlayCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = selectedTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = getClassColor(selectedClass);
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    setDrawingHistory(prev => [...prev, { 
      type: selectedTool, 
      class: selectedClass, 
      points: [{ x, y }] 
    }]);
  }
}, [selectedTool, selectedClass, getClassColor]);

// Return the JSX with the new features
return (
  <div className="flex flex-col h-full bg-gray-100">
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Layers size={20} className="text-blue-600" />
                  AI Segmentation Display
                  {isLoadingImages && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Frame {availableFrames.length > 0 ? currentTimeIndex + 1 : '?'} • Slice {availableSlices.length > 0 ? currentLayerIndex + 1 : '?'} • 
                  {canvasDimensions.width} x {canvasDimensions.height} px • 
                  {availableMasksForStats.length} masks
                  {imageError && <span className="text-red-500"> • Image Error</span>}
                </p>
                {currentImage && (
                  <p className="text-xs text-green-600 mt-1">Current Image: {currentImage.name}</p>
                )}
              </div>
              {/* ... other header buttons ... */}
            </div>
          </div>

    <div className="flex flex-1">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Display Area */}
        <div className="flex-1 flex">
          {/* First Canvas */}
          <div className="flex-1 relative border-r border-gray-300">
            <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              Original AI Segmentation
            </div>
            <div 
              className="relative w-full h-full cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: 'center'
                }}
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: 'center'
                }}
              />
            </div>
          </div>

          {/* Second Canvas */}
          <div className="flex-1 relative">
            <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              Manual Annotation
            </div>
            <div className="absolute top-2 right-2 z-10 flex space-x-2">
              <button
                onClick={undoLastAction}
                className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded"
                title="Undo"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={clearSecondCanvas}
                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                title="Clear Canvas"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full h-full">
              <canvas
                ref={secondCanvasRef}
                className="absolute inset-0"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: 'center'
                }}
              />
              <canvas
                ref={secondOverlayCanvasRef}
                className="absolute inset-0 cursor-crosshair"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: 'center'
                }}
                onMouseDown={handleSecondCanvasMouseDown}
              />
            </div>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="bg-white border-t border-gray-200 p-2 flex justify-center space-x-2">
          <button onClick={() => handleZoom(-0.2)} className="p-2 hover:bg-gray-100 rounded">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 text-sm">{Math.round(zoomLevel * 100)}%</span>
          <button onClick={() => handleZoom(0.2)} className="p-2 hover:bg-gray-100 rounded">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={resetView} className="p-2 hover:bg-gray-100 rounded">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Class Selection */}
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-semibold mb-3">Class Selection</h4>
          <div className="space-y-2">
            {classOptions.map((option) => (
              <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="class"
                  value={option.value}
                  checked={selectedClass === option.value}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="form-radio"
                />
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: option.color }}
                />
                <span className="text-sm font-medium">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Toolbox */}
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-semibold mb-3">Tools</h4>
          <div className="grid grid-cols-3 gap-2">
            {toolOptions.map((tool) => {
              const IconComponent = tool.icon;
              return (
                <button
                  key={tool.value}
                  onClick={() => setSelectedTool(tool.value)}
                  className={`p-3 rounded border-2 flex flex-col items-center space-y-1 ${
                    selectedTool === tool.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="text-xs">{tool.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mask List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h4 className="font-semibold mb-3">Available Masks</h4>
            {availableMasksForStats.length === 0 ? (
              <p className="text-gray-500 text-sm">No masks available for this slice</p>
            ) : (
              <div className="space-y-2">
                {availableMasksForStats.map((mask, index) => {
                  const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
                  const isVisible = visibleMasks[maskId] !== false;
                  const isSelected = selectedMask && selectedMask.class === mask.class;
                  const stats = maskStats.find(s => s.class === mask.class);
                  
                  return (
                    <div
                      key={maskId}
                      className={`p-3 border rounded cursor-pointer ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleMaskClick(mask)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: getClassColor(mask.class) }}
                          />
                          <span className="font-medium text-sm">{mask.class}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMaskVisibility(maskId);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadMask(mask);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {showStats && stats && (
                        <div className="mt-2 text-xs text-gray-600">
                          <div>Pixels: {stats.pixelCount.toLocaleString()}</div>
                          <div>Area: {stats.area.toFixed(2)} mm²</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);
};

export default AISegmentationDisplay;
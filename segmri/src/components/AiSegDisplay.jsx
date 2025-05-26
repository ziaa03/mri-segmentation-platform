import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eye, EyeOff, Download, Upload, Info, RotateCcw, ZoomIn, ZoomOut, Play, Pause, Grid, Layers } from 'lucide-react';
import api from '../api/AxiosInstance'; // Ensure this path is correct for your project structure
import { decodeRLE } from '../utils/RLE-Decoder'; // Assuming encodeRLE is not used in this component
import { renderMaskOnCanvas } from '../utils/RLE-Decoder';

// Enhanced Medical Image Loading Functions (fetchPresignedUrl, parseTarFile, fetchAndExtractTarFile, processExtractedImages)
// These functions (fetchPresignedUrl, parseTarFile, fetchAndExtractTarFile, processExtractedImages)
// should remain as they are in your existing code. For brevity, they are not repeated here.
// Make sure they are defined before AISegmentationDisplay or imported if they are in a separate utility file.

// Placeholder for the medical image loading functions from your existing code
const fetchPresignedUrl = async (projectId) => {
  console.log('🔍 Fetching presigned URL for projectId:', projectId);
  try {
    const response = await api.get(`/project/get-project-presigned-url?projectId=${projectId}`);
    console.log('📡 Response:', { status: response.status, data: response.data });
    const data = response.data;
    if (data && data.success === false) throw new Error(data.message || 'Backend returned an error');
    const presignedUrl = data?.presignedUrl || data?.url || data?.data?.presignedUrl;
    if (!presignedUrl) {
      console.error('❌ No presigned URL found. Response keys:', Object.keys(data || {}));
      throw new Error('No presigned URL found in response');
    }
    console.log('✅ Got presigned URL');
    return presignedUrl;
  } catch (error) {
    console.error('❌ Error fetching presigned URL:', error);
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
  const [showGrid, setShowGrid] = useState(false);
  // const [isAutoPlaying, setIsAutoPlaying] = useState(false); // Assuming this might be used later
  // const [playSpeed, setPlaySpeed] = useState(500); // Assuming this might be used later

  const [extractedImages, setExtractedImages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [availableFrames, setAvailableFrames] = useState([]);
  const [availableSlices, setAvailableSlices] = useState([]);

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
        // renderFallbackBackground(ctx, targetCanvasWidth, targetCanvasHeight); // Defined below
        if (callback) callback();
      }
    };

    img.onerror = (error) => {
      console.error('Error loading image:', error);
      // renderFallbackBackground(ctx, targetCanvasWidth, targetCanvasHeight); // Defined below
      if (callback) callback();
    };

    img.src = imageUrl;
  }, []); // No dependencies needed if renderFallbackBackground is also stable or part of it

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

  const renderCanvas = useCallback(() => {
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

    sliceData.boundingBoxes?.forEach((box) => {
      if (box.x_min !== undefined && box.y_min !== undefined && box.x_max !== undefined && box.y_max !== undefined) {
        // Note: Bounding box coordinates might need scaling if they are relative to original image
        // and not the canvas. Assuming they are already scaled or relative to canvas for now.
        // If imageTransform is applied, bounding boxes should also use it.
        let x_min = box.x_min, y_min = box.y_min, box_width = box.x_max - box.x_min, box_height = box.y_max - box.y_min;

        if (imageTransform) {
          // Scale and offset bounding box coordinates based on imageTransform
          // This assumes box coordinates are relative to the original image dimensions
          x_min = box.x_min * imageTransform.scaleX + imageTransform.offsetX;
          y_min = box.y_min * imageTransform.scaleY + imageTransform.offsetY;
          box_width = (box.x_max - box.x_min) * imageTransform.scaleX;
          box_height = (box.y_max - box.y_min) * imageTransform.scaleY;
        }

        overlayCtx.strokeStyle = getClassColor(box.class);
        overlayCtx.lineWidth = 2;
        overlayCtx.strokeRect(x_min, y_min, box_width, box_height);

        overlayCtx.fillStyle = getClassColor(box.class);
        overlayCtx.font = 'bold 12px Arial';
        const textMetrics = overlayCtx.measureText(box.class);
        overlayCtx.fillRect(x_min, y_min - 18, textMetrics.width + 6, 16);
        overlayCtx.fillStyle = 'white';
        overlayCtx.fillText(box.class, x_min + 3, y_min - 5);
      }
    });

    console.log('=== CANVAS RENDERING COMPLETE ===');
  }, [
    segmentationData, currentTimeIndex, currentLayerIndex, visibleMasks,
    maskOpacity, renderBackground, canvasDimensions, imageTransform,
    getCurrentSliceData, getClassColor
  ]);

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
    renderCanvas();
  }, [renderCanvas]); // renderCanvas has its own dependencies including canvasDimensions

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

  const maskStats = React.useMemo(() => availableMasksForStats.map(mask => {
    try {
      const { width, height } = canvasDimensions; // Use dynamic dimensions
      const rleData = mask.segmentationmaskcontents || mask.rle;
      const binaryMask = decodeRLE(rleData, height, width); // Use dynamic dimensions
      const pixelCount = binaryMask.reduce((sum, pixel) => sum + pixel, 0);
      const area = pixelCount * 0.25; // Assuming pixel size of 0.5mm x 0.5mm, adjust if needed
      const percentage = ((pixelCount / (width * height)) * 100).toFixed(1);
      return { ...mask, pixelCount, area, percentage };
    } catch {
      return { ...mask, pixelCount: 0, area: 0, percentage: '0.0' };
    }
  }), [availableMasksForStats, canvasDimensions]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
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
              {canvasDimensions.width}x{canvasDimensions.height}px •
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

      <div className="p-6">
        <div className="relative mb-6">
          <div
            className="canvas-container relative border-2 border-gray-300 rounded-lg overflow-hidden bg-black shadow-inner"
            style={{
              width: `${canvasDimensions.width}px`,  // Dynamic CSS width
              height: `${canvasDimensions.height}px`, // Dynamic CSS height
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'center center',
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp} // Important to stop dragging if mouse leaves canvas container
          >
            <canvas
              ref={canvasRef}
              className="background-canvas absolute top-0 left-0"
              // width & height attributes are set in renderCanvas
              style={{
                width: `${canvasDimensions.width}px`,  // Dynamic CSS width
                height: `${canvasDimensions.height}px`, // Dynamic CSS height
                display: 'block'
              }}
            />
            <canvas
              ref={overlayCanvasRef}
              className="overlay-canvas absolute top-0 left-0"
              // width & height attributes are set in renderCanvas
              style={{
                width: `${canvasDimensions.width}px`,  // Dynamic CSS width
                height: `${canvasDimensions.height}px`, // Dynamic CSS height
                display: 'block',
                pointerEvents: 'auto' // If you need to interact with overlay
              }}
            />
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded pointer-events-none">
              <div>Frame: {currentTimeIndex + 1} / {availableFrames.length || '?'}</div>
              <div>Slice: {currentLayerIndex + 1} / {availableSlices.length || '?'}</div>
              <div>Dim: {canvasDimensions.width}x{canvasDimensions.height}</div>
              <div>Zoom: {Math.round(zoomLevel * 100)}%</div>
              <div>Images: {isLoadingImages ? 'Loading...' : `${extractedImages.length} loaded`}</div>
              <div>Current Img: {currentImage ? '✅' : '❌'}</div>
              <div>Transform: {imageTransform ? '✅' : '❌'}</div>
            </div>
          </div>

          {/* ... Zoom and Opacity Controls ... */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <button onClick={() => handleZoom(0.2)} className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-lg shadow-md transition-all backdrop-blur-sm"><ZoomIn size={16} /></button>
            <button onClick={() => handleZoom(-0.2)} className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-lg shadow-md transition-all backdrop-blur-sm"><ZoomOut size={16} /></button>
            <div className="text-xs text-white bg-black/50 px-2 py-1 rounded text-center backdrop-blur-sm">{Math.round(zoomLevel * 100)}%</div>
          </div>
          <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-md border border-gray-200">
            <label className="text-sm font-medium text-gray-700 block mb-2">Mask Opacity</label>
            <div className="flex items-center gap-2">
              <input type="range" min="0" max="1" step="0.1" value={maskOpacity} onChange={(e) => setMaskOpacity(parseFloat(e.target.value))} className="w-24 accent-blue-500" />
              <span className="text-xs text-gray-600 min-w-[3ch]">{Math.round(maskOpacity * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Image Navigation Controls */}
        {extractedImages.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h5 className="text-sm font-semibold text-gray-800 mb-3">Image Navigation</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Available Frames:</label>
                <div className="text-sm text-gray-800">{availableFrames.join(', ') || 'None'}</div>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Available Slices:</label>
                <div className="text-sm text-gray-800">{availableSlices.join(', ') || 'None'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Mask Controls */}
        {availableMasksForStats.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-lg font-semibold text-gray-800">Segmentation Masks</h5>
              {/* ... Toggle All button ... */}
            </div>
            <div className="grid grid-cols-1 gap-3">
              {availableMasksForStats.map((mask, index) => {
                const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
                const isVisible = visibleMasks[maskId] !== false;
                const isSelected = selectedMask?.class === mask.class && selectedMask?.frameIndex === currentTimeIndex && selectedMask?.sliceIndex === currentLayerIndex;
                const stats = maskStats[index];
                return (
                  <div key={maskId} className={`p-4 rounded-lg border-2 transition-all ${isSelected ? 'border-blue-400 bg-blue-50 shadow-md' : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:shadow-sm'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 cursor-pointer flex-1" onClick={() => handleMaskClick(mask)}>
                        <div className="w-6 h-6 rounded-full border-2 border-white shadow-md flex-shrink-0" style={{ backgroundColor: getClassColor(mask.class) }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-800">{mask.class}</span>
                            {mask.confidence && (<span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">{(mask.confidence * 100).toFixed(1)}%</span>)}
                          </div>
                          {showStats && stats && (
                            <div className="text-xs text-gray-600 mt-1 space-y-1">
                              <div>{stats.pixelCount?.toLocaleString()} pixels ({stats.percentage}% of image)</div>
                              <div>{stats.area?.toFixed(1)} mm² area</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button onClick={() => downloadMask(mask)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download Mask"><Download size={16} /></button>
                        {onUploadSelectedMask && (<button onClick={() => onUploadSelectedMask(mask)} className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Upload to S3"><Upload size={16} /></button>)}
                        <button onClick={() => toggleMaskVisibility(maskId)} className={`p-2 rounded-lg transition-colors ${isVisible ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 bg-gray-100 hover:bg-gray-200'}`} title={isVisible ? 'Hide Mask' : 'Show Mask'}>{isVisible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* ... Bounding Boxes Info and No Data Message ... */}
        {sliceDataForStats?.boundingBoxes?.length > 0 && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h5 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2"><Info size={16} />Detected Bounding Boxes ({sliceDataForStats.boundingBoxes.length})</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-700">
              {sliceDataForStats.boundingBoxes.map((box, index) => (
                <div key={index} className="bg-amber-100 p-2 rounded">
                  <div className="font-medium">{box.class}</div>
                  <div>Pos: ({box.x_min},{box.y_min})-({box.x_max},{box.y_max})</div>
                  <div>Size: {box.x_max - box.x_min}×{box.y_max - box.y_min}px</div>
                  {box.confidence && (<div>Conf: {(box.confidence * 100).toFixed(1)}%</div>)}
                </div>
              ))}
            </div>
          </div>
        )}

        {availableMasksForStats.length === 0 && (!sliceDataForStats?.boundingBoxes || sliceDataForStats.boundingBoxes.length === 0) && (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center"><Layers size={32} className="text-gray-400" /></div>
            <p className="text-lg font-medium">No segmentation data available</p>
            <p className="text-sm mt-1">Frame {currentTimeIndex + 1}, Slice {currentLayerIndex + 1}</p>
            {isLoadingImages && (<p className="text-sm mt-2 text-blue-600">Loading images...</p>)}
          </div>
        )}
      </div>
    </div>
  );
};

export default AISegmentationDisplay;
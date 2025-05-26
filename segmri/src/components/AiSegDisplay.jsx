import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eye, EyeOff, Download, Upload, Info, RotateCcw, ZoomIn, ZoomOut, Play, Pause, Grid, Layers } from 'lucide-react';
import api from '../api/AxiosInstance';
import { decodeRLE, encodeRLE } from '../utils/RLE-Decoder';
import { renderMaskOnCanvas } from '../utils/RLE-Decoder';

// Enhanced Medical Image Loading Functions
const fetchPresignedUrl = async (projectId) => {
  console.log('🔍 Fetching presigned URL for projectId:', projectId);
  
  try {
    const response = await api.get(`/project/get-project-presigned-url?projectId=${projectId}`);
    
    console.log('📡 Response:', {
      status: response.status,
      data: response.data
    });
    
    const data = response.data;
    
    // Handle backend error responses
    if (data && data.success === false) {
      throw new Error(data.message || 'Backend returned an error');
    }
    
    // Extract presigned URL with multiple fallbacks
    const presignedUrl = data?.presignedUrl || data?.url || data?.data?.presignedUrl;
    
    if (!presignedUrl) {
      console.error('❌ No presigned URL found');
      console.error('Response keys:', Object.keys(data || {}));
      throw new Error('No presigned URL found in response');
    }
    
    console.log('✅ Got presigned URL');
    return presignedUrl;
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
};


// Simple TAR file parser for browser environment
const parseTarFile = (buffer) => {
  const files = [];
  const view = new Uint8Array(buffer);
  let offset = 0;
  
  while (offset < view.length) {
    // TAR header is 512 bytes
    const header = view.slice(offset, offset + 512);
    
    // Check if we've reached the end (two consecutive zero blocks)
    if (header.every(byte => byte === 0)) {
      break;
    }
    
    // Extract filename (first 100 bytes, null-terminated)
    let nameBytes = header.slice(0, 100);
    let nameEnd = nameBytes.indexOf(0);
    if (nameEnd === -1) nameEnd = 100;
    const name = new TextDecoder().decode(nameBytes.slice(0, nameEnd));
    
    // Extract file size (124-135, octal string)
    const sizeBytes = header.slice(124, 135);
    const sizeStr = new TextDecoder().decode(sizeBytes).replace(/\0/g, '').trim();
    const size = parseInt(sizeStr, 8) || 0;
    
    // Extract file type (156th byte)
    const typeFlag = header[156];
    const isRegularFile = typeFlag === 0 || typeFlag === 48; // '0' in ASCII
    
    offset += 512; // Move past header
    
    if (isRegularFile && size > 0 && name) {
      // Extract file data
      const fileData = view.slice(offset, offset + size);
      files.push({
        name: name,
        buffer: fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength),
        size: size
      });
    }
    
    // Move to next file (pad to 512-byte boundary)
    offset += Math.ceil(size / 512) * 512;
  }
  
  return files;
};

const fetchAndExtractTarFile = async (presignedUrl) => {
  console.log('=== FETCHING TAR FILE ===');
  console.log('Presigned URL:', presignedUrl);
  
  try {
    const response = await fetch(presignedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch tar file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('Tar file downloaded, size:', arrayBuffer.byteLength);
    
    // Use custom TAR parser
    const extractedFiles = parseTarFile(arrayBuffer);
    console.log('Files extracted:', extractedFiles.length);
    
    // Filter for image files (JPEG, PNG, etc.)
    const imageFiles = extractedFiles.filter(file => 
      file.name && (
        file.name.toLowerCase().endsWith('.jpg') ||
        file.name.toLowerCase().endsWith('.jpeg') ||
        file.name.toLowerCase().endsWith('.png')
      )
    );
    
    console.log('Image files found:', imageFiles.length);
    console.log('Sample file names:', imageFiles.slice(0, 5).map(f => f.name));
    
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
        // Parse the filename pattern: {user_id}_{file_hash}_{frame_idx}_{slice_idx}.jpg
        const parts = file.name.split('_');
        
        if (parts.length < 4) {
          console.warn(`Unexpected filename format: ${file.name}`);
          return null;
        }
        
        const frameIdx = parseInt(parts[parts.length - 2]);
        const sliceIdx = parseInt(parts[parts.length - 1].split('.')[0]);
        
        if (isNaN(frameIdx) || isNaN(sliceIdx)) {
          console.warn(`Could not parse indices from filename: ${file.name}`);
          return null;
        }
        
        // Create blob URL for the image
        const blob = new Blob([file.buffer], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        
        return {
          name: file.name,
          frame: frameIdx,
          slice: sliceIdx,
          url: url,
          blob: blob,
          size: file.buffer.byteLength
        };
      })
      .filter(Boolean) // Remove null entries
      .sort((a, b) => {
        // Sort by frame then slice
        if (a.frame !== b.frame) return a.frame - b.frame;
        return a.slice - b.slice;
      });
    
    console.log('Processed images:', {
      total: processedImages.length,
      frames: [...new Set(processedImages.map(img => img.frame))],
      slices: [...new Set(processedImages.map(img => img.slice))],
      sampleNames: processedImages.slice(0, 3).map(img => img.name)
    });
    
    return processedImages;
  } catch (error) {
    console.error('Error processing extracted images:', error);
    return [];
  }
};

const renderImageToCanvas = (ctx, imageUrl, width, height, callback) => {
  console.log('=== RENDERING IMAGE TO CANVAS ===');
  console.log('Image URL:', imageUrl);
  console.log('Canvas dimensions:', { width, height });
  
  const img = new Image();
  
  img.onload = () => {
    try {
      console.log('Image loaded:', {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        targetSize: `${width}x${height}`
      });
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Set black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      // Calculate scaling to fit image while maintaining aspect ratio
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = width / height;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imgAspect > canvasAspect) {
        // Image is wider - fit to width
        drawWidth = width;
        drawHeight = width / imgAspect;
        offsetX = 0;
        offsetY = (height - drawHeight) / 2;
      } else {
        // Image is taller - fit to height
        drawWidth = height * imgAspect;
        drawHeight = height;
        offsetX = (width - drawWidth) / 2;
        offsetY = 0;
      }
      
      // Draw the image
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      
      console.log('✅ Image rendered successfully:', {
        drawSize: `${Math.round(drawWidth)}x${Math.round(drawHeight)}`,
        offset: `${Math.round(offsetX)}, ${Math.round(offsetY)}`
      });
      
      if (callback) callback();
      
    } catch (error) {
      console.error('Error rendering image:', error);
      renderFallbackBackground(ctx, width, height);
      if (callback) callback();
    }
  };
  
  img.onerror = (error) => {
    console.error('Error loading image:', error);
    renderFallbackBackground(ctx, width, height);
    if (callback) callback();
  };
  
  img.src = imageUrl;
};

const renderFallbackBackground = (ctx, width, height) => {
  console.log('Rendering fallback background');
  
  // Clear canvas with a visible background
  ctx.fillStyle = '#2a2a2a'; // Dark gray background
  ctx.fillRect(0, 0, width, height);
  
  // Add a border to make canvas boundaries visible
  ctx.strokeStyle = '#4a4a4a';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);
  
  // Create a more visible cardiac structure simulation
  ctx.save();
  ctx.translate(width/2, height/2);
  
  // Main heart outline
  ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 120, 100, 0, 0, 2 * Math.PI);
  ctx.stroke();
  
  // Left ventricle
  ctx.beginPath();
  ctx.ellipse(-30, -20, 60, 50, 0, 0, 2 * Math.PI);
  ctx.stroke();
  
  // Right ventricle
  ctx.beginPath();
  ctx.ellipse(30, -20, 50, 40, 0, 0, 2 * Math.PI);
  ctx.stroke();
  
  // Add crosshairs for reference
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-width/2, 0);
  ctx.lineTo(width/2, 0);
  ctx.moveTo(0, -height/2);
  ctx.lineTo(0, height/2);
  ctx.stroke();
  
  ctx.restore();
  
  // Add coordinate reference in corner
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '12px Arial';
  ctx.fillText(`${width}x${height}`, 10, height - 10);
  
  // Add "No Image" text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('No Image Available', width/2, height/2 + 150);
  ctx.textAlign = 'left';
};

const AISegmentationDisplay = ({
  segmentationData,
  currentTimeIndex,
  currentLayerIndex,
  segmentItems,
  onMaskSelected,
  selectedMask,
  onUploadSelectedMask,
  projectId // Add projectId prop
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
  
  // New state for extracted images
  const [extractedImages, setExtractedImages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [availableFrames, setAvailableFrames] = useState([]);
  const [availableSlices, setAvailableSlices] = useState([]);

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

  // Enhanced background rendering with extracted medical images
  const renderBackground = useCallback((ctx, width, height) => {
    console.log('Rendering background:', { 
      width, 
      height, 
      hasCurrentImage: !!currentImage,
      currentFrame: currentTimeIndex,
      currentSlice: currentLayerIndex
    });
    
    if (currentImage && currentImage.url) {
      renderImageToCanvas(ctx, currentImage.url, width, height);
    } else {
      renderFallbackBackground(ctx, width, height);
    }
    
    console.log('Background rendered successfully');
  }, [currentImage, currentTimeIndex, currentLayerIndex]);

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

  // Load extracted images when projectId changes
  useEffect(() => {
    const loadExtractedImages = async () => {
      if (!projectId) {
        console.log('No projectId provided, using fallback background');
        return;
      }

      setIsLoadingImages(true);
      setImageError(null);
      
      try {
        console.log('=== LOADING EXTRACTED IMAGES ===');
        console.log('Project ID:', projectId);
        
        // Get presigned URL
        const presignedUrl = await fetchPresignedUrl(projectId);
        console.log('Got presigned URL');
        
        // Extract TAR file
        const extractedFiles = await fetchAndExtractTarFile(presignedUrl);
        console.log('Extracted files:', extractedFiles.length);

        // Process images with naming pattern
        const processedImages = processExtractedImages(extractedFiles);
        console.log('Processed images:', processedImages.length);

        setExtractedImages(processedImages);

        // Calculate available frames and slices
        if (processedImages.length > 0) {
          const frames = [...new Set(processedImages.map(img => img.frame))].sort((a, b) => a - b);
          const slices = [...new Set(processedImages.map(img => img.slice))].sort((a, b) => a - b);
          
          setAvailableFrames(frames);
          setAvailableSlices(slices);
          
          console.log('Available frames:', frames);
          console.log('Available slices:', slices);
          
          // Set initial image
          const initialImage = processedImages.find(img => 
            img.frame === (frames[0] || 0) && img.slice === (slices[0] || 0)
          );
          
          if (initialImage) {
            setCurrentImage(initialImage);
            console.log('✅ Initial image set:', initialImage.name);
          }
        }
        
      } catch (error) {
        console.error('❌ Error loading extracted images:', error);
        setImageError(error.message);
      } finally {
        setIsLoadingImages(false);
      }
    };

    loadExtractedImages();
    
    // Cleanup: revoke object URLs when component unmounts or projectId changes
    return () => {
      extractedImages.forEach(img => {
        if (img.url) {
          URL.revokeObjectURL(img.url);
        }
      });
    };
  }, [projectId]);

  // Update current image when time/layer indices change
  useEffect(() => {
    if (extractedImages.length === 0) {
      return;
    }

    console.log('=== UPDATING CURRENT IMAGE ===');
    console.log('Looking for image with frame:', currentTimeIndex, 'slice:', currentLayerIndex);
    
    // Find image that matches current frame and slice
    const targetImage = extractedImages.find(img => 
      img.frame === currentTimeIndex && img.slice === currentLayerIndex
    );
    
    if (targetImage) {
      setCurrentImage(targetImage);
      console.log('✅ Found matching image:', targetImage.name);
    } else {
      // Find closest available image
      const availableFrames = [...new Set(extractedImages.map(img => img.frame))].sort((a, b) => a - b);
      const availableSlices = [...new Set(extractedImages.map(img => img.slice))].sort((a, b) => a - b);
      
      const closestFrame = availableFrames.reduce((prev, curr) => 
        Math.abs(curr - currentTimeIndex) < Math.abs(prev - currentTimeIndex) ? curr : prev
      );
      
      const closestSlice = availableSlices.reduce((prev, curr) => 
        Math.abs(curr - currentLayerIndex) < Math.abs(prev - currentLayerIndex) ? curr : prev
      );
      
      const fallbackImage = extractedImages.find(img => 
        img.frame === closestFrame && img.slice === closestSlice
      );
      
      if (fallbackImage) {
        setCurrentImage(fallbackImage);
        console.log('⚠️ Using closest available image:', fallbackImage.name);
      } else {
        setCurrentImage(null);
        console.log('❌ No suitable image found');
      }
    }
  }, [extractedImages, currentTimeIndex, currentLayerIndex]);

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
              {isLoadingImages && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Frame {currentTimeIndex + 1} • Slice {currentLayerIndex + 1} • 
              {availableMasks.length} masks • {boundingBoxes.length} boxes
              {extractedImages.length > 0 && ` • ${extractedImages.length} images`}
              {isLoadingImages && ' • Loading images...'}
            </p>
            {imageError && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <Info size={14} />
                Image Load Error: {imageError}
              </p>
            )}
            {currentImage && (
              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                <Info size={14} />
                Current: {currentImage.name} ({(currentImage.size / 1024).toFixed(1)} KB)
              </p>
            )}
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
            
            {/* Enhanced Debug overlay */}
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded">
              <div>Frame: {currentTimeIndex + 1} / {availableFrames.length || '?'}</div>
              <div>Slice: {currentLayerIndex + 1} / {availableSlices.length || '?'}</div>
              <div>Masks: {availableMasks.length}</div>
              <div>Zoom: {Math.round(zoomLevel * 100)}%</div>
              <div>Images: {isLoadingImages ? 'Loading...' : `${extractedImages.length} loaded`}</div>
              <div>Current: {currentImage ? '✅' : '❌'}</div>
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

        {/* Image Navigation Controls */}
        {extractedImages.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h5 className="text-sm font-semibold text-gray-800 mb-3">
              Image Navigation
            </h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Available Frames:</label>
                <div className="text-sm text-gray-800">
                  {availableFrames.join(', ') || 'None'}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Available Slices:</label>
                <div className="text-sm text-gray-800">
                  {availableSlices.join(', ') || 'None'}
                </div>
              </div>
            </div>
          </div>
        )}

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
            {isLoadingImages && (
              <p className="text-sm mt-2 text-blue-600">Loading images...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AISegmentationDisplay;
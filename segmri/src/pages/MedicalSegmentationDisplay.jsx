// ADD this import
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Heart, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Download, Edit, Trash2, 
  Plus, Target, Brain, Activity, Grid, Maximize2, Info, Settings, AlertCircle, Monitor
} from 'lucide-react';

import debounce from "lodash.debounce";

// Import utility functions
import { 
  decodeRLE, 
  renderMaskOnCanvas, 
  encodeRLE,
  processAndUploadMasks, 
  batchUploadAllMasks,
  uploadMaskToS3
} from '../utils/RLE-Decoder';

import { 
  fetchAndExtractTarFile, 
  processExtractedImages, 
  getAvailableFramesAndSlices, 
  findClosestImage, 
  cleanupImageUrls 
} from '../utils/TarExtractor';

// API utility for fetching presigned URLs
const fetchPresignedUrl = async (projectId, api) => {
  try {
    const response = await api.get(`/project/get-project-presigned-url?projectId=${projectId}`);
    const data = response.data;
    if (data && data.success === false) throw new Error(data.message || 'Backend returned an error');
    const presignedUrl = data?.presignedUrl || data?.url || data?.data?.presignedUrl;
    if (!presignedUrl) {
      throw new Error('No presigned URL found in response');
    }
    return presignedUrl;
  } catch (error) {
    console.error('Error fetching presigned URL:', error);
    throw error;
  }
};

// Utility functions
const getClassColor = (className) => {
  const colors = {
    'MYO': '#3A4454',    // Deep blue-gray for Myocardium
    'LVC': '#5B7B9A',    // Professional blue for Left Ventricle Cavity
    'RV': '#FDBA74'      // Warm accent for Right Ventricle
  };
  return colors[className] || '#8B5CF6';
};

const getStructureName = (className) => {
  const names = {
    'MYO': 'Myocardium',
    'LVC': 'Left Ventricle Cavity',
    'RV': 'Right Ventricle'
  };
  return names[className] || className;
};

const MedicalSegmentationDisplay = ({ 
  segmentationData, 
  currentTimeIndex, 
  currentLayerIndex, 
  onMaskSelected, 
  selectedMask, 
  projectId, 
  onSaveManualAnnotations, 
  setSegmentationData,
  api // Pass api instance as prop
}) => {
  // Canvas refs
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const secondCanvasRef = useRef(null);
  const secondOverlayCanvasRef = useRef(null);
  const imageLoadCancelRef = useRef(null);
  // prevent flicker: schedule draws with RAF
const rafRef = useRef(null);
const manualRafRef = useRef(null);

  
  // State
  const [visibleMasks, setVisibleMasks] = useState({});
  const [maskOpacity, setMaskOpacity] = useState(0.9); // Increased default opacity
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [showStats, setShowStats] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [imageTransform, setImageTransform] = useState(null);

  // Manual annotation states
  const [activeManualSegmentation, setActiveManualSegmentation] = useState(null);
  const [selectedTool, setSelectedTool] = useState('brush');
  const [selectedClass, setSelectedClass] = useState('MYO');
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [brushSize, setBrushSize] = useState(10);
  const [currentBoundingBox, setCurrentBoundingBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [unsavedEdit, setUnsavedEdit] = useState(false);

  // SEPARATE STATE FOR MANUAL ANNOTATIONS - This is key for fixing the issue
  const [manualMasks, setManualMasks] = useState({});

  // Image loading states
  const [extractedImages, setExtractedImages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [availableFrames, setAvailableFrames] = useState([]);
  const [availableSlices, setAvailableSlices] = useState([]);

  // Canvas dimensions - fetch from project info
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 512, height: 512 });

  const [processingComplete, setProcessingComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadingMasks, setUploadingMasks] = useState(false);

  // Fetch project dimensions when projectId changes
  useEffect(() => {
    const fetchDimensions = async () => {
      if (!projectId || !api) {
        console.warn("MedicalSegDisplay: No projectId or api, using defaults.");
        setCanvasDimensions({ width: 512, height: 512 });
        return;
      }
      try {
        const response = await api.get(`/project/get-project-info/${projectId}`);
        if (response.data.success && response.data.project && response.data.project.dimensions) {
          const { width, height } = response.data.project.dimensions;
          if (width && height && width > 0 && height > 0) {
            setCanvasDimensions({ width, height });
          } else {
            setCanvasDimensions({ width: 512, height: 512 });
          }
        } else {
          setCanvasDimensions({ width: 512, height: 512 });
        }
      } catch (error) {
        console.error(`Error fetching project dimensions:`, error);
        setCanvasDimensions({ width: 512, height: 512 });
      }
    };
    fetchDimensions();
  }, [projectId, api]);

  // Load extracted images when projectId changes
  useEffect(() => {
    const loadExtractedImages = async () => {
      if (!projectId || !api) { 
        console.log('No projectId or api, skipping image load'); 
        return; 
      }
      
      setIsLoadingImages(true); 
      setImageError(null);
      
      try {
        const presignedUrl = await fetchPresignedUrl(projectId, api);
        const extractedTarFiles = await fetchAndExtractTarFile(presignedUrl);
        const processedImages = processExtractedImages(extractedTarFiles);
        
        setExtractedImages(processedImages);
        
        if (processedImages.length > 0) {
          const { frames, slices } = getAvailableFramesAndSlices(processedImages);
          setAvailableFrames(frames); 
          setAvailableSlices(slices);
          
          const initialImage = findClosestImage(processedImages, frames[0] ?? 0, slices[0] ?? 0);
          if (initialImage) setCurrentImage(initialImage);
        }
      } catch (error) {
        console.error('Error loading extracted images:', error);
        setImageError(error.message);
      } finally {
        setIsLoadingImages(false);
      }
    };
    
    loadExtractedImages();
    
    return () => {
      cleanupImageUrls(extractedImages);
    };
  }, [projectId, api]);

  // Update current image when time/layer indices change
  useEffect(() => {
    if (extractedImages.length === 0) return;
    
    const targetImage = findClosestImage(extractedImages, currentTimeIndex, currentLayerIndex);
    setCurrentImage(targetImage);
  }, [extractedImages, currentTimeIndex, currentLayerIndex]);

  // Get current slice data
  const getCurrentSliceData = useCallback(() => {
    if (!segmentationData?.masks?.[currentTimeIndex]?.[currentLayerIndex]) {
      return null;
    }
    return segmentationData.masks[currentTimeIndex][currentLayerIndex];
  }, [segmentationData, currentTimeIndex, currentLayerIndex]);

  const sliceData = getCurrentSliceData();
  const availableMasks = sliceData?.segmentationMasks || [];

  // Helper function to generate a binary mask from brush strokes in drawingHistory
  const generateBinaryMaskFromBrushStrokes = useCallback((
    history,
    targetClass,
    canvasWidth,
    canvasHeight
  ) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    const brushActions = history.filter(
      action => action.type === 'brush' && action.class === targetClass
    );

    brushActions.forEach(action => {
      if (action.points && action.points.length > 0) {
        tempCtx.strokeStyle = '#FFFFFF'; // White for visibility in binary mask
        tempCtx.lineWidth = action.lineWidth || 5;
        tempCtx.lineCap = action.lineCap || 'round';
        tempCtx.lineJoin = action.lineJoin || 'round';
        
        tempCtx.beginPath();
        tempCtx.moveTo(action.points[0].x, action.points[0].y);
        for (let i = 1; i < action.points.length; i++) {
          tempCtx.lineTo(action.points[i].x, action.points[i].y);
        }
        tempCtx.stroke();
      }
    });

    const imageData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);
    const data = imageData.data;
    const binaryMask = new Uint8Array(canvasWidth * canvasHeight);

    for (let i = 0; i < binaryMask.length; i++) {
      if (data[i * 4 + 3] > 0) { 
        binaryMask[i] = 1;
      } else {
        binaryMask[i] = 0;
      }
    }
    return binaryMask;
  }, []);

// FIXED: Image rendering with double buffering + URL guard
const renderImageToCanvas = useCallback(
  (ctx, imageUrl, targetCanvasWidth, targetCanvasHeight, callback) => {
    if (!imageUrl || !ctx) {
      if (callback) callback();
      return null;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    let cancelled = false;
    const requestedUrl = imageUrl;

    img.onload = () => {
      if (cancelled || requestedUrl !== imageUrl) return;

      try {
        // --- Offscreen buffer ---
        const offscreen = document.createElement("canvas");
        offscreen.width = targetCanvasWidth;
        offscreen.height = targetCanvasHeight;
        const offCtx = offscreen.getContext("2d");

        // Fill background
        offCtx.fillStyle = "#0F172A";
        offCtx.fillRect(0, 0, targetCanvasWidth, targetCanvasHeight);

        // Compute aspect-fit sizing
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = targetCanvasWidth / targetCanvasHeight;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgAspect > canvasAspect) {
          drawWidth = targetCanvasWidth;
          drawHeight = targetCanvasWidth / imgAspect;
          offsetX = 0;
          offsetY = (targetCanvasHeight - drawHeight) / 2;
        } else {
          drawHeight = targetCanvasHeight;
          drawWidth = targetCanvasHeight * imgAspect;
          offsetX = (targetCanvasWidth - drawWidth) / 2;
          offsetY = 0;
        }

        // Save transform for overlays
        setImageTransform({
          scaleX: drawWidth / img.naturalWidth,
          scaleY: drawHeight / img.naturalHeight,
          offsetX,
          offsetY,
          drawWidth,
          drawHeight,
          originalImageWidth: img.naturalWidth,
          originalImageHeight: img.naturalHeight,
        });

        // Apply pan+zoom on buffer
        offCtx.setTransform(zoomLevel, 0, 0, zoomLevel, panOffset.x, panOffset.y);
        offCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // --- Blit to visible canvas in one step ---
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, targetCanvasWidth, targetCanvasHeight);
        ctx.drawImage(offscreen, 0, 0);

        if (callback) callback();
      } catch (err) {
        console.error("Error rendering image:", err);
        if (callback) callback();
      }
    };

    img.onerror = (err) => {
      if (!cancelled) console.error("Image load error:", err);
      if (callback) callback();
    };

    img.src = requestedUrl;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  },
  [zoomLevel, panOffset]
);

  // Render background
  const renderBackground = useCallback((ctx, width, height, callback) => {
  if (currentImage && currentImage.url) {
    return renderImageToCanvas(ctx, currentImage.url, width, height, callback);
  } else {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    setImageTransform(null);
    if (callback) callback();
    return null;
  }
}, [currentImage, renderImageToCanvas]);


  // FIXED: Render canvas function for main display (AI canvas - read-only)
const renderMainCanvas = useCallback(() => {
  const canvas = canvasRef.current;
  const overlayCanvas = overlayCanvasRef.current;

  if (!canvas || !overlayCanvas) {
    console.error("Canvas references not available");
    return;
  }

  const { width, height } = canvasDimensions;
  if (canvas.width !== width || canvas.height !== height) {
  canvas.width = width;
  canvas.height = height;
}
if (overlayCanvas.width !== width || overlayCanvas.height !== height) {
  overlayCanvas.width = width;
  overlayCanvas.height = height;
}


  const ctx = canvas.getContext("2d");
  const overlayCtx = overlayCanvas.getContext("2d");

  // cancel any previous image load
  if (imageLoadCancelRef.current) {
    try {
      imageLoadCancelRef.current();
    } catch (e) {
      /* ignore */
    }
    imageLoadCancelRef.current = null;
  }

  // helper to draw overlay masks AFTER background has finished rendering
const drawOverlayMasks = () => {
  if (!sliceData) return;

  // Instead of always clearing, only clear once before drawing
  overlayCtx.save();
 overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  overlayCtx.restore();

  overlayCtx.setTransform(zoomLevel, 0, 0, zoomLevel, panOffset.x, panOffset.y);

    sliceData.segmentationMasks?.forEach((maskData) => {
      const maskId = `${maskData.class}_${currentTimeIndex}_${currentLayerIndex}`;
      const isVisible = visibleMasks[maskId] !== false;
      if (!isVisible) return;

      try {
        const rleData = maskData.segmentationmaskcontents || maskData.rle;
        if (rleData) {
          const binaryMask = decodeRLE(rleData, height, width);
          const classColor = getClassColor(maskData.class);

          renderMaskOnCanvas(
            overlayCanvas,
            binaryMask,
            width,
            height,
            classColor,
            maskOpacity,
            imageTransform
          );
        }
      } catch (error) {
        console.error(`Error processing mask ${maskData.class}:`, error);
      }
    });

    overlayCtx.setTransform(1, 0, 0, 1, 0, 0); // reset
  };

if (currentImage && currentImage.url) {
  const url = currentImage.url;

  // Do NOT clear ctx here
  imageLoadCancelRef.current = renderImageToCanvas(ctx, url, width, height, () => {
    if (currentImage.url === url) {
      drawOverlayMasks();
    }
  });
}
else {
  // fallback when no image
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  setImageTransform(null);
  drawOverlayMasks();
}

}, [
  canvasDimensions,
  currentImage,
  sliceData,
  visibleMasks,
  maskOpacity,
  imageTransform,
  zoomLevel,
  panOffset,
  currentTimeIndex,
  currentLayerIndex,
  renderImageToCanvas,
]);


  // FIXED: Combined redraw function for the second overlay canvas (manual annotations)
  const redrawSecondOverlayCanvas = useCallback(() => {
  const overlayCanvas = secondOverlayCanvasRef.current;
  if (!overlayCanvas || canvasDimensions.width === 0) return;

 const { width, height } = canvasDimensions;
if (overlayCanvas.width !== width || overlayCanvas.height !== height) {
  overlayCanvas.width = width;
  overlayCanvas.height = height;
}
  const ctx = overlayCanvas.getContext('2d');

  // Clear in identity space
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.restore();

  // Apply pan+zoom for consistent alignment
  ctx.setTransform(zoomLevel, 0, 0, zoomLevel, panOffset.x, panOffset.y);

  // Render base AI masks (reduced opacity)
  const baseMasksToRender = sliceData?.segmentationMasks || [];
  baseMasksToRender.forEach((maskData) => {
    const maskId = `${maskData.class}_${currentTimeIndex}_${currentLayerIndex}`;
    const isVisible = visibleMasks[maskId] !== false;
    if (!isVisible) return;

    try {
      const rleData = maskData.segmentationmaskcontents || maskData.rle;
      if (rleData) {
        const binaryMask = decodeRLE(rleData, height, width);
        const classColor = getClassColor(maskData.class);
        renderMaskOnCanvas(overlayCanvas, binaryMask, width, height, classColor, maskOpacity * 0.4, imageTransform);
      }
    } catch (error) {
      console.error(`Error processing base mask ${maskData.class}:`, error);
    }
  });

  // Render manual masks for current slice (full opacity)
  const sliceKey = `${currentTimeIndex}_${currentLayerIndex}`;
  if (manualMasks[sliceKey]) {
    Object.entries(manualMasks[sliceKey]).forEach(([className, maskData]) => {
      try {
        if (maskData.rle) {
          const binaryMask = decodeRLE(maskData.rle, height, width);
          const classColor = getClassColor(className);
          renderMaskOnCanvas(overlayCanvas, binaryMask, width, height, classColor, maskOpacity, imageTransform);
        }
      } catch (error) {
        console.error(`Error rendering manual mask ${className}:`, error);
      }
    });
  }

  // Draw in-progress strokes & bounding boxes (the drawingHistory points are in image-space)
  ctx.globalAlpha = 1;
  drawingHistory.forEach(action => {
    if ((action.type === 'brush' || action.type === 'eraser') && action.points && action.points.length > 0) {
      ctx.globalCompositeOperation = action.type === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = getClassColor(action.class);
      ctx.lineWidth = action.lineWidth || 5;
      ctx.lineCap = action.lineCap || 'round';
      ctx.lineJoin = action.lineJoin || 'round';

      ctx.beginPath();
      ctx.moveTo(action.points[0].x, action.points[0].y);
      for (let i = 1; i < action.points.length; i++) {
        ctx.lineTo(action.points[i].x, action.points[i].y);
      }
      ctx.stroke();
    } else if (action.type === 'boundingbox' && action.rect) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = getClassColor(action.class);
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.strokeRect(action.rect.x, action.rect.y, action.rect.width, action.rect.height);
      ctx.setLineDash([]);
    }
  });

  // Draw current bounding box preview
  if (currentBoundingBox) {
    console.log('Rendering currentBoundingBox:', currentBoundingBox);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = getClassColor(selectedClass);
    ctx.lineWidth = 3;
    ctx.setLineDash([]); // SOLID LINE - no dashes!
    const { startX, startY, currentX, currentY } = currentBoundingBox;
    const rectX = Math.min(startX, currentX);
    const rectY = Math.min(startY, currentY);
    const rectWidth = Math.abs(startX - currentX);
    const rectHeight = Math.abs(startY - currentY);
    if (rectWidth > 0 || rectHeight > 0) {
      ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
      console.log('Drew bounding box:', { rectX, rectY, rectWidth, rectHeight });
    }
  }

  // Reset composite op & transform
  ctx.globalCompositeOperation = 'source-over';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}, [
  drawingHistory,
  currentBoundingBox,
  canvasDimensions,
  visibleMasks,
  maskOpacity,
  imageTransform,
  currentTimeIndex,
  currentLayerIndex,
  selectedClass,
  sliceData,
  manualMasks,
  zoomLevel,
  panOffset
]);

const scheduleRender = useCallback(() => {
  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current);
  }
  rafRef.current = requestAnimationFrame(() => {
    renderMainCanvas();
  });
}, [renderMainCanvas]);

const debouncedRender = useMemo(
  () => debounce(scheduleRender, 16), // ~60fps
  [scheduleRender]
);

const scheduleManualRedraw = useCallback(() => {
  if (manualRafRef.current) cancelAnimationFrame(manualRafRef.current);
  manualRafRef.current = requestAnimationFrame(() => {
    redrawSecondOverlayCanvas();
  });
}, [redrawSecondOverlayCanvas]);

const debouncedManualRedraw = useMemo(
  () => debounce(scheduleManualRedraw, 16),
  [scheduleManualRedraw]
);



  // Mouse event handlers for second canvas with proper coordinate calculation
  const getCanvasCoordinates = useCallback((e, canvas) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // Canvas pixel coordinates (taking into account CSS vs backing store)
  const canvasX = (e.clientX - rect.left) * scaleX;
  const canvasY = (e.clientY - rect.top) * scaleY;

  // Convert to image-space (inverse of ctx.setTransform: applied pan + zoom)
  return {
    x: (canvasX - panOffset.x) / zoomLevel,
    y: (canvasY - panOffset.y) / zoomLevel
  };
}, [zoomLevel, panOffset]);

  const handleSecondCanvasMouseDown = useCallback(
  (e) => {
    if (!isEditMode) return;

    const canvas = secondOverlayCanvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoordinates(e, canvas);
    console.log('Mouse down coords:', coords, 'Tool:', selectedTool);

    if (selectedTool === "brush" || selectedTool === "eraser") {
      setDrawingHistory((prev) => [
        ...prev,
        {
          type: selectedTool,
          class: selectedClass,
          lineWidth: brushSize,
          points: [coords]
        },
      ]);
      setIsDrawing(true);
    } else if (selectedTool === "boundingbox") {
      console.log('Starting bounding box at:', coords);
      setCurrentBoundingBox({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
        class: selectedClass,
      });
      setIsDrawing(true);
    }
  },
  [isEditMode, selectedTool, selectedClass, getCanvasCoordinates, brushSize]
);


const handleSecondCanvasMouseMove = useCallback(
  (e) => {
    if (!isDrawing || !isEditMode) return;

    const canvas = secondOverlayCanvasRef.current;
    if (!canvas) return;

    const coords = getCanvasCoordinates(e, canvas);

    if (selectedTool === "brush" || selectedTool === "eraser") {
      // Brush/eraser handling (existing code)
      setDrawingHistory((prevHistory) => {
        const newHistory = [...prevHistory];
        if (newHistory.length > 0) {
          const lastAction = newHistory[newHistory.length - 1];
          if (
            (lastAction.type === "brush" || lastAction.type === "eraser") &&
            lastAction.points
          ) {
            lastAction.points = [...lastAction.points, coords];
          }
        }
        return newHistory;
      });

      // Immediate stroke preview
      const ctx = canvas.getContext("2d");
      ctx.save();
      ctx.setTransform(zoomLevel, 0, 0, zoomLevel, panOffset.x, panOffset.y);

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = brushSize;
      ctx.globalCompositeOperation =
        selectedTool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle =
        selectedTool === "eraser" ? "rgba(0,0,0,1)" : getClassColor(selectedClass);

      const history = drawingHistory;
      if (history.length > 0) {
        const lastAction = history[history.length - 1];
        const pts = lastAction.points;
        if (pts && pts.length > 0) {
          const lastPoint = pts[pts.length - 1];
          ctx.beginPath();
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
        }
      }

      ctx.restore();
    } else if (selectedTool === "boundingbox" && currentBoundingBox) {
      // Update bounding box coordinates
      setCurrentBoundingBox((prev) => ({
        ...prev,
        currentX: coords.x,
        currentY: coords.y,
      }));

      // IMMEDIATE bounding box preview (like brush)
      const ctx = canvas.getContext("2d");
      
      // Clear and redraw the entire overlay (this ensures clean preview)
      debouncedManualRedraw();
    }
  },
  [
    isDrawing,
    isEditMode,
    selectedTool,
    currentBoundingBox,
    getCanvasCoordinates,
    drawingHistory,
    zoomLevel,
    panOffset,
    brushSize,
    selectedClass,
    debouncedManualRedraw,
  ]
);

const handleSecondCanvasMouseUp = useCallback(() => {
  if (!isDrawing || !isEditMode) return;

  setIsDrawing(false);

  if (selectedTool === "boundingbox" && currentBoundingBox) {
    const { startX, startY, currentX, currentY, class: boxClass } = currentBoundingBox;
    const rectX = Math.min(startX, currentX);
    const rectY = Math.min(startY, currentY);
    const rectWidth = Math.abs(startX - currentX);
    const rectHeight = Math.abs(startY - currentY);

    if (rectWidth > 5 && rectHeight > 5) {
      // Add to drawing history FIRST
      setDrawingHistory((prev) => [
        ...prev,
        {
          type: "boundingbox",
          class: boxClass,
          rect: { x: rectX, y: rectY, width: rectWidth, height: rectHeight },
        },
      ]);
    }
    
    // Clear currentBoundingBox AFTER adding to history
    setCurrentBoundingBox(null);
  }

  // Trigger a clean redraw to show the completed bounding box
  debouncedManualRedraw();
}, [
  isDrawing,
  isEditMode,
  selectedTool,
  currentBoundingBox,
  debouncedManualRedraw,
]);


  // stop dragging when mouse released
const handleMouseUp = () => {
  setIsDragging(false);
};


  // Mouse event handlers for main canvas (pan functionality)
  const handleMouseDown = (e) => { 
    setIsDragging(true); 
    setLastMousePos({ x: e.clientX, y: e.clientY }); 
  };
  
  const handleMouseMove = (e) => {
  if (!isDragging) return;
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const deltaXClient = e.clientX - lastMousePos.x;
  const deltaYClient = e.clientY - lastMousePos.y;

  // Convert client delta -> canvas pixels
  const deltaCanvasX = deltaXClient * scaleX;
  const deltaCanvasY = deltaYClient * scaleY;

  setPanOffset(prev => ({ x: prev.x + deltaCanvasX, y: prev.y + deltaCanvasY }));
  setLastMousePos({ x: e.clientX, y: e.clientY });
};

  // Essential function for manual segmentation API calls
  const handleStartManualSegmentation = useCallback(async () => {
  const boundingBoxes = drawingHistory.filter(action => action.type === 'boundingbox');
  if (boundingBoxes.length === 0) {
    alert('Please draw a bounding box first using the Bounding Box tool.');
    return;
  }

  const lastBoundingBoxAction = boundingBoxes[boundingBoxes.length - 1];
  if (!lastBoundingBoxAction || !lastBoundingBoxAction.rect) {
    alert('Invalid bounding box. Please draw a new one.');
    return;
  }
  
  const box = lastBoundingBoxAction.rect;
  
  // FIXED: Better coordinate transformation for API
  let adjustedBox = { ...box };
  if (imageTransform) {
    // Convert from displayed coordinates to original image coordinates
    adjustedBox = {
      x: Math.max(0, Math.round((box.x - imageTransform.offsetX) / imageTransform.scaleX)),
      y: Math.max(0, Math.round((box.y - imageTransform.offsetY) / imageTransform.scaleY)),
      width: Math.round(box.width / imageTransform.scaleX),
      height: Math.round(box.height / imageTransform.scaleY)
    };
    
    // Ensure coordinates are within image bounds
    adjustedBox.x = Math.max(0, Math.min(adjustedBox.x, imageTransform.originalImageWidth - 1));
    adjustedBox.y = Math.max(0, Math.min(adjustedBox.y, imageTransform.originalImageHeight - 1));
    adjustedBox.width = Math.min(adjustedBox.width, imageTransform.originalImageWidth - adjustedBox.x);
    adjustedBox.height = Math.min(adjustedBox.height, imageTransform.originalImageHeight - adjustedBox.y);
  }
  
  const bbox = [
    adjustedBox.x, 
    adjustedBox.y, 
    adjustedBox.x + adjustedBox.width, 
    adjustedBox.y + adjustedBox.height
  ];

  const image_name = currentImage?.name;
  if (!image_name || !projectId) {
    alert('Missing image information. Please ensure an image is loaded.');
    return;
  }

  const payload = {
    image_name,
    bbox,
    segmentationName: `Manual Seg - ${image_name} - Box@${Math.round(bbox[0])},${Math.round(bbox[1])}`,
    segmentationDescription: `Manual segmentation for ${image_name} using bbox: ${JSON.stringify(bbox)}`
  };

  console.log('Starting manual segmentation with payload:', payload);
  console.log('Original display box:', box);
  console.log('Adjusted image box:', adjustedBox);
  console.log('Final API bbox:', bbox);

  try {
    if (api) {
      const response = await api.post(`/segmentation/start-manual-segmentation/${projectId}`, payload);
      console.log('Manual segmentation result:', response.data);

      // Process the response and update manual masks
      if (response.data && response.data.segmentations && response.data.segmentations.length > 0) {
        const newSegmentation = response.data.segmentations[0];
        
        if (newSegmentation.frames && newSegmentation.frames.length > 0) {
          // Update manual masks only
          setManualMasks(prevManualMasks => {
            const updatedManualMasks = { ...prevManualMasks };
            
            newSegmentation.frames.forEach(newFrame => {
              const frameIndex = newFrame.frameindex;
              
              newFrame.slices.forEach(newSlice => {
                const sliceIndex = newSlice.sliceindex;
                const sliceKey = `${frameIndex}_${sliceIndex}`;
                
                if (!updatedManualMasks[sliceKey]) {
                  updatedManualMasks[sliceKey] = {};
                }
                
                const newMasks = newSlice.segmentationmasks || [];
                newMasks.forEach(newMask => {
                  updatedManualMasks[sliceKey][newMask.class] = {
                    class: newMask.class,
                    rle: newMask.segmentationmaskcontents,
                    confidence: newMask.confidence || 1.0
                  };
                });
              });
            });
            
            return updatedManualMasks;
          });
          
          alert(`AI segmentation completed! Generated ${newSegmentation.frames.reduce((total, frame) => total + frame.slices.reduce((sliceTotal, slice) => sliceTotal + (slice.segmentationmasks?.length || 0), 0), 0)} new masks in the selected region.`);
        } else {
          alert('AI segmentation completed but no masks were generated. The bounding box area might not contain recognizable structures.');
        }
      } else {
        console.warn('Unexpected API response format:', response.data);
        alert('AI segmentation completed but returned unexpected data format.');
      }
      
      // Clear the used bounding box
      setDrawingHistory(prev => prev.filter(action => action !== lastBoundingBoxAction));
      
    } else {
      alert('API not available. Please check your connection.');
    }
  } catch (error) {
    console.error('Manual segmentation failed:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
    alert(`Manual segmentation failed: ${errorMessage}`);
  }
}, [drawingHistory, currentImage, projectId, api, imageTransform, setManualMasks]);

  // FIXED: Essential function for applying brush strokes to manual masks only
  const handleApplyBrushStrokes = useCallback(() => {
    if (!isEditMode) {
      console.warn("Cannot apply brush strokes: Not in edit mode.");
      return;
    }

    const relevantBrushActions = drawingHistory.filter(
      action => action.type === 'brush' && action.class === selectedClass
    );

    if (relevantBrushActions.length === 0) {
      console.log(`No brush strokes found for class ${selectedClass} to apply.`);
      return;
    }

    console.log(`Applying ${relevantBrushActions.length} brush strokes for class ${selectedClass}.`);

    const binaryMask = generateBinaryMaskFromBrushStrokes(
      drawingHistory,
      selectedClass,
      canvasDimensions.width,
      canvasDimensions.height
    );

    const rleString = encodeRLE(binaryMask, canvasDimensions.height, canvasDimensions.width);

    // Update MANUAL masks only (not the main segmentation data)
    const sliceKey = `${currentTimeIndex}_${currentLayerIndex}`;
    setManualMasks(prevManualMasks => {
      const updatedManualMasks = { ...prevManualMasks };
      
      if (!updatedManualMasks[sliceKey]) {
        updatedManualMasks[sliceKey] = {};
      }
      
      updatedManualMasks[sliceKey][selectedClass] = {
        class: selectedClass,
        rle: rleString,
        confidence: 1.0
      };
      
      return updatedManualMasks;
    });

    // Clear only the applied brush strokes for the selected class from history
    setDrawingHistory(prevHistory =>
      prevHistory.filter(action => !(action.type === 'brush' && action.class === selectedClass))
    );
    
    alert(`Applied ${relevantBrushActions.length} brush strokes for class ${selectedClass}. Manual annotation updated.`);
  }, [isEditMode, drawingHistory, selectedClass, canvasDimensions, currentTimeIndex, currentLayerIndex, generateBinaryMaskFromBrushStrokes]);

  // Event handlers
  const toggleMaskVisibility = (maskId) => {
    setVisibleMasks(prev => ({ ...prev, [maskId]: !prev[maskId] }));
  };

  const handleMaskClick = (maskData) => {
    if (onMaskSelected) {
      onMaskSelected({ ...maskData, frameIndex: currentTimeIndex, sliceIndex: currentLayerIndex });
    }
  };

  const handleZoom = (delta) => { 
    setZoomLevel(prev => Math.max(0.5, Math.min(3, prev + delta))); 
  };

  const resetView = () => { 
    setZoomLevel(1); 
    setPanOffset({ x: 0, y: 0 }); 
  };

  const downloadMask = useCallback((maskData) => {
    try {
      const { width, height } = canvasDimensions;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d');

      const rleData = maskData.segmentationmaskcontents || maskData.rle;
      const binaryMask = decodeRLE(rleData, height, width);
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      for (let i = 0; i < binaryMask.length; i++) {
        const pixelIndex = i * 4;
        const value = binaryMask[i] * 255;
        data[pixelIndex] = value; 
        data[pixelIndex + 1] = value; 
        data[pixelIndex + 2] = value; 
        data[pixelIndex + 3] = 255;
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

  // Undo function for second display
  const undoLastAction = useCallback(() => {
    if (drawingHistory.length > 0) {
      const newHistory = [...drawingHistory];
      newHistory.pop();
      setDrawingHistory(newHistory);
    }
  }, [drawingHistory]);

  // FIXED: Clear canvas function for second display
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
    
    // Clear drawing history and manual masks for current slice
    setDrawingHistory([]);
    const sliceKey = `${currentTimeIndex}_${currentLayerIndex}`;
    setManualMasks(prev => {
      const updated = { ...prev };
      delete updated[sliceKey];
      return updated;
    });
  }, [canvasDimensions, renderBackground, currentTimeIndex, currentLayerIndex]);

  // Calculate mask statistics - FIXED to include manual masks
  const maskStats = React.useMemo(() => {
    const sliceKey = `${currentTimeIndex}_${currentLayerIndex}`;
    const stats = [];
    
    // Add original AI mask stats
    availableMasks.forEach(mask => {
      try {
        const { width, height } = canvasDimensions;
        const rleData = mask.segmentationmaskcontents || mask.rle;
        if (rleData) {
          const binaryMask = decodeRLE(rleData, height, width);
          const pixelCount = binaryMask.reduce((sum, pixel) => sum + pixel, 0);
          const area = pixelCount * 0.25; // Assuming 0.25 mm² per pixel
          stats.push({ ...mask, pixelCount, area, type: 'AI' });
        } else {
          stats.push({ ...mask, pixelCount: 0, area: 0, type: 'AI' });
        }
      } catch (error) {
        console.error('Error calculating stats for AI mask:', mask.class, error);
        stats.push({ ...mask, pixelCount: 0, area: 0, type: 'AI' });
      }
    });
    
    // Add manual mask stats
    if (manualMasks[sliceKey]) {
      Object.entries(manualMasks[sliceKey]).forEach(([className, maskData]) => {
        try {
          const { width, height } = canvasDimensions;
          if (maskData.rle) {
            const binaryMask = decodeRLE(maskData.rle, height, width);
            const pixelCount = binaryMask.reduce((sum, pixel) => sum + pixel, 0);
            const area = pixelCount * 0.25;
            stats.push({ 
              class: className, 
              pixelCount, 
              area, 
              type: 'Manual',
              rle: maskData.rle,
              confidence: maskData.confidence 
            });
          }
        } catch (error) {
          console.error('Error calculating stats for manual mask:', className, error);
        }
      });
    }
    
    return stats;
  }, [availableMasks, canvasDimensions, manualMasks, currentTimeIndex, currentLayerIndex]);

  // Main render effect
// Main render effect
useEffect(() => {
  debouncedRender();

  if (isEditMode) {
    const bgCanvas = secondCanvasRef.current;
    if (bgCanvas && canvasDimensions.width > 0 && canvasDimensions.height > 0) {
      if (bgCanvas.width !== canvasDimensions.width || bgCanvas.height !== canvasDimensions.height) {
        bgCanvas.width = canvasDimensions.width;
        bgCanvas.height = canvasDimensions.height;
      }
      const bgCtx = bgCanvas.getContext('2d');
      renderImageToCanvas(
        bgCtx,
        currentImage?.url,
        canvasDimensions.width,
        canvasDimensions.height
      );
    }

    // 🚫 don't call redrawSecondOverlayCanvas() directly
    debouncedManualRedraw();
  }
}, [
  debouncedRender,
  isEditMode,
  canvasDimensions,
  debouncedManualRedraw,
  renderImageToCanvas,
  currentImage
]);



useEffect(() => {
  if (isEditMode) {
    debouncedManualRedraw();
  }
}, [
  debouncedManualRedraw,
  drawingHistory,
  manualMasks,
  currentBoundingBox,
  selectedClass,
  isEditMode
]);


  // Clear drawing history when slice/frame changes while in edit mode, or when exiting edit mode
  useEffect(() => {
    if (isEditMode) {
      console.log(`Edit mode active or slice changed (F:${currentTimeIndex}, S:${currentLayerIndex}). Clearing drawing history.`);
      setDrawingHistory([]);
    } else {
      setDrawingHistory([]);
    }
  }, [currentTimeIndex, currentLayerIndex, isEditMode]);

  useEffect(() => {
  return () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    debouncedRender.cancel();
  };
}, [debouncedRender]);

useEffect(() => {
  return () => {
    if (manualRafRef.current) cancelAnimationFrame(manualRafRef.current);
    debouncedManualRedraw.cancel();
  };
}, [debouncedManualRedraw]);




  // Initialize visible masks
  useEffect(() => {
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
  }, [currentTimeIndex, currentLayerIndex, sliceData, visibleMasks]);

  // When entering edit mode, set unsavedEdit to true
  const handleEditModeToggle = () => {
    if (!isEditMode) setUnsavedEdit(true);
    setIsEditMode(!isEditMode);
  };

  // Warn user on page unload if unsaved edits
  useEffect(() => {
    if (!unsavedEdit) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsavedEdit]);

  return (
    <div className="bg-white shadow-lg border border-gray-200 rounded-lg overflow-hidden">

      {/* Professional Header */}
{/* Streamlined Header */}
<div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-3 border-b border-gray-200">
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <Monitor className="w-4 h-4 text-[#5B7B9A]" />
        <span className="text-[#3A4454] font-medium">Cardiac Analysis Workspace</span>
      </div>
      <div className="text-[#3A4454]/70 text-sm">
        Frame {currentTimeIndex + 1} • Slice {currentLayerIndex + 1}
      </div>
      {availableMasks.length > 0 && (
        <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
          {availableMasks.length} AI Segments
        </div>
      )}
      {Object.keys(manualMasks).length > 0 && (
        <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
          {Object.values(manualMasks).reduce((total, slice) => total + Object.keys(slice).length, 0)} Manual
        </div>
      )}
    </div>
    <button
      onClick={handleEditModeToggle}
      className={`flex items-center space-x-2 px-3 py-1.5 rounded transition-all duration-300 ${
        isEditMode 
          ? 'bg-[#5B7B9A] text-white shadow-md' 
          : 'bg-white text-[#3A4454] border border-gray-200 hover:bg-gray-50'
      }`}
    >
      <Edit className="w-4 h-4" />
      <span className="text-sm font-medium">{isEditMode ? 'Exit Edit' : 'Edit Mode'}</span>
    </button>
  </div>
</div>

      {unsavedEdit && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <strong>Warning:</strong> You have unsaved manual annotations. Please save your work before leaving or changes will be lost.
        </div>
      )}

      <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}>
  {/* Canvas Area */}
  <div className="flex-1 relative flex bg-gray-50">
    <div className="flex flex-1 rounded-lg overflow-hidden shadow-inner">
      {/* Primary Canvas - AI ONLY (read-only) */}
      <div className={`${isEditMode ? 'flex-1 border-r border-gray-300' : 'w-full'} relative bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900`}>
              <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-sm text-white px-3 py-2 border border-white/10">
                {isEditMode ? 'AI Original (Read-Only)' : 'AI Segmentation Analysis'}
              </div>

              {/* Medical Grid Background */}
              <div className="absolute inset-0 opacity-5">
                <svg width="100%" height="100%" className="text-white">
                  <defs>
                    <pattern id="medicalGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="1"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#medicalGrid)" />
                </svg>
              </div>

              {/* Medical Crosshairs */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-green-400/30 to-transparent"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-px h-full bg-gradient-to-b from-transparent via-green-400/30 to-transparent"></div>
              </div>

              {/* Professional Corner Markers */}
              <div className="absolute top-6 left-6 w-6 h-6 border-l-2 border-t-2 border-green-400/60"></div>
              <div className="absolute top-6 right-6 w-6 h-6 border-r-2 border-t-2 border-green-400/60"></div>
              <div className="absolute bottom-6 left-6 w-6 h-6 border-l-2 border-b-2 border-green-400/60"></div>
              <div className="absolute bottom-6 right-6 w-6 h-6 border-r-2 border-b-2 border-green-400/60"></div>

              <canvas
  ref={canvasRef}
  className="absolute inset-0 w-full h-full"
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseUp}
  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
/>

             <canvas
  ref={overlayCanvasRef}
  className="absolute inset-0 w-full h-full pointer-events-none"
/>


              {/* Patient Info Overlay */}
              <div className="absolute bottom-6 left-6 bg-black/70 backdrop-blur-sm text-green-400 px-3 py-2 border border-white/10">
                <div className="text-sm font-medium">Patient: DEMO-001</div>
                <div className="text-xs text-green-300">Study: Cardiac MRI • Series: 4D Flow</div>
              </div>
            </div>

            {/* Secondary Canvas for Edit Mode - MANUAL ANNOTATIONS */}
            {isEditMode && (
              <div className="flex-1 relative bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
                <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-sm text-white px-3 py-2 border border-white/10">
                  Manual Annotations (Editable)
                </div>
                <div className="absolute top-4 right-4 z-10 flex space-x-2">
                  <button
                    onClick={undoLastAction}
                    className="bg-yellow-500/90 hover:bg-yellow-600 backdrop-blur-sm text-white p-2 transition-colors duration-200"
                    title="Undo"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearSecondCanvas}
                    className="bg-red-500/90 hover:bg-red-600 backdrop-blur-sm text-white p-2 transition-colors duration-200"
                    title="Clear Manual Annotations"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="relative w-full h-full">
                  <canvas
  ref={secondCanvasRef}
  className="absolute inset-0 w-full h-full"
  style={{ cursor: 'default' }}
/>

                  <canvas
  ref={secondOverlayCanvasRef}
  className="absolute inset-0 w-full h-full cursor-crosshair"
  onMouseDown={handleSecondCanvasMouseDown}
  onMouseMove={handleSecondCanvasMouseMove}
  onMouseUp={handleSecondCanvasMouseUp}
  onMouseLeave={handleSecondCanvasMouseUp}
/>

                </div>
              </div>
            )}
          </div>

          {/* Enhanced Overlay Controls */}
<div className="absolute top-4 left-4 flex space-x-2 bg-black/80 backdrop-blur-sm rounded-lg p-2">
            <div className="flex space-x-2">
              <button
                onClick={() => handleZoom(-0.2)}
                className="p-2 bg-black/70 backdrop-blur-sm text-white hover:bg-black/80 transition-all duration-200 border border-white/10 hover:border-white/20"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom(0.2)}
                className="p-2 bg-black/70 backdrop-blur-sm text-white hover:bg-black/80 transition-all duration-200 border border-white/10 hover:border-white/20"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={resetView}
                className="p-2 bg-black/70 backdrop-blur-sm text-white hover:bg-black/80 transition-all duration-200 border border-white/10 hover:border-white/20"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            
            <div className="bg-black/70 backdrop-blur-sm text-white text-sm px-3 py-2 border border-white/10">
              Zoom: {Math.round(zoomLevel * 100)}%
            </div>
          </div>
        </div>

{/* Enhanced Control Panel */}
<div className={`${isEditMode ? 'w-80' : 'w-80'} border-l border-gray-300 bg-white flex-shrink-0`}>
  <div className="h-full flex flex-col">
    {/* Panel Header */}
    <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-4 py-3 border-b border-gray-200">
      <div className="flex items-center space-x-2">
        <Target className="w-5 h-5 text-[#5B7B9A]" />
        <span className="text-[#3A4454] font-semibold">
          {isEditMode ? 'Annotation Tools' : 'Structure Analysis'}
        </span>
      </div>
    </div>
    
    {/* Scrollable Content */}
    <div className="flex-1 overflow-y-auto p-4">
            
            {/* Edit Mode Tools */}
            {isEditMode && (
              <div className="space-y-4 mb-6">
                {/* Class Selection */}
                <div>
                  <label className="text-[#3A4454] font-medium mb-2 block text-sm">Target Structure</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['MYO', 'LVC', 'RV'].map(className => (
                      <button
                        key={className}
                        onClick={() => setSelectedClass(className)}
                        className={`p-2 font-medium transition-all duration-200 border-2 text-sm ${
                          selectedClass === className
                            ? 'bg-[#5B7B9A] text-white border-[#5B7B9A] shadow-lg'
                            : 'bg-white text-[#3A4454] border-gray-200 hover:border-[#FDBA74] hover:bg-[#FDBA74]/5'
                        }`}
                      >
                        <div
                          className="w-3 h-3 mx-auto mb-1 border-2 border-white shadow-sm"
                          style={{ backgroundColor: getClassColor(className) }}
                        />
                        {className}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tool Selection */}
                <div>
                  <label className="text-[#3A4454] font-medium mb-2 block text-sm">Annotation Tool</label>
                  <div className="space-y-2">
                    {[
                      { value: 'brush', label: 'Precision Brush', icon: '🖌' },
                      { value: 'eraser', label: 'Eraser Tool', icon: '🧽' },
                      { value: 'boundingbox', label: 'Region Selector', icon: '⬛' }
                    ].map(tool => (
                      <button
                        key={tool.value}
                        onClick={() => setSelectedTool(tool.value)}
                        className={`w-full p-2 text-left transition-all duration-200 border-2 text-sm ${
                          selectedTool === tool.value
                            ? 'bg-gradient-to-r from-[#FDBA74] to-orange-400 text-white border-[#FDBA74] shadow-lg'
                            : 'bg-white text-[#3A4454] border-gray-200 hover:border-[#5B7B9A] hover:bg-[#5B7B9A]/5'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{tool.icon}</span>
                          <span className="font-medium">{tool.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brush Size Control */}
                {(selectedTool === 'brush' || selectedTool === 'eraser') && (
                  <div>
                    <label className="text-[#3A4454] font-medium mb-2 block text-sm">
                      {selectedTool === 'brush' ? 'Brush' : 'Eraser'} Size: {brushSize}px
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="50"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 appearance-none cursor-pointer medical-slider"
                    />
                    <div className="flex justify-between text-xs text-[#3A4454]/60 mt-1">
                      <span>Fine</span>
                      <span>Broad</span>
                    </div>
                  </div>
                )}

                {/* AI Smart Segmentation */}
                <button
                  onClick={handleStartManualSegmentation}
                  disabled={!drawingHistory.some(action => action.type === 'boundingbox')}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-blue-600 hover:to-purple-600 text-white disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-xl text-sm"
                >
                  <Brain className="w-4 h-4" />
                  <span className="font-semibold">AI Smart Segmentation</span>
                </button>

                {/* Apply Brush Strokes Button */}
                <button
                  onClick={handleApplyBrushStrokes}
                  disabled={!drawingHistory.some(action => action.type === 'brush' && action.class === selectedClass)}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-emerald-600 hover:to-green-600 text-white disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-xl text-sm"
                >
                  <Target className="w-4 h-4" />
                  <span className="font-semibold">Apply Manual Annotation for {selectedClass}</span>
                </button>

                {/* Debug Info for Drawing History */}
                <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                  <div className="text-gray-700">
                    <div>Drawing History: {drawingHistory.length} actions</div>
                    <div>Selected Class: <span className="font-medium" style={{ color: getClassColor(selectedClass) }}>{selectedClass}</span></div>
                    <div>Selected Tool: <span className="font-medium">{selectedTool}</span></div>
                    <div>Brush Strokes for {selectedClass}: {drawingHistory.filter(action => action.type === 'brush' && action.class === selectedClass).length}</div>
                    <div>Bounding Boxes: {drawingHistory.filter(action => action.type === 'boundingbox').length}</div>
                    <div>Manual Masks: {Object.keys(manualMasks).reduce((total, key) => total + Object.keys(manualMasks[key]).length, 0)}</div>
                    <div>Edit Mode: {isEditMode ? 'Active' : 'Inactive'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Opacity Control */}
            <div className="mb-6">
              <label className="text-[#3A4454] font-medium mb-3 block text-sm">Overlay Transparency</label>
              <div className="relative">
                <input
                  type="range"
                  min="0.3"
                  max="1"
                  step="0.1"
                  value={maskOpacity}
                  onChange={(e) => setMaskOpacity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 appearance-none cursor-pointer medical-slider"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-[#3A4454]/60">Semi-transparent</span>
                  <div className="text-[#3A4454] font-bold text-sm">{Math.round(maskOpacity * 100)}%</div>
                  <span className="text-xs text-[#3A4454]/60">Opaque</span>
                </div>
              </div>
            </div>

            {/* Enhanced Mask List */}
            <div className="space-y-3">
              {maskStats.length === 0 ? (
                <div className="text-center py-12 text-[#3A4454]/60">
                  <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <div className="text-lg font-medium mb-2">No Segmentation Data</div>
                  <div className="text-sm">Upload medical imaging files to begin analysis</div>
                </div>
              ) : (
                maskStats.map((mask, index) => {
                  const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
                  const isVisible = visibleMasks[maskId] !== false;
                  const isSelected = selectedMask && selectedMask.class === mask.class;
                  
                  return (
                    <div
                      key={`${maskId}_${mask.type}_${index}`}
                      className={`p-4 border-2 cursor-pointer transition-all duration-300 ${
                        isSelected 
                          ? 'border-[#5B7B9A] bg-gradient-to-br from-[#5B7B9A]/10 to-[#3A4454]/5 shadow-lg' 
                          : 'border-gray-200 bg-white hover:border-[#FDBA74] hover:bg-gradient-to-br hover:from-[#FDBA74]/5 hover:to-orange-50 hover:shadow-md'
                      }`}
                      onClick={() => handleMaskClick(mask)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div
                              className="w-5 h-5 border-3 border-white shadow-lg"
                              style={{ backgroundColor: getClassColor(mask.class) }}
                            />
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#5B7B9A] border-2 border-white"></div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[#3A4454] font-bold">{mask.class}</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                mask.type === 'AI' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {mask.type}
                              </span>
                            </div>
                            <div className="text-[#3A4454]/70 text-xs">{getStructureName(mask.class)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadMask(mask);
                            }}
                            className="p-1 text-[#3A4454]/60 hover:text-[#5B7B9A] hover:bg-[#5B7B9A]/10 transition-colors duration-200"
                            title="Download Mask"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          {mask.type === 'AI' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMaskVisibility(maskId);
                              }}
                              className={`p-1 transition-all duration-200 ${
                                isVisible 
                                  ? 'text-[#5B7B9A] bg-[#5B7B9A]/10 hover:bg-[#5B7B9A]/20' 
                                  : 'text-gray-400 hover:text-[#5B7B9A] hover:bg-[#5B7B9A]/10'
                              }`}
                            >
                              {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Enhanced Statistics */}
                      {showStats && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="bg-[#F8F2E6] p-2">
                            <div className="text-xs text-[#3A4454]/60 mb-1">Volume</div>
                            <div className="text-[#3A4454] font-bold text-sm">{mask.area.toFixed(1)} mL</div>
                          </div>
                          <div className="bg-[#F8F2E6] p-2">
                            <div className="text-xs text-[#3A4454]/60 mb-1">Pixels</div>
                            <div className="text-[#3A4454] font-bold text-sm">{mask.pixelCount.toLocaleString()}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Manual Annotation Actions (only in edit mode) */}
            {isEditMode && (
              <div className="mt-6 p-4 border-t border-gray-200">
                <h4 className="font-semibold mb-3 text-[#3A4454]">Manual Annotation</h4>
                <div className="space-y-3">
                  <button
                    onClick={onSaveManualAnnotations}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  >
                    <Target size={16} />
                    Update and Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Professional Footer */}
      {/* Compact Status Footer */}
<div className="bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full shadow-sm ${
                  processingComplete ? 'bg-green-500 animate-pulse' : 
                  isProcessing ? 'bg-[#FDBA74] animate-pulse' : 'bg-gray-400'
                }`} />
                <span className="text-[#3A4454] font-medium">
                  {processingComplete ? 'Analysis Complete' : 
                   isProcessing ? 'AI Processing Active' : 'System Ready'}
                </span>
              </div>
              
              {processingComplete && (
                <div className="flex items-center space-x-6">
                  <div className="text-[#3A4454]/70">
                    <span className="font-medium">Project:</span> {projectId}
                  </div>
                  <div className="text-[#3A4454]/70">
                    <span className="font-medium">Segments:</span> {segmentationData?.segments?.length || 0}
                  </div>
                  <div className="text-[#3A4454]/70">
                    <span className="font-medium">Quality:</span> Clinical Grade
                  </div>
                </div>
              )}

              {uploadingMasks && (
                <div className="text-[#FDBA74] animate-pulse font-medium">
                  Cloud synchronization in progress...
                </div>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-[#3A4454] font-semibold">
                VisHeart Professional Platform v2.1
              </div>
              <div className="text-[#3A4454]/60 text-sm">
                Last updated: {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for medical slider styling */}
      <style jsx>{`
        .medical-slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #5B7B9A;
          border: 2px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        
        .medical-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          background: #3A4454;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        
        .medical-slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #5B7B9A;
          border: 2px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default MedicalSegmentationDisplay;
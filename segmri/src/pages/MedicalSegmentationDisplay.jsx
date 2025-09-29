// FIXED MedicalSegmentationDisplay.jsx with working editing tools
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Heart, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Download, Edit, Trash2, 
  Plus, Target, Brain, Activity, Grid, Maximize2, Info, Settings, AlertCircle, Monitor,
  ChevronLeft, ChevronRight, Play, Pause, Clock, Layers  // ADD Layers here
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
    'MYO': '#1F2937',    // Dark gray for Myocardium
    'LVC': '#374151',    // Dark blue-gray for Left Ventricle Cavity
    'RV': '#DC2626'      // Dark red for Right Ventricle
  };
  return colors[className] || '#6B21A8';
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
  maxTimeIndex,        
  maxLayerIndex,  
  api,
  manualTimeIndex,
  manualLayerIndex,
  onEditModeToggle
}) => {
  // Canvas refs
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const secondCanvasRef = useRef(null);
  const secondOverlayCanvasRef = useRef(null);
  const imageLoadCancelRef = useRef(null);
  const rafRef = useRef(null);
  const manualRafRef = useRef(null);

  // State
  const [visibleMasks, setVisibleMasks] = useState({});
  const [maskOpacity, setMaskOpacity] = useState(0.8); // Increased opacity for better visibility
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
  const [brushSize, setBrushSize] = useState(15); // Larger default brush size
  const [currentBoundingBox, setCurrentBoundingBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [unsavedEdit, setUnsavedEdit] = useState(false);

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
        tempCtx.lineWidth = action.lineWidth || 15;
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

  // Image rendering with proper URL guard
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
          const offscreen = document.createElement("canvas");
          offscreen.width = targetCanvasWidth;
          offscreen.height = targetCanvasHeight;
          const offCtx = offscreen.getContext("2d");

          offCtx.fillStyle = "#0F172A";
          offCtx.fillRect(0, 0, targetCanvasWidth, targetCanvasHeight);

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

          offCtx.setTransform(zoomLevel, 0, 0, zoomLevel, panOffset.x, panOffset.y);
          offCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

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

    if (imageLoadCancelRef.current) {
      try {
        imageLoadCancelRef.current();
      } catch (e) {
        /* ignore */
      }
      imageLoadCancelRef.current = null;
    }

    const drawOverlayMasks = () => {
      if (!sliceData) return;

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

      overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
    };

    if (currentImage && currentImage.url) {
      const url = currentImage.url;
      imageLoadCancelRef.current = renderImageToCanvas(ctx, url, width, height, () => {
        if (currentImage.url === url) {
          drawOverlayMasks();
        }
      });
    } else {
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

  // FIXED: Manual canvas redraw function with better visibility
  const redrawSecondOverlayCanvas = useCallback(() => {
    const overlayCanvas = secondOverlayCanvasRef.current;
    if (!overlayCanvas || canvasDimensions.width === 0) return;

    const { width, height } = canvasDimensions;
    
    if (overlayCanvas.width !== width || overlayCanvas.height !== height) {
      overlayCanvas.width = width;
      overlayCanvas.height = height;
    }
    
    const ctx = overlayCanvas.getContext('2d');
    
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.restore();

    ctx.setTransform(zoomLevel, 0, 0, zoomLevel, panOffset.x, panOffset.y);

    // Render base masks from activeManualSegmentation or original AI data
    let baseMasksToRender = [];
    const originalSliceData = getCurrentSliceData();

    let manualDataForCurrentSlice = null;
    if (activeManualSegmentation && activeManualSegmentation.frames) {
      const frameInData = activeManualSegmentation.frames.find(f => f.frameindex === manualTimeIndex); // ← Changed
      if (frameInData && frameInData.slices) {
        const sliceInData = frameInData.slices.find(s => s.sliceindex === manualLayerIndex); // ← Changed
        if (sliceInData && sliceInData.segmentationmasks) {
          manualDataForCurrentSlice = sliceInData.segmentationmasks;
        }
      }
    }

    if (manualDataForCurrentSlice && manualDataForCurrentSlice.length > 0) {
      baseMasksToRender = manualDataForCurrentSlice;
    } else if (originalSliceData?.segmentationMasks) {
      baseMasksToRender = originalSliceData.segmentationMasks;
    }

    // Render base masks with increased opacity
    if (baseMasksToRender.length > 0) {
      baseMasksToRender.forEach((maskData) => {
        const maskId = `${maskData.class}_${currentTimeIndex}_${currentLayerIndex}`;
        const isVisible = visibleMasks[maskId] !== false;

        if (isVisible) {
          try {
            const rleData = maskData.segmentationmaskcontents || maskData.rle;
            if (rleData) {
              const binaryMask = decodeRLE(rleData, height, width);
              const classColor = getClassColor(maskData.class);
              renderMaskOnCanvas(overlayCanvas, binaryMask, width, height, classColor, maskOpacity * 0.7, imageTransform);
            }
          } catch (error) {
            console.error(`Error processing mask ${maskData.class} for manual canvas:`, error);
          }
        }
      });
    }

    // FIXED: Render drawing history with much better visibility
    ctx.globalAlpha = 1.0; // Full opacity for drawing history
    drawingHistory.forEach(action => {
      if ((action.type === 'brush' || action.type === 'eraser') && action.points && action.points.length > 0) {
        ctx.globalCompositeOperation = action.type === 'eraser' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = getClassColor(action.class);
        ctx.lineWidth = action.lineWidth || brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = getClassColor(action.class);
        ctx.shadowBlur = 3; // Add glow effect for better visibility

        ctx.beginPath();
        ctx.moveTo(action.points[0].x, action.points[0].y);
        for (let i = 1; i < action.points.length; i++) {
          ctx.lineTo(action.points[i].x, action.points[i].y);
        }
        ctx.stroke();
        
        ctx.shadowBlur = 0; // Reset shadow
      } else if (action.type === 'boundingbox' && action.rect) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = getClassColor(action.class);
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]); // Dashed line for better visibility
        ctx.shadowColor = getClassColor(action.class);
        ctx.shadowBlur = 2;
        ctx.strokeRect(action.rect.x, action.rect.y, action.rect.width, action.rect.height);
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
      }
    });

    // FIXED: Draw current bounding box with proper visibility
    if (currentBoundingBox) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = getClassColor(selectedClass);
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 5]);
      ctx.shadowColor = getClassColor(selectedClass);
      ctx.shadowBlur = 3;
      
      const { startX, startY, currentX, currentY } = currentBoundingBox;
      const rectX = Math.min(startX, currentX);
      const rectY = Math.min(startY, currentY);
      const rectWidth = Math.abs(startX - currentX);
      const rectHeight = Math.abs(startY - currentY);
      
      if (rectWidth > 2 || rectHeight > 2) {
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
      }
      
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [
  drawingHistory,
  currentBoundingBox,
  canvasDimensions,
  visibleMasks,
  maskOpacity,
  imageTransform,
  manualTimeIndex, // ← Changed
  manualLayerIndex, // ← Changed
  selectedClass,
  brushSize,
  sliceData,
  activeManualSegmentation,
  zoomLevel,
  panOffset,
  getCurrentSliceData
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
    () => debounce(scheduleRender, 16),
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

  const getCanvasCoordinates = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const scaledX = canvasX * scaleX;
    const scaledY = canvasY * scaleY;

    return {
      x: (scaledX - panOffset.x) / zoomLevel,
      y: (scaledY - panOffset.y) / zoomLevel
    };
  }, [zoomLevel, panOffset]);

  // FIXED: Mouse down handler with immediate redraw
  const handleSecondCanvasMouseDown = useCallback(
  (e) => {
    if (!isEditMode) return;

    const canvas = secondOverlayCanvasRef.current;
    if (!canvas) return;

    // Check if this should be a pan operation (same logic as main canvas)
    const shouldPan = e.button === 1 || // Middle mouse button
                     e.ctrlKey ||      // Ctrl key
                     e.metaKey ||      // Cmd key (Mac)
                     selectedTool === 'pan'; // Pan tool selected

    if (shouldPan) {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return; // Don't do anything else
    }

    // Only do drawing operations if not panning
    const coords = getCanvasCoordinates(e, canvas);

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
      setTimeout(() => redrawSecondOverlayCanvas(), 0);
    } else if (selectedTool === "boundingbox") {
      setCurrentBoundingBox({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
        class: selectedClass,
      });
      setIsDrawing(true);
      setTimeout(() => redrawSecondOverlayCanvas(), 0);
    }

    setUnsavedEdit(true);
  },
  [isEditMode, selectedTool, selectedClass, getCanvasCoordinates, brushSize, redrawSecondOverlayCanvas]
);

  // FIXED: Mouse move handler with immediate canvas updates
  const handleSecondCanvasMouseMove = useCallback(
  (e) => {
    if (!isEditMode) return;

    const canvas = secondOverlayCanvasRef.current;
    if (!canvas) return;

    // Handle panning FIRST (same logic as main canvas)
    if (isDragging) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const deltaXClient = e.clientX - lastMousePos.x;
      const deltaYClient = e.clientY - lastMousePos.y;

      const deltaCanvasX = deltaXClient * scaleX;
      const deltaCanvasY = deltaYClient * scaleY;

      // This is the key fix - update the shared panOffset state
      setPanOffset(prev => ({ 
        x: prev.x + deltaCanvasX, 
        y: prev.y + deltaCanvasY 
      }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return; // Don't do drawing while panning
    }

    // Only handle drawing if not panning
    if (!isDrawing) return;

    const coords = getCanvasCoordinates(e, canvas);

    if (selectedTool === "brush" || selectedTool === "eraser") {
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
        
        setTimeout(() => redrawSecondOverlayCanvas(), 0);
        return newHistory;
      });
    } else if (selectedTool === "boundingbox" && currentBoundingBox) {
      setCurrentBoundingBox((prev) => ({
        ...prev,
        currentX: coords.x,
        currentY: coords.y,
      }));
      
      setTimeout(() => redrawSecondOverlayCanvas(), 0);
    }
  },
  [
    isEditMode,
    isDragging,
    isDrawing,
    selectedTool,
    currentBoundingBox,
    getCanvasCoordinates,
    redrawSecondOverlayCanvas,
    lastMousePos
  ]
);

  // FIXED: Mouse up handler with immediate completion redraw
  const handleSecondCanvasMouseUp = useCallback(() => {
  if (!isEditMode) return;
  
  // End panning
  if (isDragging) {
    setIsDragging(false);
    return;
  }

  // End drawing
  if (!isDrawing) return;
  setIsDrawing(false);

  if (selectedTool === "boundingbox" && currentBoundingBox) {
    const { startX, startY, currentX, currentY, class: boxClass } = currentBoundingBox;
    const rectX = Math.min(startX, currentX);
    const rectY = Math.min(startY, currentY);
    const rectWidth = Math.abs(startX - currentX);
    const rectHeight = Math.abs(startY - currentY);

    if (rectWidth > 5 && rectHeight > 5) {
      setDrawingHistory((prev) => {
        const newHistory = [
          ...prev,
          {
            type: "boundingbox",
            class: boxClass,
            rect: { x: rectX, y: rectY, width: rectWidth, height: rectHeight },
          },
        ];
        
        // Force redraw after state update
        setTimeout(() => redrawSecondOverlayCanvas(), 0);
        return newHistory;
      });
    }
    
    setCurrentBoundingBox(null);
  }

  // Final redraw to show completed stroke/box
  setTimeout(() => redrawSecondOverlayCanvas(), 0);
}, [
  isEditMode,
  isDragging,
  isDrawing,
  selectedTool,
  currentBoundingBox,
  redrawSecondOverlayCanvas,
]);

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
  
  let adjustedBox = { ...box };
  if (imageTransform) {
    adjustedBox = {
      x: Math.max(0, Math.round((box.x - imageTransform.offsetX) / imageTransform.scaleX)),
      y: Math.max(0, Math.round((box.y - imageTransform.offsetY) / imageTransform.scaleY)),
      width: Math.round(box.width / imageTransform.scaleX),
      height: Math.round(box.height / imageTransform.scaleY)
    };
    
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

  try {
    if (api) {
      const response = await api.post(`/segmentation/start-manual-segmentation/${projectId}`, payload);

      if (response.data && response.data.segmentations && response.data.segmentations.length > 0) {
        const newSegmentation = response.data.segmentations[0];
        
        if (newSegmentation.frames && newSegmentation.frames.length > 0) {
          setActiveManualSegmentation(prevSegmentation => {
            if (!prevSegmentation) {
              return {
                name: `Manual Edit - Project ${projectId}`,
                description: "User-edited segmentation",
                isMedSAMOutput: false,
                isEditable: true,
                isSaved: false,
                frames: newSegmentation.frames
              };
            }

            const updatedSegmentation = JSON.parse(JSON.stringify(prevSegmentation));
            updatedSegmentation.isSaved = false;

            newSegmentation.frames.forEach(newFrame => {
              const frameIndex = newFrame.frameindex;
              
              let targetFrame = updatedSegmentation.frames.find(f => f.frameindex === frameIndex);
              if (!targetFrame) {
                targetFrame = {
                  frameindex: frameIndex,
                  frameinferred: newFrame.frameinferred || false,
                  slices: []
                };
                updatedSegmentation.frames.push(targetFrame);
                updatedSegmentation.frames.sort((a, b) => a.frameindex - b.frameindex);
              }

              newFrame.slices.forEach(newSlice => {
                const sliceIndex = newSlice.sliceindex;
                
                let targetSlice = targetFrame.slices.find(s => s.sliceindex === sliceIndex);
                if (!targetSlice) {
                  targetSlice = {
                    sliceindex: sliceIndex,
                    segmentationmasks: [],
                    componentboundingboxes: []
                  };
                  targetFrame.slices.push(targetSlice);
                  targetFrame.slices.sort((a, b) => a.sliceindex - b.sliceindex);
                }

                targetSlice.segmentationmasks = newSlice.segmentationmasks || [];
                if (newSlice.componentboundingboxes) {
                  targetSlice.componentboundingboxes = newSlice.componentboundingboxes;
                }
              });
            });

            return updatedSegmentation;
          });

          setDrawingHistory(prev => prev.filter(action => action !== lastBoundingBoxAction));
          
          // Force immediate complete redraw to show AI segmentation results
          setTimeout(() => {
            const overlayCanvas = secondOverlayCanvasRef.current;
            if (overlayCanvas) {
              const ctx = overlayCanvas.getContext('2d');
              // Force clear and complete redraw
              ctx.save();
              ctx.setTransform(1, 0, 0, 1, 0, 0);
              ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
              ctx.restore();
              
              // Now redraw everything from activeManualSegmentation state
              redrawSecondOverlayCanvas();
            }
          }, 200);
          
          alert(`AI segmentation completed! Generated masks for the selected region.`);
        } else {
          alert('AI segmentation completed but no frames were generated.');
        }
      } else {
        alert('AI segmentation completed but returned unexpected data format.');
      }
      
    } else {
      alert('API not available. Please check your connection.');
    }
  } catch (error) {
    console.error('Manual segmentation failed:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
    alert(`Manual segmentation failed: ${errorMessage}`);
  }
}, [drawingHistory, currentImage, projectId, api, imageTransform, selectedClass, canvasDimensions, redrawSecondOverlayCanvas]);

  // Initialize activeManualSegmentation when entering edit mode
  useEffect(() => {
  if (isEditMode) {
    if (segmentationData && (!activeManualSegmentation || activeManualSegmentation.isMedSAMOutput === true)) {
      console.log("Edit mode: Initializing activeManualSegmentation from AI data.");

      const transformedFrames = [];
      if (segmentationData.masks && Array.isArray(segmentationData.masks)) {
        segmentationData.masks.forEach((frameSlicesArray, frameIdx) => {
          if (frameSlicesArray && Array.isArray(frameSlicesArray)) {
            const slicesForCurrentFrame = [];
            frameSlicesArray.forEach((sliceObject, sliceIdx) => {
              if (sliceObject && sliceObject.segmentationMasks && Array.isArray(sliceObject.segmentationMasks)) {
                slicesForCurrentFrame.push({
                  sliceindex: sliceIdx,
                  // CRITICAL: Deep clone to preserve exact RLE data
                  segmentationmasks: sliceObject.segmentationMasks.map(mask => ({
                    class: mask.class,
                    segmentationmaskcontents: mask.segmentationmaskcontents || mask.rle,
                    // Preserve any other properties
                    ...mask
                  }))
                });
              }
            });
            if (slicesForCurrentFrame.length > 0) {
              transformedFrames.push({
                frameindex: frameIdx,
                frameinferred: false, 
                slices: slicesForCurrentFrame
              });
            }
          }
        });
      }

      setActiveManualSegmentation({
        name: `Manual Edit - ${segmentationData.name || `Project ${projectId}`}`,
        description: segmentationData.description || "User-edited segmentation",
        isMedSAMOutput: false,
        isEditable: true,
        isSaved: false,
        frames: transformedFrames,
      });
    } else if (!segmentationData && !activeManualSegmentation) {
      console.log("Edit mode: No AI data, initializing empty activeManualSegmentation.");
      setActiveManualSegmentation({
        name: `Manual Edit - Project ${projectId}`,
        description: "User-edited segmentation",
        isMedSAMOutput: false,
        isEditable: true,
        isSaved: false,
        frames: []
      });
    }
  }
}, [isEditMode, segmentationData, projectId, activeManualSegmentation]);

  // FIXED: Apply brush strokes with immediate visual update
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

  setActiveManualSegmentation(prevSegmentation => {
    if (!prevSegmentation) return null;

    const updatedSegmentation = JSON.parse(JSON.stringify(prevSegmentation));
    updatedSegmentation.isSaved = false;

    let targetFrame = updatedSegmentation.frames.find(f => f.frameindex === currentTimeIndex);
    if (!targetFrame) {
      targetFrame = { frameindex: currentTimeIndex, frameinferred: false, slices: [] };
      updatedSegmentation.frames.push(targetFrame);
      updatedSegmentation.frames.sort((a, b) => a.frameindex - b.frameindex);
    }

    let targetSlice = targetFrame.slices.find(s => s.sliceindex === currentLayerIndex);
    if (!targetSlice) {
      targetSlice = { sliceindex: currentLayerIndex, segmentationmasks: [], componentboundingboxes: [] };
      targetFrame.slices.push(targetSlice);
      targetFrame.slices.sort((a, b) => a.sliceindex - b.sliceindex);
    }

    let maskForClass = targetSlice.segmentationmasks.find(m => m.class === selectedClass);
    if (maskForClass) {
      maskForClass.segmentationmaskcontents = rleString;
    } else {
      targetSlice.segmentationmasks.push({
        class: selectedClass,
        segmentationmaskcontents: rleString,
      });
    }
    
    console.log(`Applied brush strokes for class ${selectedClass} to activeManualSegmentation.`);
    return updatedSegmentation;
  });

  setDrawingHistory(prevHistory =>
    prevHistory.filter(action => !(action.type === 'brush' && action.class === selectedClass))
  );
  
  alert(`Applied ${relevantBrushActions.length} brush strokes for class ${selectedClass}. Manual annotation updated.`);
  
  // REMOVED: The manual canvas clearing and redraw - let useEffect handle it
  // The useEffect above will automatically trigger redraw when activeManualSegmentation changes
  
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

  const undoLastAction = useCallback(() => {
  if (drawingHistory.length > 0) {
    setDrawingHistory(prev => {
      const newHistory = prev.slice(0, -1); // Remove last action
      console.log(`Undo: Removed action. History length: ${prev.length} -> ${newHistory.length}`);
      return newHistory;
    });
    
    // Force immediate redraw after undo
    setTimeout(() => {
      redrawSecondOverlayCanvas();
    }, 0);
    
    setUnsavedEdit(true);
  }
}, [drawingHistory.length, redrawSecondOverlayCanvas]);

  // FIXED: Clear canvas with proper state clearing
const clearSecondCanvas = useCallback(() => {
  const canvas = secondCanvasRef.current;
  const overlayCanvas = secondOverlayCanvasRef.current;
  
  if (canvas && overlayCanvas) {
    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
    overlayCtx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
    
    renderBackground(ctx, canvasDimensions.width, canvasDimensions.height);
  }
  
  // Clear ALL annotation state - not just drawing history
  setDrawingHistory([]);
  setCurrentBoundingBox(null);
  
  // CRITICAL: Clear the manual segmentation for current slice
  setActiveManualSegmentation(prev => {
    if (!prev) return prev;
    
    const updated = JSON.parse(JSON.stringify(prev));
    
    // Remove the current slice's manual masks
    const targetFrame = updated.frames.find(f => f.frameindex === currentTimeIndex);
    if (targetFrame) {
      const targetSlice = targetFrame.slices.find(s => s.sliceindex === currentLayerIndex);
      if (targetSlice) {
        // Clear only manual masks, keep original AI masks
        targetSlice.segmentationmasks = [];
      }
    }
    
    return updated;
  });
  
}, [canvasDimensions, renderBackground, currentTimeIndex, currentLayerIndex]);

  // Calculate mask statistics
  const maskStats = React.useMemo(() => {
    const stats = [];
    
    availableMasks.forEach(mask => {
      try {
        const { width, height } = canvasDimensions;
        const rleData = mask.segmentationmaskcontents || mask.rle;
        if (rleData) {
          const binaryMask = decodeRLE(rleData, height, width);
          const pixelCount = binaryMask.reduce((sum, pixel) => sum + pixel, 0);
          const area = pixelCount * 0.25;
          stats.push({ ...mask, pixelCount, area, type: 'AI' });
        } else {
          stats.push({ ...mask, pixelCount: 0, area: 0, type: 'AI' });
        }
      } catch (error) {
        console.error('Error calculating stats for AI mask:', mask.class, error);
        stats.push({ ...mask, pixelCount: 0, area: 0, type: 'AI' });
      }
    });
    
    return stats;
  }, [availableMasks, canvasDimensions]);

  // Main render effect
  useEffect(() => {
  if (isEditMode) {
    // Force immediate render for AI canvas in edit mode
    renderMainCanvas();
  } else {
    debouncedRender();
  }

  if (isEditMode) {
    const bgCanvas = secondCanvasRef.current;
    if (bgCanvas && canvasDimensions.width > 0 && canvasDimensions.height > 0) {
      if (bgCanvas.width !== canvasDimensions.width || bgCanvas.height !== canvasDimensions.height) {
        bgCanvas.width = canvasDimensions.width;
        bgCanvas.height = canvasDimensions.height;
      }
      const bgCtx = bgCanvas.getContext('2d');
      
      const manualImage = findClosestImage(extractedImages, manualTimeIndex, manualLayerIndex);
      
      renderImageToCanvas(
        bgCtx,
        manualImage?.url,
        canvasDimensions.width,
        canvasDimensions.height
      );
    }

    debouncedManualRedraw();
  }
}, [
  debouncedRender,
  renderMainCanvas, // ADD THIS
  isEditMode,
  canvasDimensions,
  debouncedManualRedraw,
  renderImageToCanvas,
  currentImage,
  currentTimeIndex,
  currentLayerIndex,
  manualTimeIndex,
  manualLayerIndex,
  extractedImages
]);

  // CORRECTED: useEffect that properly triggers redraws
useEffect(() => {
  if (isEditMode) {
    // Force immediate redraw when any relevant state changes
    redrawSecondOverlayCanvas();
  }
}, [
  isEditMode,
  drawingHistory,
  currentBoundingBox,
  selectedClass,
  activeManualSegmentation, // CRITICAL: This was missing
  visibleMasks,
  maskOpacity,
  currentTimeIndex, // CRITICAL: These trigger slice changes
  currentLayerIndex, // CRITICAL: These trigger slice changes
  redrawSecondOverlayCanvas
]);

  // Clear drawing history when slice/frame changes while in edit mode
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
    // Call the parent's edit mode toggle handler
    if (onEditModeToggle) {
      onEditModeToggle(!isEditMode);
    }
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
    <div className="bg-white shadow-lg border border-gray-200 overflow-hidden">

      {/* Professional Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-gray-300" />
              <span className="text-white font-medium">Cardiac Analysis Workspace</span>
            </div>
            <div className="text-gray-300 text-sm">
              Frame {currentTimeIndex + 1} • Slice {currentLayerIndex + 1}
            </div>
            {availableMasks.length > 0 && (
              <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                {availableMasks.length} AI Segments
              </div>
            )}
          </div>
          <button
            onClick={handleEditModeToggle}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded transition-all duration-300 ${
              isEditMode 
                ? 'bg-red-600 text-white shadow-md hover:bg-red-700' 
                : 'bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600'
            }`}
          >
            <Edit className="w-4 h-4" />
            <span className="text-sm font-medium">{isEditMode ? 'Exit Edit' : 'Edit Mode'}</span>
          </button>
        </div>
      </div>

      <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}>
        {/* Canvas Area */}
        <div className="flex-1 relative flex bg-gray-50">
          <div className="flex flex-1 overflow-hidden shadow-inner">
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
            </div>

            {/* Secondary Canvas for Edit Mode - MANUAL ANNOTATIONS */}
            {isEditMode && (
              <div className="flex-1 relative bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
                <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-sm text-white px-3 py-2 border border-white/10">
                  Manual Annotations (Editable)
                </div>

                <div className="absolute top-4 right-4 z-10 flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      undoLastAction();
                    }}
                    disabled={drawingHistory.length === 0}
                    className={`p-2 transition-colors duration-200 ${
                      drawingHistory.length === 0 
                        ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                    }`}
                    title={`Undo${drawingHistory.length > 0 ? ` (${drawingHistory.length} actions)` : ' (No actions)'}`}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearSecondCanvas}
                    className="bg-red-700 hover:bg-red-800 backdrop-blur-sm text-white p-2 transition-colors duration-200"
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
                    className="absolute inset-0 w-full h-full"
                    onMouseDown={handleSecondCanvasMouseDown}
                    onMouseMove={handleSecondCanvasMouseMove}
                    onMouseUp={handleSecondCanvasMouseUp}
                    onMouseLeave={() => {
                      setIsDrawing(false);
                      setIsDragging(false);
                    }}
                    style={{ 
                      cursor: isDragging ? 'grabbing' : 
                            (selectedTool === 'boundingbox' ? 'crosshair' : 'grab'),
                      touchAction: 'none'
                    }}
                    title="Drag to pan • Ctrl/Cmd+drag to pan • Click to annotate"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Control Panel */}
        <div className={`${isEditMode ? 'w-84' : 'w-80'} border-l border-gray-300 bg-white flex-shrink-0`}>
          <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-3 border-b border-gray-700">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-gray-300" />
                <span className="text-white font-semibold">
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
                    <label className="text-gray-800 font-medium mb-2 block text-sm">Target Structure</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['MYO', 'LVC', 'RV'].map(className => (
                        <button
                          key={className}
                          onClick={() => setSelectedClass(className)}
                          className={`p-2 font-medium transition-all duration-200 border-2 text-sm ${
                            selectedClass === className
                              ? 'bg-gray-800 text-white border-gray-800 shadow-lg'
                              : 'bg-white text-gray-800 border-gray-300 hover:border-gray-600 hover:bg-gray-100'
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
                    <label className="text-gray-800 font-medium mb-2 block text-sm">Annotation Tool</label>
                    <div className="space-y-2">
                      {[
                        { value: 'brush', label: 'Precision Brush', icon: '🖌️' },
                        { value: 'eraser', label: 'Eraser Tool', icon: '🧽' },
                        { value: 'boundingbox', label: 'Region Selector', icon: '⬛' }
                      ].map(tool => (
                        <button
                          key={tool.value}
                          onClick={() => setSelectedTool(tool.value)}
                          className={`w-full p-2 text-left transition-all duration-200 border-2 text-sm ${
                            selectedTool === tool.value
                              ? 'bg-gradient-to-r from-gray-800 to-gray-700 text-white border-gray-800 shadow-lg'
                              : 'bg-white text-gray-800 border-gray-300 hover:border-gray-600 hover:bg-gray-100'
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
                      <label className="text-gray-800 font-medium mb-2 block text-sm">
                        {selectedTool === 'brush' ? 'Brush' : 'Eraser'} Size: {brushSize}px
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 appearance-none cursor-pointer medical-slider"
                      />
                      <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>Fine</span>
                        <span>Broad</span>
                      </div>
                    </div>
                  )}

                  {/* AI Smart Segmentation */}
                  <button
                    onClick={handleStartManualSegmentation}
                    disabled={!drawingHistory.some(action => action.type === 'boundingbox')}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-800 hover:to-purple-800 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl text-sm"
                  >
                    <Brain className="w-4 h-4" />
                    <span className="font-semibold">AI Smart Segmentation</span>
                  </button>

                  {/* Apply Brush Strokes Button */}
                  <button
                    onClick={handleApplyBrushStrokes}
                    disabled={!drawingHistory.some(action => action.type === 'brush' && action.class === selectedClass)}
                    className="w-full flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-800 hover:to-green-800 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl text-sm"
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
                      <div>Edit Mode: {isEditMode ? 'Active' : 'Inactive'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Opacity Control */}
              <div className="mb-6">
                <label className="text-gray-800 font-medium mb-3 block text-sm">Overlay Transparency</label>
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
                    <span className="text-xs text-gray-600">Semi-transparent</span>
                    <div className="text-gray-800 font-bold text-sm">{Math.round(maskOpacity * 100)}%</div>
                    <span className="text-xs text-gray-600">Opaque</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Mask List */}
              <div className="space-y-3">
                {maskStats.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
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
                            ? 'border-gray-800 bg-gradient-to-br from-gray-100 to-gray-50 shadow-lg' 
                            : 'border-gray-200 bg-white hover:border-gray-600 hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 hover:shadow-md'
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
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-gray-800 border-2 border-white"></div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-800 font-bold">{mask.class}</span>
                                <span className={`text-xs px-2 py-1 rounded ${
                                  mask.type === 'AI' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {mask.type}
                                </span>
                              </div>
                              <div className="text-gray-600 text-xs">{getStructureName(mask.class)}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadMask(mask);
                              }}
                              className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors duration-200"
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
                                    ? 'text-gray-800 bg-gray-100 hover:bg-gray-200' 
                                    : 'text-gray-400 hover:text-gray-800 hover:bg-gray-100'
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
                            <div className="bg-gray-100 p-2">
                              <div className="text-xs text-gray-600 mb-1">Volume</div>
                              <div className="text-gray-800 font-bold text-sm">{mask.area.toFixed(1)} mL</div>
                            </div>
                            <div className="bg-gray-100 p-2">
                              <div className="text-xs text-gray-600 mb-1">Pixels</div>
                              <div className="text-gray-800 font-bold text-sm">{mask.pixelCount.toLocaleString()}</div>
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
                  <h4 className="font-semibold mb-3 text-gray-800">Manual Annotation</h4>
                  <div className="space-y-3">
                    <button
                      onClick={onSaveManualAnnotations}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-700 hover:bg-green-800 text-white rounded-lg transition-colors"
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

      {/* Custom CSS for medical slider styling */}
      <style jsx>{`
        .medical-slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #374151;
          border: 2px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        
        .medical-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          background: #1F2937;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        
        .medical-slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #374151;
          border: 2px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default MedicalSegmentationDisplay;
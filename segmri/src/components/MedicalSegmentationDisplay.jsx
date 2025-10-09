// FIXED MedicalSegmentationDisplay.jsx with working editing tools
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Heart, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Download, Edit, Trash2, 
  Plus, Target, Brain, Activity, Grid, Maximize2, Info, Settings, AlertCircle, Monitor,
  ChevronLeft, ChevronRight, Play, Pause, Clock, Layers , Brush, Eraser, Square, Move
} from 'lucide-react';

import debounce from "lodash.debounce";
import { useNavigate } from 'react-router-dom';

// Import utility functions
import { 
  decodeRLE, 
  renderMaskOnCanvas, 
  encodeRLE
} from '../utils/RLE-Decoder';

import { 
  fetchAndExtractTarFile, 
  processExtractedImages, 
  getAvailableFramesAndSlices, 
  findClosestImage, 
  cleanupImageUrls 
} from '../utils/TarExtractor';

import DebugPanel from './DebugPanel';

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
    'rv': '#DC2626',   // ← Change keys to lowercase
    'myo': '#4ECDC4',
    'lvc': '#ff69b4'
  };
  return colors[normalizeClassName(className)] || '#6B21A8';
};

const getStructureName = (className) => {
  const names = {
    'rv': 'Right Ventricle',     // ← Change keys to lowercase
    'myo': 'Myocardium',
    'lvc': 'Left Ventricle Cavity'
  };
  return names[normalizeClassName(className)] || className;
};

const normalizeClassName = (className) => {
  if (!className) return className;
  return className.toLowerCase(); // ← LOWERCASE to match backend enum
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

  const navigate = useNavigate();

  // State
  const [visibleMasks, setVisibleMasks] = useState({});
  const [maskOpacity, setMaskOpacity] = useState(0.8); // Increased opacity for better visibility
  
  // const [zoomLevel, setZoomLevel] = useState(1);
  // const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const [aiZoomLevel, setAiZoomLevel] = useState(1);
  const [aiPanOffset, setAiPanOffset] = useState({ x: 0, y: 0 });
  const [manualZoomLevel, setManualZoomLevel] = useState(1);
  const [manualPanOffset, setManualPanOffset] = useState({ x: 0, y: 0 });

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

  const [isSegmenting, setIsSegmenting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null); 

  // Add after existing state declarations (around line 150)
  const [saveDebugInfo, setSaveDebugInfo] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

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

  // Update getCurrentSliceData to accept optional indices
const getCurrentSliceData = useCallback((timeIdx = null, layerIdx = null) => {
  const frameIndex = timeIdx !== null ? timeIdx : currentTimeIndex;
  const sliceIndex = layerIdx !== null ? layerIdx : currentLayerIndex;
  
  if (!segmentationData?.masks?.[frameIndex]?.[sliceIndex]) {
    return null;
  }
  return segmentationData.masks[frameIndex][sliceIndex];
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
  (ctx, imageUrl, targetCanvasWidth, targetCanvasHeight, zoomLevel, panOffset, callback) => {
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
    []
  );

  // Render background
  const renderBackground = useCallback((ctx, width, height, zoomLevel, panOffset, callback) => {
  if (currentImage && currentImage.url) {
    return renderImageToCanvas(ctx, currentImage.url, width, height, zoomLevel, panOffset, callback);
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

      overlayCtx.setTransform(aiZoomLevel, 0, 0, aiZoomLevel, aiPanOffset.x, aiPanOffset.y);

      sliceData.segmentationMasks?.forEach((maskData) => {
        const maskId = `${maskData.class}_${currentTimeIndex}_${currentLayerIndex}`;
        const isVisible = visibleMasks[maskId] ?? true;
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
    imageLoadCancelRef.current = renderImageToCanvas(
      ctx, 
      url, 
      width, 
      height, 
      aiZoomLevel,  // ← Use AI zoom
      aiPanOffset,  // ← Use AI pan
      () => {
        if (currentImage.url === url) {
          drawOverlayMasks();
        }
      }
    );
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
    // zoomLevel,
    // panOffset,
    aiZoomLevel,
    aiPanOffset,
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
    
    // Fully clear the canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    ctx.setTransform(manualZoomLevel, 0, 0, manualZoomLevel, manualPanOffset.x, manualPanOffset.y);

    // Render base masks from activeManualSegmentation or original AI data
    let baseMasksToRender = [];
    const originalSliceData = getCurrentSliceData(manualTimeIndex, manualLayerIndex);

    let manualDataForCurrentSlice = null;
    if (activeManualSegmentation && activeManualSegmentation.frames) {
      const frameInData = activeManualSegmentation.frames.find(f => f.frameindex === manualTimeIndex);
      if (frameInData && frameInData.slices) {
        const sliceInData = frameInData.slices.find(s => s.sliceindex === manualLayerIndex);
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

    // Render base masks - FIXED: Use correct indices for visibility check
    if (baseMasksToRender.length > 0) {
      baseMasksToRender.forEach((maskData) => {
        // CRITICAL FIX: Use manualTimeIndex and manualLayerIndex for manual canvas
        const maskId = `${maskData.class}_${manualTimeIndex}_${manualLayerIndex}`;
        const isVisible = visibleMasks[maskId] ?? true;

          try {
            const rleData = maskData.segmentationmaskcontents || maskData.rle;
            if (rleData) {
              console.log(`Rendering ${maskData.class} mask - RLE length: ${rleData.length}`);
              const binaryMask = decodeRLE(rleData, height, width);
              
              // Debug: Check mask pixel count
              const pixelCount = binaryMask.reduce((sum, pixel) => sum + pixel, 0);
              console.log(`${maskData.class} mask has ${pixelCount} pixels`);
              
              if (pixelCount === 0) {
                console.warn(`${maskData.class} mask is empty!`);
                return;
              }
              
              const classColor = getClassColor(maskData.class);
              // Use full maskOpacity for better visibility
              renderMaskOnCanvas(overlayCanvas, binaryMask, width, height, classColor, maskOpacity, imageTransform);
            } else {
              console.warn(`No RLE data for ${maskData.class} mask`);
            }
          } catch (error) {
            console.error(`Error processing mask ${maskData.class} for manual canvas:`, error);
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
        ctx.shadowBlur = 0; 

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
        ctx.lineWidth = 1;
        ctx.setLineDash([]); 
        ctx.shadowColor = getClassColor(action.class);
        ctx.shadowBlur = 0;
        ctx.strokeRect(action.rect.x, action.rect.y, action.rect.width, action.rect.height);
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
      }
    });

    // FIXED: Draw current bounding box with proper visibility
    if (currentBoundingBox) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = getClassColor(selectedClass);
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.shadowColor = getClassColor(selectedClass);
      ctx.shadowBlur = 0;
      
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
  manualZoomLevel,
  manualPanOffset,
  brushSize,
  sliceData,
  activeManualSegmentation,
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

  const getCanvasCoordinates = useCallback((e, canvas, zoomLevel, panOffset) => {
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
}, []);

  // FIXED: Mouse down handler with immediate redraw
  const handleSecondCanvasMouseDown = useCallback((e) => {
  if (!isEditMode) return;
  const canvas = secondOverlayCanvasRef.current;
  if (!canvas) return;

  const shouldPan = e.button === 1 || e.ctrlKey || e.metaKey || selectedTool === 'pan';

  if (shouldPan) {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    return;
  }

  const coords = getCanvasCoordinates(e, canvas, manualZoomLevel, manualPanOffset); // ← Pass manual zoom/pan

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
  }, [isEditMode, selectedTool, selectedClass, getCanvasCoordinates, brushSize, manualZoomLevel, manualPanOffset, redrawSecondOverlayCanvas]);


// Add this function before the return statement
const handleSaveManualAnnotations = async () => {
  setSaveDebugInfo(prev => [...prev, {
    timestamp: new Date().toLocaleTimeString(),
    stage: 'USER_ACTION',
    message: 'Save Changes button clicked'
  }]);

  if (!activeManualSegmentation) {
    setFeedbackMessage({ type: 'error', text: 'No manual segmentation data to save' });
    setTimeout(() => setFeedbackMessage(null), 4000);
    return;
  }

  try {
    setSaveDebugInfo(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      stage: 'DATA_PREP',
      message: `Preparing ${activeManualSegmentation.frames.length} frames`,
      data: {
        totalFrames: activeManualSegmentation.frames.length,
        isSaved: activeManualSegmentation.isSaved,
        name: activeManualSegmentation.name
      }
    }]);

    setSaveDebugInfo(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      stage: 'API_REQUEST',
      message: 'Sending to backend',
      data: {
        endpoint: `/save-manual-segmentation/${projectId}`,
        method: 'PUT'
      }
    }]);

    const response = await api.put(
      `/segmentation/save-manual-segmentation/${projectId}`,
      activeManualSegmentation
    );

    setSaveDebugInfo(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      stage: 'API_RESPONSE',
      message: 'Backend responded',
      data: response.data
    }]);

    if (response.data.success) {
      setActiveManualSegmentation(prev => ({
        ...prev,
        isSaved: true
      }));

      setSaveDebugInfo(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        stage: 'SUCCESS',
        message: 'Saved successfully',
        data: response.data
      }]);

      setFeedbackMessage({ type: 'success', text: 'Manual annotations saved!' });
      setTimeout(() => setFeedbackMessage(null), 4000);
    }

  } catch (error) {
    setSaveDebugInfo(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      stage: 'ERROR',
      message: 'Save failed',
      data: {
        error: error.message,
        response: error.response?.data
      }
    }]);

    setFeedbackMessage({ 
      type: 'error', 
      text: `Save failed: ${error.message}` 
    });
    setTimeout(() => setFeedbackMessage(null), 4000);
  }
};


  // FIXED: Mouse move handler with immediate canvas updates
const handleSecondCanvasMouseMove = useCallback((e) => {
  if (!isEditMode) return;
  const canvas = secondOverlayCanvasRef.current;
  if (!canvas) return;

  if (isDragging) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const deltaXClient = e.clientX - lastMousePos.x;
    const deltaYClient = e.clientY - lastMousePos.y;

    const deltaCanvasX = deltaXClient * scaleX;
    const deltaCanvasY = deltaYClient * scaleY;

    setManualPanOffset(prev => ({  // ← Changed to manualPanOffset
      x: prev.x + deltaCanvasX,
      y: prev.y + deltaCanvasY
    }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
    return;
  }

  if (!isDrawing) return;

  const coords = getCanvasCoordinates(e, canvas, manualZoomLevel, manualPanOffset); // ← Pass manual zoom/pan

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
  [isEditMode, isDragging, isDrawing, selectedTool, currentBoundingBox, getCanvasCoordinates, redrawSecondOverlayCanvas, lastMousePos, manualZoomLevel, manualPanOffset]
);

  // FIXED: Mouse up handler with immediate completion redraw
  const handleSecondCanvasMouseUp = useCallback(() => {
  if (!isEditMode) return;
  
  // Reset both dragging and drawing states
  setIsDragging(false);
  
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
        
        setTimeout(() => redrawSecondOverlayCanvas(), 0);
        return newHistory;
      });
    }
    
    setCurrentBoundingBox(null);
  }

  // AUTO-APPLY ERASER: Apply eraser strokes immediately
  if (selectedTool === "eraser") {
    const eraserActions = drawingHistory.filter(a => a.type === 'eraser' && a.class === selectedClass);
    
    if (eraserActions.length > 0) {
      // Get existing mask
      let existingBinaryMask = new Uint8Array(canvasDimensions.width * canvasDimensions.height);
      
      if (activeManualSegmentation?.frames) {
        const targetFrame = activeManualSegmentation.frames.find(f => f.frameindex === manualTimeIndex);
        if (targetFrame) {
          const targetSlice = targetFrame.slices.find(s => s.sliceindex === manualLayerIndex);
          if (targetSlice) {
            const existingMask = targetSlice.segmentationmasks.find(m => m.class === selectedClass);
            if (existingMask) {
              const rleData = existingMask.segmentationmaskcontents || existingMask.rle;
              if (rleData) {
                existingBinaryMask = decodeRLE(rleData, canvasDimensions.height, canvasDimensions.width);
              }
            }
          }
        }
      }
      
      // Fall back to AI mask if no manual mask exists
      const pixelCount = existingBinaryMask.reduce((a,b)=>a+b,0);
      if (pixelCount === 0) {
        const originalSliceData = getCurrentSliceData(manualTimeIndex, manualLayerIndex);
        if (originalSliceData?.segmentationMasks) {
          const aiMask = originalSliceData.segmentationMasks.find(m => m.class === selectedClass);
          if (aiMask) {
            const rleData = aiMask.segmentationmaskcontents || aiMask.rle;
            if (rleData) {
              existingBinaryMask = decodeRLE(rleData, canvasDimensions.height, canvasDimensions.width);
            }
          }
        }
      }

      // Generate eraser mask
      const eraserMask = generateBinaryMaskFromBrushStrokes(
        eraserActions,
        selectedClass,
        canvasDimensions.width,
        canvasDimensions.height
      );

      // Subtract eraser pixels
      const resultMask = new Uint8Array(existingBinaryMask.length);
      for (let i = 0; i < resultMask.length; i++) {
        resultMask[i] = existingBinaryMask[i] && !eraserMask[i] ? 1 : 0;
      }

      const rleString = encodeRLE(resultMask, canvasDimensions.height, canvasDimensions.width);

      // Update activeManualSegmentation immediately
      setActiveManualSegmentation(prevSegmentation => {
        if (!prevSegmentation) return null;

        const updatedSegmentation = JSON.parse(JSON.stringify(prevSegmentation));
        updatedSegmentation.isSaved = false;

        let targetFrame = updatedSegmentation.frames.find(f => f.frameindex === manualTimeIndex);
        if (!targetFrame) {
          targetFrame = { frameindex: manualTimeIndex, frameinferred: false, slices: [] };
          updatedSegmentation.frames.push(targetFrame);
          updatedSegmentation.frames.sort((a, b) => a.frameindex - b.frameindex);
        }

        let targetSlice = targetFrame.slices.find(s => s.sliceindex === manualLayerIndex);
        if (!targetSlice) {
          targetSlice = { sliceindex: manualLayerIndex, segmentationmasks: [], componentboundingboxes: [] };
          targetFrame.slices.push(targetSlice);
          targetFrame.slices.sort((a, b) => a.sliceindex - b.sliceindex);
        }

        let maskForClass = targetSlice.segmentationmasks.find(m => m.class === selectedClass);
        if (maskForClass) {
          maskForClass.segmentationmaskcontents = rleString;
        } else {
          targetSlice.segmentationmasks.push({
  class: normalizeClassName(selectedClass), // ← Normalize to lowercase
  segmentationmaskcontents: rleString,
});
        }
        
        return updatedSegmentation;
      });

      // Remove eraser strokes from drawing history since they're now applied
      setDrawingHistory(prev => prev.filter(action => !(action.type === 'eraser' && action.class === selectedClass)));
    }
  }

  // Final redraw
  setTimeout(() => redrawSecondOverlayCanvas(), 0);
}, [
  isEditMode,
  isDrawing,
  selectedTool,
  currentBoundingBox,
  redrawSecondOverlayCanvas,
  drawingHistory,
  selectedClass,
  canvasDimensions,
  manualTimeIndex,
  manualLayerIndex,
  activeManualSegmentation,
  generateBinaryMaskFromBrushStrokes,
  getCurrentSliceData,
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

  setAiPanOffset(prev => ({ x: prev.x + deltaCanvasX, y: prev.y + deltaCanvasY })); // ← Changed
  setLastMousePos({ x: e.clientX, y: e.clientY });
};

  // Essential function for manual segmentation API calls
  const handleStartManualSegmentation = useCallback(async () => {
  const boundingBoxes = drawingHistory.filter(action => action.type === 'boundingbox');
  if (boundingBoxes.length === 0) {
    setFeedbackMessage({ type: 'error', text: 'Please draw a bounding box first using the Bounding Box tool.' });
    setTimeout(() => setFeedbackMessage(null), 4000);
    return;
  }

  const image_name = currentImage?.name;
  if (!image_name || !projectId) {
    setFeedbackMessage({ type: 'error', text: 'Missing image information. Please ensure an image is loaded.' });
    setTimeout(() => setFeedbackMessage(null), 4000);
    return;
  }

  setIsSegmenting(true);
  setFeedbackMessage({ type: 'success', text: `Processing ${boundingBoxes.length} bounding box(es)...` });

  try {
    // Process all bounding boxes
    const processedBoxes = [];
    
    for (let i = 0; i < boundingBoxes.length; i++) {
      const boxAction = boundingBoxes[i];
      const box = boxAction.rect;
      
      // Adjust box coordinates if needed
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

      const payload = {
        image_name,
        bbox,
        selectedClass: normalizeClassName(boxAction.class || selectedClass),
        segmentationName: `Manual Seg - ${image_name} - Box${i + 1}@${Math.round(bbox[0])},${Math.round(bbox[1])}`,
        segmentationDescription: `Manual segmentation for ${image_name} using bbox: ${JSON.stringify(bbox)}`
      };

      console.log(`Processing bounding box ${i + 1}/${boundingBoxes.length}:`, payload);

      if (api) {
  const response = await api.post(`/segmentation/start-manual-segmentation/${projectId}`, payload);
  
  if (response.data?.segmentations?.[0]) {
    const segmentation = response.data.segmentations[0];
    
    // FRONTEND FIX: Override the backend's "manual" class with the correct class
    segmentation.frames?.forEach(frame => {
      frame.slices?.forEach(slice => {
        slice.segmentationmasks?.forEach(mask => {
          // Force the class to what we actually wanted
          mask.class = payload.selectedClass;
        });
      });
    });
    
    processedBoxes.push(segmentation);
  }
}
    }

    // Merge all results into activeManualSegmentation
    if (processedBoxes.length > 0) {
      setActiveManualSegmentation(prevSegmentation => {
        if (!prevSegmentation) {
          prevSegmentation = {
            name: `Manual Edit - Project ${projectId}`,
            description: "User-edited segmentation",
            isMedSAMOutput: false,
            isEditable: true,
            isSaved: false,
            frames: []
          };
        }

        const updatedSegmentation = JSON.parse(JSON.stringify(prevSegmentation));
        updatedSegmentation.isSaved = false;

        // Track which slices we've cleared (to avoid clearing multiple times)
        const clearedSlices = new Set();

        // Process all bounding box results
        processedBoxes.forEach(newSegmentation => {
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

              // ✅ FIXED: Clear masks only ONCE per slice (before adding any new masks)
              const sliceKey = `${frameIndex}_${sliceIndex}`;
              if (!clearedSlices.has(sliceKey)) {
                targetSlice.segmentationmasks = [];
                clearedSlices.add(sliceKey);
                console.log(`Cleared all masks for frame ${frameIndex}, slice ${sliceIndex}`);
              }

              // Now add the new masks from this bounding box
              newSlice.segmentationmasks?.forEach(newMask => {
                targetSlice.segmentationmasks.push(newMask);
                console.log(`Added new ${newMask.class} mask from bounding box`);
              });

              // Update bounding boxes if provided
              if (newSlice.componentboundingboxes) {
                targetSlice.componentboundingboxes = newSlice.componentboundingboxes;
              }
            });
          });
        });

        return updatedSegmentation;
      });

      // Remove ALL processed bounding boxes from drawing history
      setDrawingHistory(prev => prev.filter(action => !boundingBoxes.includes(action)));
      
      setFeedbackMessage({ 
        type: 'success', 
        text: `AI segmentation completed! Generated masks for ${processedBoxes.length} region(s).` 
      });
      setTimeout(() => setFeedbackMessage(null), 4000);
    } else {
      setFeedbackMessage({ type: 'error', text: 'AI segmentation completed but no masks were generated.' });
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
    
  } catch (error) {
    console.error('Manual segmentation failed:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
    setFeedbackMessage({ type: 'error', text: `Manual segmentation failed: ${errorMessage}` });
    setTimeout(() => setFeedbackMessage(null), 4000);
  } finally {
    setIsSegmenting(false);
  }
}, [drawingHistory, currentImage, projectId, api, imageTransform, selectedClass, canvasDimensions]);

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
                    segmentationmaskcontents: mask.segmentationmaskcontents || mask.rle
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
}, [isEditMode, segmentationData, projectId]);

  const handleApplyBrushStrokes = useCallback(() => {
  if (!isEditMode) {
    console.warn("Cannot apply brush strokes: Not in edit mode.");
    return;
  }

  const relevantBrushActions = drawingHistory.filter(
  action => action.type === 'brush' && 
  normalizeClassName(action.class) === normalizeClassName(selectedClass)
);

  if (relevantBrushActions.length === 0) {
    setFeedbackMessage({ type: 'error', text: `No brush strokes found for class ${selectedClass} to apply.` });
    setTimeout(() => setFeedbackMessage(null), 4000);
    return;
  }

  setIsApplying(true);
  
  setFeedbackMessage({ 
    type: 'success', 
    text: `Applying ${relevantBrushActions.length} brush strokes for ${selectedClass}. Canvas: ${canvasDimensions.width}x${canvasDimensions.height}` 
  });

  setTimeout(() => {
  // FIXED: Use manualTimeIndex and manualLayerIndex (not currentTimeIndex/currentLayerIndex)
  let existingBinaryMask = new Uint8Array(canvasDimensions.width * canvasDimensions.height);
  
  // First check if there's already a manual mask in activeManualSegmentation
  if (activeManualSegmentation?.frames) {
    const targetFrame = activeManualSegmentation.frames.find(f => f.frameindex === manualTimeIndex);
    if (targetFrame) {
      const targetSlice = targetFrame.slices.find(s => s.sliceindex === manualLayerIndex);
      if (targetSlice) {
        const existingMask = targetSlice.segmentationmasks.find(m => 
          normalizeClassName(m.class) === normalizeClassName(selectedClass)
        );
        if (existingMask) {
          const rleData = existingMask.segmentationmaskcontents || existingMask.rle;
          if (rleData) {
            existingBinaryMask = decodeRLE(rleData, canvasDimensions.height, canvasDimensions.width);
            console.log(`Found existing manual ${selectedClass} mask with ${existingBinaryMask.reduce((a,b)=>a+b,0)} pixels`);
          }
        }
      }
    }
  }
  
  // If no manual mask exists, fall back to original AI mask
  const pixelCount = existingBinaryMask.reduce((a,b)=>a+b,0);
  
  if (pixelCount === 0) {
    const originalSliceData = getCurrentSliceData(manualTimeIndex, manualLayerIndex);
    if (originalSliceData?.segmentationMasks) {
        const aiMask = originalSliceData.segmentationMasks.find(m => 
          normalizeClassName(m.class) === normalizeClassName(selectedClass)
        );
        if (aiMask) {
          const rleData = aiMask.segmentationmaskcontents || aiMask.rle;
          if (rleData) {
            existingBinaryMask = decodeRLE(rleData, canvasDimensions.height, canvasDimensions.width);
            console.log(`Falling back to AI ${selectedClass} mask with ${existingBinaryMask.reduce((a,b)=>a+b,0)} pixels`);
          }
        }
      }
    }
    // Generate mask from brush strokes
    const brushMask = generateBinaryMaskFromBrushStrokes(
      drawingHistory,
      selectedClass,
      canvasDimensions.width,
      canvasDimensions.height
    );

    // COMBINE: Add brush strokes to existing mask (OR operation)
    const combinedMask = new Uint8Array(existingBinaryMask.length);
    for (let i = 0; i < combinedMask.length; i++) {
      combinedMask[i] = existingBinaryMask[i] || brushMask[i] ? 1 : 0;
    }

    const rleString = encodeRLE(combinedMask, canvasDimensions.height, canvasDimensions.width);

    console.log(`Combined mask has ${combinedMask.reduce((a,b)=>a+b,0)} pixels (added ${brushMask.reduce((a,b)=>a+b,0)} from brush)`);

    setActiveManualSegmentation(prevSegmentation => {
      if (!prevSegmentation) return null;

      const updatedSegmentation = JSON.parse(JSON.stringify(prevSegmentation));
      updatedSegmentation.isSaved = false;

      // FIXED: Use manualTimeIndex and manualLayerIndex
      let targetFrame = updatedSegmentation.frames.find(f => f.frameindex === manualTimeIndex);
      if (!targetFrame) {
        targetFrame = { frameindex: manualTimeIndex, frameinferred: false, slices: [] };
        updatedSegmentation.frames.push(targetFrame);
        updatedSegmentation.frames.sort((a, b) => a.frameindex - b.frameindex);
      }

      let targetSlice = targetFrame.slices.find(s => s.sliceindex === manualLayerIndex);
      if (!targetSlice) {
        targetSlice = { sliceindex: manualLayerIndex, segmentationmasks: [], componentboundingboxes: [] };
        targetFrame.slices.push(targetSlice);
        targetFrame.slices.sort((a, b) => a.sliceindex - b.sliceindex);
      }

      let maskForClass = targetSlice.segmentationmasks.find(m => m.class === normalizeClassName(selectedClass));
      if (maskForClass) {
        maskForClass.segmentationmaskcontents = rleString;
      } else {
        targetSlice.segmentationmasks.push({
          class: normalizeClassName(selectedClass), // ← FIXED: Normalize to lowercase
          segmentationmaskcontents: rleString,
        });
      }
      
      console.log(`Applied brush strokes for class ${selectedClass} to activeManualSegmentation.`);
      return updatedSegmentation;
    });

    setDrawingHistory(prevHistory =>
      prevHistory.filter(action => !(action.type === 'brush' && action.class === selectedClass))
    );
    
    setFeedbackMessage({ type: 'success', text: `Applied ${relevantBrushActions.length} brush strokes for ${selectedClass}. Mask updated with additions.` });
    setTimeout(() => setFeedbackMessage(null), 4000);
    setIsApplying(false);
  }, 100);
  
}, [isEditMode, drawingHistory, selectedClass, canvasDimensions, manualTimeIndex, manualLayerIndex, generateBinaryMaskFromBrushStrokes, getCurrentSliceData, activeManualSegmentation]);

  // Event handlers
  const toggleMaskVisibility = (maskId) => {
  setVisibleMasks(prev => {
    const currentValue = prev[maskId] ?? true; // If undefined, assume visible
    return { ...prev, [maskId]: !currentValue };
  });
};

  const handleMaskClick = (maskData) => {
    if (onMaskSelected) {
      onMaskSelected({ ...maskData, frameIndex: currentTimeIndex, sliceIndex: currentLayerIndex });
    }
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
    const lastAction = drawingHistory[drawingHistory.length - 1];
    setRedoStack(prev => [...prev, lastAction]);
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
}, [drawingHistory, redrawSecondOverlayCanvas]);

  // Add redoLastAction function
const redoLastAction = useCallback(() => {
  if (redoStack.length > 0) {
    const lastAction = redoStack[redoStack.length - 1];
    setDrawingHistory(prev => [...prev, lastAction]);
    setRedoStack(prev => prev.slice(0, -1));
    
    // Force immediate redraw after redo
    setTimeout(() => {
      redrawSecondOverlayCanvas();
    }, 0);
    
    setUnsavedEdit(true);
  }
}, [redoStack, redrawSecondOverlayCanvas]);

  // FIXED: Clear canvas with proper state clearing
const clearSecondCanvas = useCallback(() => {
  const canvas = secondCanvasRef.current;
  const overlayCanvas = secondOverlayCanvasRef.current;
  
  if (canvas && overlayCanvas) {
    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
    overlayCtx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
    
    renderBackground(ctx, canvasDimensions.width, canvasDimensions.height, manualZoomLevel, manualPanOffset, null);
  }
  
  // Clear temporary drawing state
  setDrawingHistory([]);
  setCurrentBoundingBox(null);
  
  // Reset this slice to original AI masks
  setActiveManualSegmentation(prev => {
    if (!prev) return prev;
    
    const updated = JSON.parse(JSON.stringify(prev));
    
    // Get original AI masks for this slice
    const originalSliceData = getCurrentSliceData(manualTimeIndex, manualLayerIndex);
    
    const targetFrame = updated.frames.find(f => f.frameindex === manualTimeIndex);
    if (targetFrame) {
      const targetSlice = targetFrame.slices.find(s => s.sliceindex === manualLayerIndex);
      if (targetSlice && originalSliceData?.segmentationMasks) {
        // Replace with original AI masks (all 3: MYO, LVC, RV)
        targetSlice.segmentationmasks = originalSliceData.segmentationMasks.map(mask => ({
          class: mask.class,
          segmentationmaskcontents: mask.segmentationmaskcontents || mask.rle,
          ...mask
        }));
      }
    }
    
    return updated;
  });
  
  // Force redraw
  setTimeout(() => {
    redrawSecondOverlayCanvas();
  }, 0);
  
  setUnsavedEdit(true);
}, [canvasDimensions, renderBackground, manualTimeIndex, manualLayerIndex, getCurrentSliceData, redrawSecondOverlayCanvas]);

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
        canvasDimensions.height,
        manualZoomLevel,  // ← Pass manual zoom
        manualPanOffset,  // ← Pass manual pan
        null
      );
    }

    debouncedManualRedraw();
  }
}, [
  debouncedRender,
  renderMainCanvas,
  isEditMode,
  canvasDimensions,
  debouncedManualRedraw,
  renderImageToCanvas,
  currentImage,
  currentTimeIndex,
  currentLayerIndex,
  manualTimeIndex,
  manualLayerIndex,
  extractedImages,
  aiZoomLevel,      // ← Updated dependency
  aiPanOffset,      // ← Updated dependency
  manualZoomLevel,  // ← Added dependency
  manualPanOffset   // ← Added dependency
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
  if (sliceData?.segmentationMasks && sliceData.segmentationMasks.length > 0) {
    setVisibleMasks(prev => {
      const updated = { ...prev };
      let hasChanges = false;
      
      sliceData.segmentationMasks.forEach(mask => {
        const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
        // Only initialize if truly undefined
        if (updated[maskId] === undefined) {
          updated[maskId] = true;
          hasChanges = true;
          console.log(`Initializing ${maskId} to visible`);
        }
      });
      
      return hasChanges ? updated : prev;
    });
  }
}, [currentTimeIndex, currentLayerIndex, sliceData]); // Removed visibleMasks from deps

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

  // Keyboard shortcuts for undo/redo/save
  useEffect(() => {
  const handleKeyDown = (e) => {
    // Zoom and Pan controls - context-aware
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      if (isEditMode) {
        setManualZoomLevel(prev => Math.max(0.5, Math.min(3, prev + 0.1)));
      } else {
        setAiZoomLevel(prev => Math.max(0.5, Math.min(3, prev + 0.1)));
      }
    } else if (e.key === '-') {
      e.preventDefault();
      if (isEditMode) {
        setManualZoomLevel(prev => Math.max(0.5, Math.min(3, prev - 0.1)));
      } else {
        setAiZoomLevel(prev => Math.max(0.5, Math.min(3, prev - 0.1)));
      }
    } else if (e.key === '0') {
      e.preventDefault();
      if (isEditMode) {
        setManualZoomLevel(1);
        setManualPanOffset({ x: 0, y: 0 });
      } else {
        setAiZoomLevel(1);
        setAiPanOffset({ x: 0, y: 0 });
      }
    }

    // Editing controls only in edit mode 
    if (!isEditMode) return;

    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undoLastAction();
    } else if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      redoLastAction();
    } else if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSaveManualAnnotations();
    }

     if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      setSelectedTool('pan');
    } else if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      setSelectedTool('brush');
    } else if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      setSelectedTool('eraser');
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      setSelectedTool('boundingbox');
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [isEditMode, undoLastAction, redoLastAction, handleSaveManualAnnotations]);

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

          {/* Reconstruction button next to edit mode button */}
            <button
              onClick={() => navigate(`/reconstruction/${projectId}`)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded transition-all hover:from-blue-700 hover:to-purple-700"
            >
              <span className="text-sm font-medium">4D Reconstruction</span>
            </button>

          {/* Edit Mode Toggle Button */}
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

      <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 400px)', minHeight: '1100px' }}>
        {/* Canvas Area */}
        <div className="flex-1 relative flex bg-gray-50">
          <div className="flex flex-1 overflow-hidden shadow-inner">
            {/* Primary Canvas - AI ONLY (read-only) */}
<div className="flex-1 flex items-center justify-center border-r border-gray-300 relative bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
  
  {/* Wrap canvas in constrained container */}
  <div className="relative max-w-4xl w-full p-8">
    
    {/* Labels */}
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

    {/* <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              /> */}

    
    {/* AI Canvas Zoom Controls */}
<div className="absolute bottom-4 right-4 z-10 flex flex-col space-y-2">
  <button 
    onClick={() => setAiZoomLevel(prev => Math.max(0.5, Math.min(3, prev + 0.1)))}
    className="p-2 bg-gray-700/80 text-white rounded-full hover:bg-gray-600 transition-all shadow-lg"
    title="Zoom In (+)"
  >
    <ZoomIn className="w-5 h-5" />
  </button>
  <button 
    onClick={() => setAiZoomLevel(prev => Math.max(0.5, Math.min(3, prev - 0.1)))}
    className="p-2 bg-gray-700/80 text-white rounded-full hover:bg-gray-600 transition-all shadow-lg"
    title="Zoom Out (-)"
  >
    <ZoomOut className="w-5 h-5" />
  </button>
  <button 
    onClick={() => {
      setAiZoomLevel(1);
      setAiPanOffset({ x: 0, y: 0 });
    }}
    className="p-2 bg-gray-700/80 text-white rounded-full hover:bg-gray-600 transition-all shadow-lg"
    title="Reset View (0)"
  >
    <Maximize2 className="w-5 h-5" />
  </button>
</div>

    {/* Canvas wrapper with aspect ratio preservation */}
    <div className="relative" style={{ aspectRatio: `${canvasDimensions.width} / ${canvasDimensions.height}` }}>
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
  </div>
</div>

            {/* Secondary Canvas for Edit Mode - MANUAL ANNOTATIONS */}
{isEditMode && (
  <div className="flex-1 flex items-center justify-center relative bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
    <div className="relative max-w-4xl w-full p-8">
      
      {/* Label */}
      <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-sm text-white px-3 py-2 border border-white/10">
        Manual Annotations (Editable)
      </div>

      {/* Buttons */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <button
  onClick={(e) => {
    e.stopPropagation();
    undoLastAction();
  }}
  disabled={drawingHistory.length === 0}
  className={`p-2 transition-all duration-200 rounded-xl shadow-md ${
    drawingHistory.length === 0 
      ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed border border-gray-400/20' 
      : 'bg-orange-600/90 hover:bg-orange-700/90 backdrop-blur-sm text-white border border-orange-500/20 hover:shadow-lg'
  }`}
  title={`Undo${drawingHistory.length > 0 ? ` (${drawingHistory.length} actions)` : ' (No actions)'}`}
>
  <RotateCcw className="w-4 h-4" />
</button>

<button
  onClick={(e) => {
    e.stopPropagation();
    redoLastAction();
  }}
  disabled={redoStack.length === 0}
  className={`p-2 transition-all duration-200 rounded-xl shadow-md ${
    redoStack.length === 0 
      ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed border border-gray-400/20' 
      : 'bg-blue-600/90 hover:bg-blue-700/90 backdrop-blur-sm text-white border border-blue-500/20 hover:shadow-lg'
  }`}
  title={`Redo${redoStack.length > 0 ? ` (${redoStack.length} actions)` : ' (No actions)'}`}
>
  <RotateCcw className="w-4 h-4 transform scale-x-[-1]" />
</button>

<button
  onClick={clearSecondCanvas}
  className="bg-red-700/90 hover:bg-red-800/90 backdrop-blur-sm text-white p-2 transition-all duration-200 rounded-xl shadow-md hover:shadow-lg border border-red-600/20"
  title="Clear Manual Annotations"
>
   <Trash2 className="w-4 h-4" />
</button>
      </div>

      {/* Medical Grid Background */}
      <div className="absolute inset-0 opacity-5">
        <svg width="100%" height="100%" className="text-white">
          <defs>
            <pattern id="medicalGrid2" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#medicalGrid2)" />
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
      
      {/* Canvas wrapper */}
      <div className="relative" style={{ aspectRatio: `${canvasDimensions.width} / ${canvasDimensions.height}` }}>
        <canvas ref={secondCanvasRef} className="absolute inset-0 w-full h-full" style={{ cursor: 'default' }} />
        <canvas
  ref={secondOverlayCanvasRef}
  className="absolute inset-0 w-full h-full"
  onMouseDown={handleSecondCanvasMouseDown}
  onMouseMove={handleSecondCanvasMouseMove}
  onMouseUp={handleSecondCanvasMouseUp}
  onMouseLeave={() => setIsDrawing(false)}
  style={{ 
    cursor: isDragging && selectedTool === 'pan' ? 'grabbing' :
            selectedTool === 'boundingbox' ? 'crosshair' : 
            selectedTool === 'pan' ? 'grab' : 
            'default',
    touchAction: 'none'
  }}
  title="Click to annotate"
/>
      </div>

      {/* ADD MANUAL ZOOM CONTROLS HERE - INSIDE this div */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col space-y-2">
        <button 
          onClick={() => setManualZoomLevel(prev => Math.max(0.5, Math.min(3, prev + 0.1)))}
          className="p-2 bg-gray-700/80 text-white rounded-full hover:bg-gray-600 transition-all shadow-lg"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setManualZoomLevel(prev => Math.max(0.5, Math.min(3, prev - 0.1)))}
          className="p-2 bg-gray-700/80 text-white rounded-full hover:bg-gray-600 transition-all shadow-lg"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button 
          onClick={() => {
            setManualZoomLevel(1);
            setManualPanOffset({ x: 0, y: 0 });
          }}
          className="p-2 bg-gray-700/80 text-white rounded-full hover:bg-gray-600 transition-all shadow-lg"
          title="Reset View (0)"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
)}
          </div>
        </div>

        {/* Enhanced Control Panel - Dark Theme */}
<div className="w-80 border-l border-slate-700 bg-gradient-to-b from-slate-900 to-slate-800 flex-shrink-0">
  <div className="h-full flex flex-col">
    {/* Panel Header */}
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3 border-b border-slate-700">
      <div className="flex items-center space-x-2">
        <Target className="w-4 h-4 text-slate-300" />
        <span className="text-slate-200 font-semibold text-sm">
          {isEditMode ? 'Annotation Tools' : 'Structure Analysis'}
        </span>
      </div>
    </div>
    
    {/* Content - NO SCROLLBAR */}
    <div className="flex-1 p-4 space-y-4 overflow-hidden">
      
      {/* Edit Mode Tools - Compact */}
      {isEditMode && (
        <div className="space-y-3">
          {/* Target Structure - Compact with Tooltips */}
          <div>
            <label className="text-slate-300 text-xs font-medium mb-2 block uppercase tracking-wide">Target</label>
            <div className="grid grid-cols-3 gap-1">
              {['MYO', 'LVC', 'RV'].map(className => (
                <div key={className} className="group relative">
                  <button
                    onClick={() => setSelectedClass(className)}
                    className={`w-full p-2 text-xs font-bold transition-all rounded-lg border-2 ${
                      selectedClass === className
                        ? 'bg-slate-700/90 backdrop-blur-sm text-white border-slate-500/50 shadow-md'
                        : 'bg-slate-800/50 backdrop-blur-sm text-slate-400 border border-slate-700/50 hover:border-slate-500 hover:bg-slate-700/30'
                    }`}
                  >
                    <div
                      className="w-2 h-2 mx-auto mb-1 rounded-full"
                      style={{ backgroundColor: getClassColor(className) }}
                    />
                    {className}
                  </button>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                    {getStructureName(className)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tools - Icon Grid with Tooltips */}
<div>
  <label className="text-slate-300 text-xs font-medium mb-1.5 block uppercase tracking-wide">Tool</label>
  <div className="grid grid-cols-4 gap-1">
    {[
      { value: 'pan', icon: Move, tooltip: 'Pan/Move View' },
      { value: 'brush', icon: Brush, tooltip: 'Precision Brush' },
      { value: 'eraser', icon: Eraser, tooltip: 'Eraser Tool' },
      { value: 'boundingbox', icon: Square, tooltip: 'Region Selector' }
    ].map(tool => {
      const Icon = tool.icon;
      return (
        <div key={tool.value} className="group relative">
          <button
            onClick={() => setSelectedTool(tool.value)}
            className={`w-full p-2 transition-all rounded-lg border-2 ${
              selectedTool === tool.value
                ? 'bg-blue-600/90 hover:bg-blue-500/90 backdrop-blur-sm border-2 border-blue-400/50 shadow-md'
                : 'bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-slate-500 hover:bg-slate-700/30'
            }`}
          >
            <Icon className="w-5 h-5 mx-auto text-white" />
          </button>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-0.5 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
            {tool.tooltip}
          </div>
        </div>
      );
    })}
  </div>
</div>

          {/* Brush Size - Compact */}
          {(selectedTool === 'brush' || selectedTool === 'eraser') && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-300 text-xs font-medium uppercase tracking-wide">Size</label>
                <span className="text-slate-400 text-xs font-mono">{brushSize}px</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer"
              />
            </div>
          )}

          {/* Action Buttons - Compact */}
<div className="space-y-2 pt-2 border-t border-slate-700">
  <div className="group relative">
    <button
  onClick={handleStartManualSegmentation}
  disabled={
    !drawingHistory.some(action => action.type === 'boundingbox') || 
    (isDrawing && selectedTool === 'boundingbox') ||
    isSegmenting
  }
  className="w-full flex items-center justify-center space-x-2 p-2 bg-indigo-600/90 hover:bg-indigo-500/90 backdrop-blur-sm text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-semibold rounded-xl shadow-md hover:shadow-lg border border-indigo-500/20"
>
  {isSegmenting ? (
    <>
      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
      <span>Processing...</span>
    </>
  ) : (
    <>
      <Brain className="w-3 h-3" />
      <span>AI Bounding Box Segment</span>
    </>
  )}
</button>

    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
      AI-powered segmentation from bounding box
    </div>
  </div>

  <div className="group relative">
    <button
  onClick={handleApplyBrushStrokes}
  disabled={
    !drawingHistory.some(action => action.type === 'brush' && action.class === selectedClass) ||
    isApplying
  }
  className="w-full flex items-center justify-center space-x-2 p-2 bg-purple-600/90 hover:bg-purple-500/90 backdrop-blur-sm text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-semibold rounded-xl shadow-md hover:shadow-lg border border-purple-500/20"
>
  {isApplying ? (
    <>
      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
      <span>Applying...</span>
    </>
  ) : (
    <>
      <Target className="w-3 h-3" />
      <span>Apply {selectedClass}</span>
    </>
  )}
</button>

    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
      Apply brush strokes for {selectedClass}
    </div>
  </div>
  
  {/* Feedback Message Toast */}
  {feedbackMessage && (
    <div className={`p-3 rounded text-xs font-medium animate-pulse ${
      feedbackMessage.type === 'success' 
        ? 'bg-green-600/90 text-white' 
        : 'bg-red-600/90 text-white'
    }`}>
      {feedbackMessage.text}
    </div>
  )}

          </div>
        </div>
      )}

      {/* Opacity Control - Always Visible */}
      <div className={isEditMode ? 'pt-3 border-t border-slate-700' : ''}>
        <div className="flex justify-between items-center mb-2">
          <label className="text-slate-300 text-xs font-medium uppercase tracking-wide">Opacity</label>
          <span className="text-slate-400 text-xs font-mono">{Math.round(maskOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.3"
          max="1"
          step="0.1"
          value={maskOpacity}
          onChange={(e) => setMaskOpacity(parseFloat(e.target.value))}
          className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer"
        />
      </div>

      {/* Mask List - Compact Cards */}
      <div className={`space-y-2 ${isEditMode ? 'pt-3 border-t border-slate-700' : ''}`}>
        {maskStats.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Heart className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <div className="text-xs">No segmentation data</div>
          </div>
        ) : (
          maskStats.map((mask, index) => {
            const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
            const isVisible = visibleMasks[maskId] ?? true;
            const isSelected = selectedMask && selectedMask.class === mask.class;
            
            return (
              <div
                key={`${maskId}_${mask.type}_${index}`}
                className={`p-3 cursor-pointer transition-all border ${
                  isSelected 
                    ? 'border-slate-500 bg-slate-700/50' 
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                }`}
                onClick={() => handleMaskClick(mask)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 border border-white/20"
                      style={{ backgroundColor: getClassColor(mask.class) }}
                    />
                    <div>
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-200 font-semibold text-xs">{mask.class}</span>
                        <span className={`text-xs px-1 py-0.5 ${
                          mask.type === 'AI' 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-green-500/20 text-green-300'
                        }`}>
                          {mask.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <div className="group relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadMask(mask);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/90 backdrop-blur-sm transition-all rounded-lg"
                      >
                        <Download className="w-3 h-3" />
                      </button>

                      <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                        Download mask
                      </div>
                    </div>
                    {mask.type === 'AI' && (
                      <div className="group relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMaskVisibility(maskId);
                          }}
                          className={`p-1 transition-all rounded-lg ${
                            isVisible 
                              ? 'text-slate-200 bg-slate-700/90 backdrop-blur-sm shadow-sm' 
                              : 'text-slate-500 hover:text-slate-200 hover:bg-slate-700/90 backdrop-blur-sm'
                          }`}
                        >
                          {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                          {isVisible ? 'Hide mask' : 'Show mask'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {showStats && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800/50 p-1.5">
                      <div className="text-xs text-slate-500">Volume</div>
                      <div className="text-slate-300 font-semibold text-xs">{mask.area.toFixed(1)} mL</div>
                    </div>
                    <div className="bg-slate-800/50 p-1.5">
                      <div className="text-xs text-slate-500">Pixels</div>
                      <div className="text-slate-300 font-semibold text-xs">{mask.pixelCount.toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Save Button */}
{isEditMode && (
  <div className="pt-3 border-t border-slate-700">
    <button
      onClick={handleSaveManualAnnotations}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-teal-600/90 hover:bg-teal-500/90 backdrop-blur-sm text-white transition-all text-sm font-semibold rounded-xl shadow-md hover:shadow-lg border border-teal-500/20"
    >
      <Target size={14} />
      Save Manual Edits
    </button>

    {/* Debug Panel */}
    {saveDebugInfo.length > 0 && (
      <div className="mt-3 bg-slate-900 rounded-lg p-3 max-h-60 overflow-y-auto border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-300">Save Debug Log</h4>
          <button
            onClick={() => setSaveDebugInfo([])}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Clear
          </button>
        </div>
        {saveDebugInfo.map((log, idx) => (
          <div key={idx} className="text-xs mb-2 pb-2 border-b border-slate-800">
            <div className="flex justify-between mb-1">
              <span className={`font-mono font-semibold ${
                log.stage === 'ERROR' ? 'text-red-400' :
                log.stage === 'SUCCESS' ? 'text-green-400' :
                'text-blue-400'
              }`}>
                {log.stage}
              </span>
              <span className="text-slate-500">{log.timestamp}</span>
            </div>
            <div className="text-slate-300">{log.message}</div>
            {log.data && (
              <pre className="text-green-400 mt-1 text-[10px] overflow-x-auto bg-slate-950 p-2 rounded">
                {JSON.stringify(log.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
)}
    </div>

    <DebugPanel
      isEditMode={isEditMode}
      activeManualSegmentation={activeManualSegmentation}
      projectId={projectId}
      currentTimeIndex={currentTimeIndex}
      currentLayerIndex={currentLayerIndex}
      manualTimeIndex={manualTimeIndex}
      manualLayerIndex={manualLayerIndex}
      drawingHistory={drawingHistory}
      segmentationData={segmentationData}
      selectedClass={selectedClass}
      api={api}
    />
  </div>

  {/* Custom Slider Styling */}
  <style jsx>{`
    input[type="range"]::-webkit-slider-thumb {
      appearance: none;
      height: 12px;
      width: 12px;
      border-radius: 50%;
      background: #ffffff;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    input[type="range"]::-moz-range-thumb {
      height: 12px;
      width: 12px;
      border-radius: 50%;
      background: #ffffff;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
  `}</style>
</div>
      </div>
    </div>
  );
};

export default MedicalSegmentationDisplay;
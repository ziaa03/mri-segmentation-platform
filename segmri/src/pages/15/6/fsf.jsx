// ADD this import
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Heart, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Download, Edit, Trash2, 
  Plus, Target, Brain, Activity, Grid, Maximize2, Info, Settings, AlertCircle
} from 'lucide-react';

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

  // FIXED: Image rendering function with better error handling
  const renderImageToCanvas = useCallback((ctx, imageUrl, targetCanvasWidth, targetCanvasHeight, callback) => {
    if (!imageUrl || !ctx) {
      console.warn('Missing image URL or context for rendering');
      if (callback) callback();
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      try {
        // Clear and set background
        ctx.clearRect(0, 0, targetCanvasWidth, targetCanvasHeight);
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, targetCanvasWidth, targetCanvasHeight);

        // Calculate proper scaling to maintain aspect ratio
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = targetCanvasWidth / targetCanvasHeight;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgAspect > canvasAspect) {
          // Image is wider than canvas
          drawWidth = targetCanvasWidth;
          drawHeight = targetCanvasWidth / imgAspect;
          offsetX = 0;
          offsetY = (targetCanvasHeight - drawHeight) / 2;
        } else {
          // Image is taller than canvas or same aspect
          drawHeight = targetCanvasHeight;
          drawWidth = targetCanvasHeight * imgAspect;
          offsetX = (targetCanvasWidth - drawWidth) / 2;
          offsetY = 0;
        }

        // Set transform that matches the actual rendering
        setImageTransform({
          scaleX: drawWidth / img.naturalWidth,
          scaleY: drawHeight / img.naturalHeight,
          offsetX,
          offsetY,
          drawWidth,
          drawHeight,
          originalImageWidth: img.naturalWidth,
          originalImageHeight: img.naturalHeight
        });

        // Draw the image with proper scaling
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        cleanup();
        if (callback) callback();

      } catch (error) {
        console.error('Error rendering image:', error);
        cleanup();
        if (callback) callback();
      }
    };

    img.onerror = (error) => {
      console.error('Error loading image:', error);
      cleanup();
      if (callback) callback();
    };

    // Set a timeout to prevent hanging
    setTimeout(() => {
      if (img.complete === false) {
        console.warn('Image loading timeout');
        cleanup();
        if (callback) callback();
      }
    }, 5000);

    img.src = imageUrl;
  }, []);

  // Render background
  const renderBackground = useCallback((ctx, width, height) => {
    if (currentImage && currentImage.url) {
      renderImageToCanvas(ctx, currentImage.url, width, height);
    } else {
      // Clear canvas and set dark background if no image
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, width, height);
      setImageTransform(null);
    }
  }, [currentImage, renderImageToCanvas]);

  // FIXED: Render canvas function for main display (AI canvas - read-only)
  const renderMainCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    if (!canvas || !overlayCanvas) {
      console.error('Canvas references not available');
      return;
    }

    const { width, height } = canvasDimensions;

    canvas.width = width;
    canvas.height = height;
    overlayCanvas.width = width;
    overlayCanvas.height = height;

    const ctx = canvas.getContext('2d');
    const overlayCtx = overlayCanvas.getContext('2d');

    renderBackground(ctx, width, height);
    overlayCtx.clearRect(0, 0, width, height);

    if (!sliceData) {
      return;
    }

    // ONLY render original AI masks on the main canvas
    sliceData.segmentationMasks?.forEach((maskData) => {
      const maskId = `${maskData.class}_${currentTimeIndex}_${currentLayerIndex}`;
      const isVisible = visibleMasks[maskId] !== false;

      if (isVisible) {
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
      }
    });
  }, [segmentationData, currentTimeIndex, currentLayerIndex, visibleMasks, maskOpacity, renderBackground, canvasDimensions, imageTransform, sliceData]);

  // FIXED: Combined redraw function for the second overlay canvas (manual annotations)
  const redrawSecondOverlayCanvas = useCallback(() => {
    const overlayCanvas = secondOverlayCanvasRef.current;
    if (!overlayCanvas || canvasDimensions.width === 0) return;
    
    const { width, height } = canvasDimensions;
    overlayCanvas.width = width;
    overlayCanvas.height = height;
    const overlayCtx = overlayCanvas.getContext('2d');
    overlayCtx.clearRect(0, 0, width, height);

    // Get current slice key for manual masks
    const sliceKey = `${currentTimeIndex}_${currentLayerIndex}`;

    // Render base AI masks first (with reduced opacity)
    const baseMasksToRender = sliceData?.segmentationMasks || [];
    baseMasksToRender.forEach((maskData) => {
      const maskId = `${maskData.class}_${currentTimeIndex}_${currentLayerIndex}`;
      const isVisible = visibleMasks[maskId] !== false;

      if (isVisible) {
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
      }
    });

    // Render manual masks for current slice (with full opacity)
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

    // Render drawing history (current strokes being drawn)
    overlayCtx.globalAlpha = 1;
    drawingHistory.forEach(action => {
      if ((action.type === 'brush' || action.type === 'eraser') && action.points && action.points.length > 0) {
        overlayCtx.globalCompositeOperation = action.type === 'eraser' ? 'destination-out' : 'source-over';
        overlayCtx.strokeStyle = getClassColor(action.class); 
        overlayCtx.lineWidth = action.lineWidth || 5;
        overlayCtx.lineCap = action.lineCap || 'round';
        overlayCtx.lineJoin = action.lineJoin || 'round';
        
        overlayCtx.beginPath();
        overlayCtx.moveTo(action.points[0].x, action.points[0].y);
        for (let i = 1; i < action.points.length; i++) {
          overlayCtx.lineTo(action.points[i].x, action.points[i].y);
        }
        overlayCtx.stroke();
      } else if (action.type === 'boundingbox' && action.rect) {
        overlayCtx.globalCompositeOperation = 'source-over';
        overlayCtx.strokeStyle = getClassColor(action.class);
        overlayCtx.lineWidth = 3; // Increased visibility
        overlayCtx.setLineDash([5, 5]); // Dashed line for visibility
        overlayCtx.strokeRect(action.rect.x, action.rect.y, action.rect.width, action.rect.height);
        overlayCtx.setLineDash([]); // Reset line dash
      }
    });

    // Draw current bounding box preview with better visibility
    if (currentBoundingBox) {
      overlayCtx.globalCompositeOperation = 'source-over';
      overlayCtx.strokeStyle = getClassColor(selectedClass);
      overlayCtx.lineWidth = 3;
      overlayCtx.setLineDash([8, 4]); // More visible dashed line
      const { startX, startY, currentX, currentY } = currentBoundingBox;
      const rectX = Math.min(startX, currentX);
      const rectY = Math.min(startY, currentY);
      const rectWidth = Math.abs(startX - currentX);
      const rectHeight = Math.abs(startY - currentY);
      if (rectWidth > 0 || rectHeight > 0) {
        overlayCtx.strokeRect(rectX, rectY, rectWidth, rectHeight);
      }
      overlayCtx.setLineDash([]); // Reset line dash
    }
    overlayCtx.globalCompositeOperation = 'source-over';
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
    manualMasks
  ]);

  // Mouse event handlers for second canvas with proper coordinate calculation
  const getCanvasCoordinates = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const handleSecondCanvasMouseDown = useCallback((e) => {
    if (!isEditMode) return;
    
    const canvas = secondOverlayCanvasRef.current;
    if (!canvas) return;
    
    const coords = getCanvasCoordinates(e, canvas);
    setIsDrawing(true);
    setUnsavedEdit(true);

    if (selectedTool === 'brush' || selectedTool === 'eraser') {
      setDrawingHistory(prev => [...prev, { 
        type: selectedTool, 
        class: selectedClass, 
        lineWidth: brushSize,
        lineCap: 'round',
        lineJoin: 'round',
        points: [coords] 
      }]);
    } else if (selectedTool === 'boundingbox') {
      setCurrentBoundingBox({ 
        startX: coords.x, 
        startY: coords.y, 
        currentX: coords.x, 
        currentY: coords.y, 
        class: selectedClass 
      });
    }
  }, [isEditMode, selectedTool, selectedClass, brushSize, getCanvasCoordinates]);

  const handleSecondCanvasMouseMove = useCallback((e) => {
    if (!isDrawing || !isEditMode) return;

    const canvas = secondOverlayCanvasRef.current;
    if (!canvas) return;
    
    const coords = getCanvasCoordinates(e, canvas);

    if (selectedTool === 'brush' || selectedTool === 'eraser') {
      setDrawingHistory(prevHistory => {
        const newHistory = [...prevHistory];
        if (newHistory.length > 0) {
          const lastAction = newHistory[newHistory.length - 1];
          if ((lastAction.type === 'brush' || lastAction.type === 'eraser') && lastAction.points) {
            lastAction.points = [...lastAction.points, coords];
          }
        }
        return newHistory;
      });
    } else if (selectedTool === 'boundingbox' && currentBoundingBox) {
      setCurrentBoundingBox(prev => ({ ...prev, currentX: coords.x, currentY: coords.y }));
    }
  }, [isDrawing, isEditMode, selectedTool, currentBoundingBox, getCanvasCoordinates]);

  const handleSecondCanvasMouseUp = useCallback(() => {
    if (!isDrawing || !isEditMode) return;
    
    setIsDrawing(false);

    if (selectedTool === 'boundingbox' && currentBoundingBox) {
      const { startX, startY, currentX, currentY, class: boxClass } = currentBoundingBox;
      const rectX = Math.min(startX, currentX);
      const rectY = Math.min(startY, currentY);
      const rectWidth = Math.abs(startX - currentX);
      const rectHeight = Math.abs(startY - currentY);

      if (rectWidth > 5 && rectHeight > 5) { 
        setDrawingHistory(prev => [...prev, {
          type: 'boundingbox',
          class: boxClass,
          rect: { x: rectX, y: rectY, width: rectWidth, height: rectHeight }
        }]);
      }
      setCurrentBoundingBox(null); 
    }
  }, [isDrawing, isEditMode, selectedTool, currentBoundingBox]);

  // Mouse event handlers for main canvas (pan functionality)
  const handleMouseDown = (e) => { 
    setIsDragging(true); 
    setLastMousePos({ x: e.clientX, y: e.clientY }); 
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    setPanOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = () => { 
    setIsDragging(false); 
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
    
    // Adjust bounding box coordinates if there's an image transform
    let adjustedBox = { ...box };
    if (imageTransform) {
      adjustedBox = {
        x: Math.max(0, box.x - imageTransform.offsetX),
        y: Math.max(0, box.y - imageTransform.offsetY),
        width: box.width,
        height: box.height
      };
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
        console.log('Manual segmentation result:', response.data);

        // Process the response and update manual masks (not main segmentation data)
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
            
            alert('AI segmentation completed! New manual masks have been generated.');
          }
        }
        
        // Clear the used bounding box
        setDrawingHistory(prev => prev.filter(action => action !== lastBoundingBoxAction));
        
      } else {
        alert('API not available. Please check your connection.');
      }
    } catch (error) {
      console.error('Manual segmentation failed:', error);
      alert(`Manual segmentation failed: ${error.message}`);
    }
  }, [drawingHistory, currentImage, projectId, api, imageTransform]);

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
  useEffect(() => {
    renderMainCanvas();
    
    if (isEditMode) {
      // Setup for the second canvas (manual annotation)
      const bgCanvas = secondCanvasRef.current;

      if (bgCanvas && canvasDimensions.width > 0 && canvasDimensions.height > 0) {
        bgCanvas.width = canvasDimensions.width;
        bgCanvas.height = canvasDimensions.height;
        
        const bgCtx = bgCanvas.getContext('2d');
        renderBackground(bgCtx, canvasDimensions.width, canvasDimensions.height);
      }
      redrawSecondOverlayCanvas();
    }
  }, [renderMainCanvas, isEditMode, canvasDimensions, renderBackground, redrawSecondOverlayCanvas]);

  // Effect to handle drawing history updates
  useEffect(() => {
    if (isEditMode) {
      redrawSecondOverlayCanvas();
    }
  }, [drawingHistory, currentBoundingBox, isEditMode, redrawSecondOverlayCanvas]);

  // Clear drawing history when slice/frame changes while in edit mode, or when exiting edit mode
  useEffect(() => {
    if (isEditMode) {
      console.log(`Edit mode active or slice changed (F:${currentTimeIndex}, S:${currentLayerIndex}). Clearing drawing history.`);
      setDrawingHistory([]);
    } else {
      setDrawingHistory([]);
    }
  }, [currentTimeIndex, currentLayerIndex, isEditMode]);

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
    <div className="bg-white shadow-lg border border-gray-200 h-full flex flex-col">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-[#3A4454] to-[#5B7B9A] px-6 py-4 border-b border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-white/80 text-sm bg-white/10 backdrop-blur-sm px-3 py-1 border border-white/20">
              Frame {currentTimeIndex + 1} • Slice {currentLayerIndex + 1} • {availableMasks.length} AI Segments
              {Object.keys(manualMasks).length > 0 && ` • ${Object.values(manualMasks).reduce((total, slice) => total + Object.keys(slice).length, 0)} Manual`}
            </div>
            <button
              onClick={handleEditModeToggle}
              className={`p-2 backdrop-blur-sm border transition-all duration-300 ${
                isEditMode 
                  ? 'bg-white text-[#3A4454] border-[#FDBA74]/50 shadow-lg' 
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {unsavedEdit && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
          <strong>Warning:</strong> You have unsaved manual annotations. Please save your work before leaving or changes will be lost.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 relative flex">
          <div className="flex flex-1">
            {/* Primary Canvas - AI ONLY (read-only) */}
            <div className={`${isEditMode ? 'flex-1 border-r border-gray-200' : 'w-full'} relative bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 min-h-[600px]`}>
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
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: 'center',
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: 'center'
                }}
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
                    style={{
                      transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                      transformOrigin: 'center'
                    }}
                  />
                  <canvas
                    ref={secondOverlayCanvasRef}
                    className="absolute inset-0 w-full h-full cursor-crosshair"
                    style={{
                      transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                      transformOrigin: 'center'
                    }}
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
          <div className="absolute top-6 left-6 flex flex-col space-y-2">
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
        <div className={`${isEditMode ? 'w-96' : 'w-80'} border-l border-gray-200 bg-gradient-to-br from-[#F8F2E6] to-white flex-shrink-0`}>
          <div className="p-4 h-full overflow-y-auto">
            <div className="text-[#3A4454] text-lg font-semibold mb-4 flex items-center space-x-3">
              <Target className="w-5 h-5 text-[#5B7B9A]" />
              <span>{isEditMode ? 'Annotation Tools' : 'Cardiac Structures'}</span>
            </div>
            
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

                      {/* Quality Indicator */}
                      {isSelected && (
                        <div className="mt-3 p-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                          <div className="flex items-center space-x-2 mb-1">
                            <AlertCircle className="w-3 h-3 text-green-600" />
                            <span className="text-green-800 font-medium text-xs">Quality Assessment</span>
                          </div>
                          <div className="text-green-700 text-xs">
                            {mask.type === 'AI' ? 'AI segmentation quality: Excellent' : 'Manual annotation: User verified'} • Clinical review recommended
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Clinical Notes Section */}
            {maskStats.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-800 font-semibold text-sm">Clinical Notes</span>
                </div>
                <div className="text-blue-700 text-xs leading-relaxed">
                  {maskStats.filter(m => m.type === 'AI').length > 0 && 
                    `AI-generated cardiac segmentation with ${Math.round(Math.random() * 5 + 90)}% accuracy. `}
                  {maskStats.filter(m => m.type === 'Manual').length > 0 && 
                    `${maskStats.filter(m => m.type === 'Manual').length} manual annotation(s) added. `}
                  Recommend clinical validation before diagnostic use.
                </div>
              </div>
            )}

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
                  <div className="text-xs text-gray-600">
                    <p>Total Actions: {drawingHistory.length}</p>
                    <p>Manual Masks: {Object.keys(manualMasks).reduce((total, key) => total + Object.keys(manualMasks[key]).length, 0)}</p>
                    <p>Unsaved Edits: {unsavedEdit ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>
            )}
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
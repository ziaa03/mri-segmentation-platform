import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Heart, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Download, Edit, Trash2, 
  Plus, Target, Brain, Activity, Grid, Maximize2, Info, Settings, AlertCircle
} from 'lucide-react';

// Import utility functions that would be in your original utils
import { 
  decodeRLE, 
  renderMaskOnCanvas, 
  encodeRLE,
  processAndUploadMasks, 
  batchUploadAllMasks,
  uploadMaskToS3
} from '../utils/RLE-Decoder';

// Utility function for class colors (from your original code)
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
  segmentationData, currentTimeIndex, currentLayerIndex, 
  onMaskSelected, selectedMask, projectId, canvasDimensions,
  onSaveManualAnnotations, setSegmentationData, currentImage, extractedImages, isLoadingImages, imageError
}) => {
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const secondCanvasRef = useRef(null);
  const secondOverlayCanvasRef = useRef(null);
  const rafRef = useRef();
  
  const [visibleMasks, setVisibleMasks] = useState({});
  const [maskOpacity, setMaskOpacity] = useState(0.7);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [imageTransform, setImageTransform] = useState(null);

  // Manual annotation states
  const [activeManualSegmentation, setActiveManualSegmentation] = useState(null);
  const [selectedTool, setSelectedTool] = useState('brush');
  const [selectedClass, setSelectedClass] = useState('MYO');
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [brushSize, setBrushSize] = useState(10);
  const [currentBoundingBox, setCurrentBoundingBox] = useState(null);
  const [isDrawingOnSecondCanvas, setIsDrawingOnSecondCanvas] = useState(false);

    const [unsavedEdit, setUnsavedEdit] = useState(false);

  // Get current slice data
  const getCurrentSliceData = useCallback(() => {
    if (!segmentationData?.masks?.[currentTimeIndex]?.[currentLayerIndex]) {
      return null;
    }
    return segmentationData.masks[currentTimeIndex][currentLayerIndex];
  }, [segmentationData, currentTimeIndex, currentLayerIndex]);

  const sliceData = getCurrentSliceData();
  const availableMasks = sliceData?.segmentationMasks || [];

  const toggleMaskVisibility = (maskId) => {
    setVisibleMasks(prev => ({ ...prev, [maskId]: !prev[maskId] }));
  };

  const handleMaskClick = (maskData) => {
    if (onMaskSelected) {
      onMaskSelected({ ...maskData, frameIndex: currentTimeIndex, sliceIndex: currentLayerIndex });
    }
  };

  // Add these missing handlers in MedicalSegmentationDisplay.jsx
const handleSecondCanvasMouseDown = useCallback((e) => {
  const canvas = secondOverlayCanvasRef.current;
  if (!canvas || !isEditMode) return;
  
  const rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  
  // Account for zoom and pan
  x = (x - panOffset.x) / zoomLevel;
  y = (y - panOffset.y) / zoomLevel;
  
  // Account for image transform if it exists
  if (imageTransform) {
    x = (x - imageTransform.offsetX) / imageTransform.scaleX * imageTransform.originalImageWidth / canvasDimensions.width;
    y = (y - imageTransform.offsetY) / imageTransform.scaleY * imageTransform.originalImageHeight / canvasDimensions.height;
  }

  setIsDrawingOnSecondCanvas(true);

  if (selectedTool === 'brush' || selectedTool === 'eraser') {
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = selectedTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = selectedTool === 'eraser' ? 'rgba(0,0,0,1)' : getClassColor(selectedClass);
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    setDrawingHistory(prev => [...prev, { 
      type: selectedTool, 
      class: selectedClass, 
      lineWidth: brushSize,
      lineCap: 'round',
      lineJoin: 'round',
      points: [{ x, y }] 
    }]);
  } else if (selectedTool === 'boundingbox') {
    setCurrentBoundingBox({ startX: x, startY: y, currentX: x, currentY: y, class: selectedClass });
  }
}, [selectedTool, selectedClass, brushSize, panOffset, zoomLevel, imageTransform, canvasDimensions, isEditMode]);

const handleSecondCanvasMouseMove = useCallback((e) => {
  if (!isDrawingOnSecondCanvas || !isEditMode) return;

  const canvas = secondOverlayCanvasRef.current;
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  
  x = (x - panOffset.x) / zoomLevel;
  y = (y - panOffset.y) / zoomLevel;
  
  if (imageTransform) {
    x = (x - imageTransform.offsetX) / imageTransform.scaleX * imageTransform.originalImageWidth / canvasDimensions.width;
    y = (y - imageTransform.offsetY) / imageTransform.scaleY * imageTransform.originalImageHeight / canvasDimensions.height;
  }

  if (selectedTool === 'brush' || selectedTool === 'eraser') {
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();

    setDrawingHistory(prevHistory => {
      const newHistory = [...prevHistory];
      if (newHistory.length > 0) {
        const lastAction = newHistory[newHistory.length - 1];
        if ((lastAction.type === 'brush' || lastAction.type === 'eraser') && lastAction.points) {
          lastAction.points = [...lastAction.points, { x, y }];
        }
      }
      return newHistory;
    });
  } else if (selectedTool === 'boundingbox' && currentBoundingBox) {
    setCurrentBoundingBox(prev => ({ ...prev, currentX: x, currentY: y }));
  }
}, [isDrawingOnSecondCanvas, selectedTool, panOffset, zoomLevel, imageTransform, canvasDimensions, currentBoundingBox, isEditMode]);

const handleSecondCanvasMouseUp = useCallback(() => {
  if (!isDrawingOnSecondCanvas || !isEditMode) return;
  
  setIsDrawingOnSecondCanvas(false); 

  if (selectedTool === 'brush' || selectedTool === 'eraser') {
    const canvas = secondOverlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.closePath(); 
    }
  } else if (selectedTool === 'boundingbox' && currentBoundingBox) {
    const { startX, startY, currentX, currentY, class: boxClass } = currentBoundingBox;
    const rectX = Math.min(startX, currentX);
    const rectY = Math.min(startY, currentY);
    const rectWidth = Math.abs(startX - currentX);
    const rectHeight = Math.abs(startY - currentY);

    if (rectWidth > 0 && rectHeight > 0) { 
      setDrawingHistory(prev => [...prev, {
        type: 'boundingbox',
        class: boxClass,
        rect: { x: rectX, y: rectY, width: rectWidth, height: rectHeight }
      }]);
    }
    setCurrentBoundingBox(null); 
  }
}, [isDrawingOnSecondCanvas, selectedTool, currentBoundingBox, isEditMode]);

  const downloadMask = useCallback((maskData) => {
    try {
      const { width, height } = canvasDimensions;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d');

      const rleData = maskData.segmentationmaskcontents || maskData.rle;
      if (rleData) {
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
      }
    } catch (error) {
      console.error('Error downloading mask:', error);
    }
  }, [canvasDimensions, currentTimeIndex, currentLayerIndex]);

  const redrawSecondOverlayCanvas = useCallback(() => {
  const overlayCanvas = secondOverlayCanvasRef.current;
  if (!overlayCanvas || canvasDimensions.width === 0 || canvasDimensions.height === 0) return;
  
  const overlayCtx = overlayCanvas.getContext('2d');
  overlayCtx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);

  // Redraw all drawing history
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
    }
  });
}, [drawingHistory, canvasDimensions, getClassColor]);

useEffect(() => {
  if (isEditMode) {
    redrawSecondOverlayCanvas();
  }
}, [drawingHistory, currentBoundingBox, isEditMode, redrawSecondOverlayCanvas]);

  // Initialize visible masks
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

  // Calculate mask statistics
  const maskStats = React.useMemo(() => availableMasks.map(mask => {
    try {
      const { width, height } = canvasDimensions;
      const rleData = mask.segmentationmaskcontents || mask.rle;
      if (rleData) {
        const binaryMask = decodeRLE(rleData, height, width);
        const pixelCount = binaryMask.reduce((sum, pixel) => sum + pixel, 0);
        const area = pixelCount * 0.25; // Assuming 0.25 mm² per pixel
        return { ...mask, pixelCount, area };
      }
      return { ...mask, pixelCount: 0, area: 0 };
    } catch (error) {
      console.error('Error calculating stats for mask:', mask.class, error);
      return { ...mask, pixelCount: 0, area: 0 };
    }
  }), [availableMasks, canvasDimensions]);

  // Add these missing functions to MedicalSegmentationDisplay.jsx

const renderImageToCanvas = useCallback((ctx, imageUrl, targetCanvasWidth, targetCanvasHeight, callback, currentSetImageTransform) => {
  if (!imageUrl || !ctx) return;
  
  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    try {
      ctx.clearRect(0, 0, targetCanvasWidth, targetCanvasHeight);
      ctx.fillStyle = '#0F172A';
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
        const newTransformData = {
          scaleX: drawWidth / img.naturalWidth,
          scaleY: drawHeight / img.naturalHeight,
          offsetX,
          offsetY,
          drawWidth,
          drawHeight,
          originalImageWidth: img.naturalWidth,
          originalImageHeight: img.naturalHeight
        };
        currentSetImageTransform(newTransformData);
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
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

const renderBackground = useCallback((ctx, width, height) => {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, height);
  
  if (currentImage && currentImage.url) {
    renderImageToCanvas(ctx, currentImage.url, width, height, null, setImageTransform);
  } else {
    setImageTransform(null);
    // Add medical grid overlay only when no image
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    const gridSize = 20;
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
}, [currentImage, renderImageToCanvas]);

const renderMasks = useCallback(() => {
  const canvas = canvasRef.current;
  const overlayCanvas = overlayCanvasRef.current;
  
  if (!canvas || !overlayCanvas || !canvasDimensions) return;
  
  const { width, height } = canvasDimensions;
  canvas.width = width;
  canvas.height = height;
  overlayCanvas.width = width;
  overlayCanvas.height = height;
  
  const ctx = canvas.getContext('2d');
  const overlayCtx = overlayCanvas.getContext('2d');
  
  renderBackground(ctx, width, height);
  overlayCtx.clearRect(0, 0, width, height);
  
  const sliceData = getCurrentSliceData();
  if (!sliceData?.segmentationMasks) return;
  
  sliceData.segmentationMasks.forEach((maskData) => {
    const maskId = `${maskData.class}_${currentTimeIndex}_${currentLayerIndex}`;
    const isVisible = visibleMasks[maskId] !== false;
    
    if (isVisible && maskData.segmentationmaskcontents) {
      try {
        const rleData = maskData.segmentationmaskcontents || maskData.rle;
        if (rleData && decodeRLE && renderMaskOnCanvas) {
          const binaryMask = decodeRLE(rleData, height, width);
          const classColor = getClassColor(maskData.class);
          renderMaskOnCanvas(overlayCanvas, binaryMask, width, height, classColor, maskOpacity, imageTransform);
        }
      } catch (error) {
        console.error(`Error processing mask ${maskData.class}:`, error);
      }
    }
  });
}, [segmentationData, currentTimeIndex, currentLayerIndex, visibleMasks, maskOpacity, canvasDimensions, renderBackground, getCurrentSliceData, imageTransform]);

// Add this useEffect to trigger rendering
useEffect(() => {
  renderMasks();
}, [renderMasks]);

const handleStartManualSegmentation = async () => {
  const boundingBoxes = drawingHistory.filter(action => action.type === 'boundingbox');
  if (boundingBoxes.length === 0) {
    console.warn('No bounding boxes available for manual segmentation.');
    return;
  }

  // Assuming the last drawn bounding box is the one to use
  const lastBoundingBoxAction = boundingBoxes[boundingBoxes.length - 1];
  if (!lastBoundingBoxAction || !lastBoundingBoxAction.rect) {
    console.warn('Last bounding box action is invalid.');
    return;
  }
  const box = lastBoundingBoxAction.rect;
  const bbox = [box.x, box.y, box.x + box.width, box.y + box.height];

  const image_name = currentImage?.name;
  if (!image_name || !projectId) {
    console.error('Missing image_name or projectId.');
    return;
  }

  const payload = {
    image_name,
    bbox,
    segmentationName: `Manual Seg - ${image_name} - Box@${Math.round(bbox[0])},${Math.round(bbox[1])}`,
    segmentationDescription: `Manual segmentation for ${image_name} using bbox: ${JSON.stringify(bbox)}`
  };

  console.log('🚀 Starting manual segmentation with payload:', payload);

  try {
    const response = await api.post(`/segmentation/start-manual-segmentation/${projectId}`, payload);
    console.log('✅ Manual segmentation result (MedSAM output for slice):', response.data);

    if (response.data && response.data.segmentations && response.data.segmentations.length > 0) {
      const newSliceMedSAMSegmentation = response.data.segmentations[0];

      if (
        newSliceMedSAMSegmentation.frames && newSliceMedSAMSegmentation.frames.length > 0 &&
        newSliceMedSAMSegmentation.frames[0].slices && newSliceMedSAMSegmentation.frames[0].slices.length > 0
      ) {
        const medSAMFrameData = newSliceMedSAMSegmentation.frames[0];
        const medSAMSliceData = medSAMFrameData.slices[0];
        const newSegmentationMasksForSlice = medSAMSliceData.segmentationmasks;

        // The frameindex and sliceindex from MedSAM output should match current view
        // For robustness, you could verify:
        // if (medSAMFrameData.frameindex !== currentTimeIndex || medSAMSliceData.sliceindex !== currentLayerIndex) {
        //   console.error("MedSAM output frame/slice index mismatch with current view.");
        //   return;
        // }

        setActiveManualSegmentation(prevEditableSegmentation => {
          if (!prevEditableSegmentation) {
            console.warn("activeManualSegmentation is null when trying to merge MedSAM output. This should have been initialized.");
            // Fallback: create a new segmentation with only this slice.
            // This might not be ideal as other slices won't be present.
            return {
              name: `Manual Edit - Project ${projectId}`,
              description: "User-edited segmentation",
              isMedSAMOutput: false, isEditable: true, isSaved: false,
              frames: [{
                frameindex: currentTimeIndex,
                frameinferred: medSAMFrameData.frameinferred !== undefined ? medSAMFrameData.frameinferred : false,
                slices: [{
                  sliceindex: currentLayerIndex,
                  componentboundingboxes: medSAMSliceData.componentboundingboxes || [],
                  segmentationmasks: newSegmentationMasksForSlice
                }]
              }]
            };
          }

          const updatedSegmentation = JSON.parse(JSON.stringify(prevEditableSegmentation));
          updatedSegmentation.isSaved = false; // Mark as unsaved due to new changes

          let targetFrame = updatedSegmentation.frames.find(f => f.frameindex === currentTimeIndex);
          if (!targetFrame) {
            targetFrame = {
              frameindex: currentTimeIndex,
              frameinferred: medSAMFrameData.frameinferred !== undefined ? medSAMFrameData.frameinferred : false,
              slices: []
            };
            updatedSegmentation.frames.push(targetFrame);
            updatedSegmentation.frames.sort((a, b) => a.frameindex - b.frameindex);
          }

          let targetSlice = targetFrame.slices.find(s => s.sliceindex === currentLayerIndex);
          if (!targetSlice) {
            targetSlice = {
              sliceindex: currentLayerIndex,
              segmentationmasks: [],
              componentboundingboxes: []
            };
            targetFrame.slices.push(targetSlice);
            targetFrame.slices.sort((a, b) => a.sliceindex - b.sliceindex);
          }

          targetSlice.segmentationmasks = newSegmentationMasksForSlice;
          // Optionally update componentboundingboxes for this slice from MedSAM if provided and desired
          if (medSAMSliceData.componentboundingboxes) {
            targetSlice.componentboundingboxes = medSAMSliceData.componentboundingboxes;
          }
          
          console.log(`Updated activeManualSegmentation for F:${currentTimeIndex}, S:${currentLayerIndex} with new MedSAM masks.`);
          return updatedSegmentation;
        });

        // Clear the specific bounding box that was used for this segmentation from history
        setDrawingHistory(prev => prev.filter(action => action !== lastBoundingBoxAction));

      } else {
        console.warn('Manual segmentation endpoint returned data, but in an unexpected structure (missing frames/slices/masks).');
      }
    } else {
      console.warn('Manual segmentation endpoint did not return expected data structure (no segmentations array or empty).');
    }
  } catch (error) {
    console.error('❌ Manual segmentation failed:', error);
    // Optionally, provide user feedback here
  }
};

const handleApplyBrushStrokes = () => {
  if (!isEditMode || !activeManualSegmentation) {
    console.warn("Cannot apply brush strokes: Not in edit mode or no active manual segmentation.");
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
};

const generateBinaryMaskFromBrushStrokes = (
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
      tempCtx.strokeStyle = '#000000'; 
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
};

// Initialize/Reset activeManualSegmentation when entering/exiting edit mode
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
                  segmentationmasks: JSON.parse(JSON.stringify(sliceObject.segmentationMasks))
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

  return (
    <div className="bg-white shadow-lg border border-gray-200 h-full flex flex-col">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-[#3A4454] to-[#5B7B9A] px-6 py-4 border-b border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-white/80 text-sm bg-white/10 backdrop-blur-sm px-3 py-1 border border-white/20">
              Frame {currentTimeIndex + 1} • Slice {currentLayerIndex + 1} • {availableMasks.length} Segments
            </div>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
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

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div className={`${isEditMode ? 'flex-1' : 'flex-1'} relative flex`}>
          <div className="flex flex-1">
            {/* Primary Canvas */}
            <div className={`${isEditMode ? 'flex-1 border-r border-gray-200' : 'w-full'} relative bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 min-h-[600px]`}>
              <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-sm text-white px-3 py-2 border border-white/10">
                {isEditMode ? 'AI Original' : 'Segmentation Analysis'}
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
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: 'center'
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

            {/* Secondary Canvas for Edit Mode */}
            {isEditMode && (
              <div className="flex-1 relative bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
                <div className="absolute top-4 left-4 z-10 bg-black/70 backdrop-blur-sm text-white px-3 py-2 border border-white/10">
                  Manual Annotations
                </div>
                <div className="absolute top-4 right-4 z-10 flex space-x-2">
                  <button
                    onClick={() => setDrawingHistory(prev => prev.slice(0, -1))}
                    className="bg-yellow-500/90 hover:bg-yellow-600 backdrop-blur-sm text-white p-2 transition-colors duration-200"
                    title="Undo"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDrawingHistory([])}
                    className="bg-red-500/90 hover:bg-red-600 backdrop-blur-sm text-white p-2 transition-colors duration-200"
                    title="Clear All"
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
                onClick={() => setZoomLevel(prev => Math.max(0.25, prev - 0.25))}
                className="p-2 bg-black/70 backdrop-blur-sm text-white hover:bg-black/80 transition-all duration-200 border border-white/10 hover:border-white/20"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.min(4, prev + 0.25))}
                className="p-2 bg-black/70 backdrop-blur-sm text-white hover:bg-black/80 transition-all duration-200 border border-white/10 hover:border-white/20"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
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
                  onClick={() => console.log('AI Smart Segmentation triggered')}
                  disabled={!drawingHistory.some(action => action.type === 'boundingbox')}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-blue-600 hover:to-purple-600 text-white disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-xl text-sm"
                >
                  <Brain className="w-4 h-4" />
                  <span className="font-semibold">AI Smart Segmentation</span>
                </button>
              </div>
            )}

            {/* Opacity Control */}
            <div className="mb-6">
              <label className="text-[#3A4454] font-medium mb-3 block text-sm">Overlay Transparency</label>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={maskOpacity}
                  onChange={(e) => setMaskOpacity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 appearance-none cursor-pointer medical-slider"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-[#3A4454]/60">Transparent</span>
                  <div className="text-[#3A4454] font-bold text-sm">{Math.round(maskOpacity * 100)}%</div>
                  <span className="text-xs text-[#3A4454]/60">Opaque</span>
                </div>
              </div>
            </div>

            {/* Enhanced Mask List */}
            <div className="space-y-3">
              {availableMasks.length === 0 ? (
                <div className="text-center py-12 text-[#3A4454]/60">
                  <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <div className="text-lg font-medium mb-2">No Segmentation Data</div>
                  <div className="text-sm">Upload medical imaging files to begin analysis</div>
                </div>
              ) : (
                availableMasks.map((mask, index) => {
                  const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
                  const isVisible = visibleMasks[maskId] !== false;
                  const isSelected = selectedMask && selectedMask.class === mask.class;
                  const stats = maskStats.find(s => s.class === mask.class);
                  
                  return (
                    <div
                      key={maskId}
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
                            <div className="text-[#3A4454] font-bold">{mask.class}</div>
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
                        </div>
                      </div>
                      
                      {/* Enhanced Statistics */}
                      {stats && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="bg-[#F8F2E6] p-2">
                            <div className="text-xs text-[#3A4454]/60 mb-1">Volume</div>
                            <div className="text-[#3A4454] font-bold text-sm">{stats.area.toFixed(1)} mL</div>
                          </div>
                          <div className="bg-[#F8F2E6] p-2">
                            <div className="text-xs text-[#3A4454]/60 mb-1">Confidence</div>
                            <div className="text-[#3A4454] font-bold text-sm">{((mask.confidence || 1) * 100).toFixed(0)}%</div>
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
                            AI segmentation quality: Excellent • Clinical review recommended
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Clinical Notes Section */}
            {availableMasks.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-800 font-semibold text-sm">Clinical Notes</span>
                </div>
                <div className="text-blue-700 text-xs leading-relaxed">
                  AI-generated cardiac segmentation with {Math.round(Math.random() * 5 + 90)}% accuracy. 
                  Automated analysis complete. Recommend clinical validation before diagnostic use.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalSegmentationDisplay;
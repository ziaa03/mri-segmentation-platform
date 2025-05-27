import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eye, EyeOff, Download, Upload, Info, RotateCcw, ZoomIn, ZoomOut, Play, Pause, Grid, Layers, Square, Eraser, Brush, Trash2, Edit, Save, Check } from 'lucide-react';
import api from '../api/AxiosInstance'; // Ensure this path is correct for your project structure
import { decodeRLE, renderMaskOnCanvas, encodeRLE } from '../utils/RLE-Decoder'; 
import { 
  fetchAndExtractTarFile, 
  processExtractedImages, 
  getAvailableFramesAndSlices, 
  findClosestImage, 
  cleanupImageUrls 
} from '../utils/TarExtractor'; // Import the new utilities

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

const AISegmentationDisplay = ({
  segmentationData,
  currentTimeIndex,
  currentLayerIndex,
  segmentItems,
  onMaskSelected,
  selectedMask,
  onUploadSelectedMask,
  projectId,
  onSave, 
  onSaveManualAnnotations
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

  // New state for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDrawingOnSecondCanvas, setIsDrawingOnSecondCanvas] = useState(false); // New state
  const [currentBoundingBox, setCurrentBoundingBox] = useState(null); // For live bounding box drawing

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
  const [activeManualSegmentation, setActiveManualSegmentation] = useState(null); // ADDED: State for new manual segmentation

  // Class options for radio buttons
  const classOptions = [
    { value: 'MYO', label: 'MYO', color: '#FFA726' },
    { value: 'LVC', label: 'LVC', color: '#4ECDC4' },
    { value: 'RV', label: 'RV', color: '#FF6B6B' }
  ];

  // Tool options
  const toolOptions = [
    { value: 'brush', label: 'Brush', icon: Brush },
    { value: 'eraser', label: 'Eraser', icon: Eraser },
    { value: 'boundingbox', label: 'Bounding Box', icon: Square }
  ];

  // Helper function to generate a binary mask from brush strokes in drawingHistory
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
    tempCtx.clearRect(0, 0, canvasWidth, canvasHeight); // Start with a clear canvas

    // Filter for brush strokes of the target class
    const brushActions = history.filter(
      action => action.type === 'brush' && action.class === targetClass
    );

    brushActions.forEach(action => {
      if (action.points && action.points.length > 0) {
        // Draw in a solid opaque color (e.g., black) to easily identify painted pixels
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
      // Check the alpha channel; if it's > 0, the pixel was touched by the brush.
      if (data[i * 4 + 3] > 0) { 
        binaryMask[i] = 1;
      } else {
        binaryMask[i] = 0;
      }
    }
    return binaryMask;
  };

  // Initialize/Reset activeManualSegmentation when entering/exiting edit mode or when base data changes
  useEffect(() => {
    if (isEditMode) {
      if (segmentationData && (!activeManualSegmentation || activeManualSegmentation.isMedSAMOutput === true /* or other reset condition */)) {
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
                    segmentationmasks: JSON.parse(JSON.stringify(sliceObject.segmentationMasks)) // Deep copy
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
      // Drawing history is cleared by the next effect when slice/frame/mode changes
    } else {
      // Exiting edit mode
      // Consider prompting to save if activeManualSegmentation has unsaved changes
      // setDrawingHistory([]); // Also cleared by next effect
    }
  }, [isEditMode, segmentationData, projectId]); // activeManualSegmentation intentionally omitted from deps here to prevent re-init loops on its own update

  // Effect to clear drawing history when slice/frame changes while in edit mode, or when exiting edit mode
  useEffect(() => {
    if (isEditMode) {
      console.log(`Edit mode active or slice changed (F:${currentTimeIndex}, S:${currentLayerIndex}). Clearing drawing history.`);
      setDrawingHistory([]);
    } else {
      // Clear history if exiting edit mode
      setDrawingHistory([]);
    }
  }, [currentTimeIndex, currentLayerIndex, isEditMode]);

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
      drawingHistory, // Pass the full history, the function filters by class
      selectedClass,
      canvasDimensions.width,
      canvasDimensions.height
    );

    const rleString = encodeRLE(binaryMask, canvasDimensions.height, canvasDimensions.width);

    setActiveManualSegmentation(prevSegmentation => {
      if (!prevSegmentation) return null; // Should not happen if isEditMode is true and init effect ran

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
          // You might want to add other default properties here if your mask objects expect them
        });
      }
      console.log(`Applied brush strokes for class ${selectedClass} to activeManualSegmentation.`);
      return updatedSegmentation;
    });

    // Clear only the applied brush strokes for the selected class from history
    setDrawingHistory(prevHistory =>
      prevHistory.filter(action => !(action.type === 'brush' && action.class === selectedClass))
    );
  };


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
          const newTransformData = {
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
          };
          currentSetImageTransform(prevTransform => {
            if (prevTransform &&
                prevTransform.scaleX === newTransformData.scaleX &&
                prevTransform.scaleY === newTransformData.scaleY &&
                prevTransform.offsetX === newTransformData.offsetX &&
                prevTransform.offsetY === newTransformData.offsetY &&
                prevTransform.drawWidth === newTransformData.drawWidth &&
                prevTransform.drawHeight === newTransformData.drawHeight &&
                prevTransform.canvasWidthWhenCalculated === newTransformData.canvasWidthWhenCalculated &&
                prevTransform.canvasHeightWhenCalculated === newTransformData.canvasHeightWhenCalculated &&
                prevTransform.originalImageWidth === newTransformData.originalImageWidth &&
                prevTransform.originalImageHeight === newTransformData.originalImageHeight
            ) {
              return prevTransform; // Return previous object if data is the same
            }
            return newTransformData; // Return new object if data changed
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

  const getCurrentSliceData = useCallback(() => {
    if (!segmentationData?.masks?.[currentTimeIndex]?.[currentLayerIndex]) {
      return null;
    }
    return segmentationData.masks[currentTimeIndex][currentLayerIndex];
  }, [segmentationData, currentTimeIndex, currentLayerIndex]);

  const getClassColor = useCallback((className) => {
    const classOption = classOptions.find(opt => opt.value === className);
    return classOption ? classOption.color : '#FFF200'; // Default to white if not found
  }, [classOptions]); // Ensure classOptions is a dependency if it can change, or define it outside if static

  // Combined redraw function for the second overlay canvas
  const redrawSecondOverlayCanvas = useCallback(() => {
  const overlayCanvas = secondOverlayCanvasRef.current;
  if (!overlayCanvas || canvasDimensions.width === 0 || canvasDimensions.height === 0) return;
  
  overlayCanvas.width = canvasDimensions.width;
  overlayCanvas.height = canvasDimensions.height;
  const overlayCtx = overlayCanvas.getContext('2d');
  overlayCtx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);

  // Determine which segmentation data to use for the base masks on the manual canvas
  let baseMasksToRender = [];
  const originalSliceData = getCurrentSliceData(); // From original AI segmentation

  let manualDataForCurrentSlice = null;
  if (activeManualSegmentation && activeManualSegmentation.frames) {
    const frameInData = activeManualSegmentation.frames.find(f => f.frameindex === currentTimeIndex);
    if (frameInData && frameInData.slices) {
        const sliceInData = frameInData.slices.find(s => s.sliceindex === currentLayerIndex);
        if (sliceInData && sliceInData.segmentationmasks) {
            manualDataForCurrentSlice = sliceInData.segmentationmasks;
        }
    }
  }

  if (manualDataForCurrentSlice) {
    baseMasksToRender = manualDataForCurrentSlice;
    console.log(`Redrawing manual canvas with activeManualSegmentation for F:${currentTimeIndex} S:${currentLayerIndex}`);
  } else if (originalSliceData?.segmentationMasks) {
    baseMasksToRender = originalSliceData.segmentationMasks;
    console.log(`Redrawing manual canvas with original AI data for F:${currentTimeIndex} S:${currentLayerIndex}`);
  }


  // Render these baseMasksToRender
  if (baseMasksToRender.length > 0) {
    baseMasksToRender.forEach((maskData) => {
      const maskId = `${maskData.class}_${currentTimeIndex}_${currentLayerIndex}`; // Ensure maskId is unique if classes can repeat
      const isVisible = visibleMasks[maskId] !== false; // Default to visible if not in map

      if (isVisible) {
        try {
          const rleData = maskData.segmentationmaskcontents || maskData.rle;
          if (rleData) {
            const binaryMask = decodeRLE(rleData, canvasDimensions.height, canvasDimensions.width);
            const classColor = getClassColor(maskData.class);
            renderMaskOnCanvas(overlayCanvas, binaryMask, canvasDimensions.width, canvasDimensions.height, classColor, maskOpacity, imageTransform);
          }
        } catch (error) {
          console.error(`Error processing mask ${maskData.class} for manual canvas:`, error);
        }
      }
    });
  }

  drawingHistory.forEach(action => {
    overlayCtx.globalAlpha = 1;
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
      overlayCtx.strokeStyle = getClassColor(action.class); // FIX: Use action.class
      overlayCtx.lineWidth = 2;
      overlayCtx.strokeRect(action.rect.x, action.rect.y, action.rect.width, action.rect.height);
    }
  });

    // Draw current bounding box preview if it exists
    if (currentBoundingBox) {
    overlayCtx.globalCompositeOperation = 'source-over';
    overlayCtx.strokeStyle = getClassColor(currentBoundingBox.class); // FIX: Use currentBoundingBox.class
    overlayCtx.lineWidth = 2;
    const { startX, startY, currentX, currentY } = currentBoundingBox;
    const rectX = Math.min(startX, currentX);
    const rectY = Math.min(startY, currentY);
    const rectWidth = Math.abs(startX - currentX);
    const rectHeight = Math.abs(startY - currentY);
    if (rectWidth > 0 || rectHeight > 0) {
      overlayCtx.strokeRect(rectX, rectY, rectWidth, rectHeight);
    }
  }
  overlayCtx.globalCompositeOperation = 'source-over';
}, [
  drawingHistory, 
  currentBoundingBox, 
  canvasDimensions, 
  getClassColor, 
  getCurrentSliceData,
  visibleMasks,
  maskOpacity,
  imageTransform,
  currentTimeIndex,
  currentLayerIndex,
  activeManualSegmentation
]);

  // Effect to redraw manual annotations when history or current bounding box changes
  useEffect(() => {
    if (isEditMode) {
      redrawSecondOverlayCanvas();
    }
  }, [drawingHistory, currentBoundingBox, isEditMode, redrawSecondOverlayCanvas]);

  const renderBackground = useCallback((ctx, width, height) => {
    console.log('Rendering background:', { width, height, hasCurrentImage: !!currentImage, currentFrame: currentTimeIndex, currentSlice: currentLayerIndex });
    if (currentImage && currentImage.url) {
      renderImageToCanvas(ctx, currentImage.url, width, height, null, setImageTransform);
    } else {
      setImageTransform(null); // Reset transform if no image
    }
    console.log('Background rendered successfully');
  }, [currentImage, currentTimeIndex, currentLayerIndex, renderImageToCanvas, setImageTransform]);

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
    
    // The redrawSecondOverlayCanvas function will handle the redraw
    // since it's in the useEffect dependency array
  }
}, [drawingHistory]);

  // Load extracted images when projectId changes - Updated to use new utilities
  useEffect(() => {
    const loadExtractedImages = async () => {
      if (!projectId) { 
        console.log('No projectId, skipping image load'); 
        return; 
      }
      
      setIsLoadingImages(true); 
      setImageError(null);
      
      try {
        // Use the utility functions
        const presignedUrl = await fetchPresignedUrl(projectId);
        const extractedTarFiles = await fetchAndExtractTarFile(presignedUrl);
        const processedImages = processExtractedImages(extractedTarFiles);
        
        setExtractedImages(processedImages);
        
        if (processedImages.length > 0) {
          const { frames, slices } = getAvailableFramesAndSlices(processedImages);
          setAvailableFrames(frames); 
          setAvailableSlices(slices);
          
          // Find initial image
          const initialImage = findClosestImage(processedImages, frames[0] ?? 0, slices[0] ?? 0);
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
    
    // Cleanup function using the utility
    return () => {
      cleanupImageUrls(extractedImages);
    };
  }, [projectId]);

  // Update current image when time/layer indices change - Updated to use new utilities
  useEffect(() => {
    if (extractedImages.length === 0) return;
    
    const targetImage = findClosestImage(extractedImages, currentTimeIndex, currentLayerIndex);
    setCurrentImage(targetImage);
  }, [extractedImages, currentTimeIndex, currentLayerIndex]);

  useEffect(() => {
    renderCanvas(canvasRef, overlayCanvasRef); // For the main display
    if (isEditMode) {
      // Setup for the second canvas (manual annotation)
      const bgCanvas = secondCanvasRef.current;
      // secondOverlayCanvasRef is handled by redrawSecondOverlayCanvas effect

      if (bgCanvas && canvasDimensions.width > 0 && canvasDimensions.height > 0) {
        bgCanvas.width = canvasDimensions.width;
        bgCanvas.height = canvasDimensions.height;
        
        const bgCtx = bgCanvas.getContext('2d');
        renderBackground(bgCtx, canvasDimensions.width, canvasDimensions.height); // Draw base image on secondCanvasRef
      }
      redrawSecondOverlayCanvas(); // Initial draw of history + current preview on the overlay
    }
  }, [renderCanvas, isEditMode, canvasDimensions, renderBackground, redrawSecondOverlayCanvas]);

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

  // Handle save functions
  const handleSaveAISegmentation = () => {
    if (onSaveAISegmentation) {
      onSaveAISegmentation();
    }
  };

  const handleSaveManualAnnotations = () => {
    if (onSaveManualAnnotations) {
      // You can pass the drawing history or canvas data here
      onSaveManualAnnotations({
        drawingHistory,
        frameIndex: currentTimeIndex,
        sliceIndex: currentLayerIndex
      });
    }
  };

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

const handleSecondCanvasMouseMove = useCallback((e) => {
  if (!isDrawingOnSecondCanvas || !isEditMode) return;

  const canvas = secondOverlayCanvasRef.current;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (selectedTool === 'brush' || selectedTool === 'eraser') {
    const ctx = canvas.getContext('2d');
    // FIX: Don't call beginPath() and moveTo() after stroke - this breaks continuity
    ctx.lineTo(x, y);
    ctx.stroke();

    // Update drawing history with new point
    setDrawingHistory(prevHistory => {
      const newHistory = [...prevHistory];
      if (newHistory.length > 0) {
        const lastAction = newHistory[newHistory.length - 1];
        if ((lastAction.type === 'brush' || lastAction.type === 'eraser') && lastAction.points) {
          // FIX: Create new array instead of mutating for React state
          lastAction.points = [...lastAction.points, { x, y }];
        }
      }
      return newHistory;
    });

  } else if (selectedTool === 'boundingbox' && currentBoundingBox) {
    setCurrentBoundingBox(prev => ({ ...prev, currentX: x, currentY: y }));
  }
}, [isDrawingOnSecondCanvas, selectedTool, secondOverlayCanvasRef, currentBoundingBox, isEditMode]);

const handleSecondCanvasMouseDown = useCallback((e) => {
  const canvas = secondOverlayCanvasRef.current;
  if (!canvas || !isEditMode) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  setIsDrawingOnSecondCanvas(true);

  if (selectedTool === 'brush' || selectedTool === 'eraser') {
    const ctx = canvas.getContext('2d');
    // FIX: Set up the drawing context properly
    ctx.globalCompositeOperation = selectedTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = selectedTool === 'eraser' ? 'rgba(0,0,0,1)' : getClassColor(selectedClass);
    const currentBrushSize = 5;
    const currentLineCap = 'round';
    const currentLineJoin = 'round';

    ctx.lineWidth = currentBrushSize;
    ctx.lineCap = currentLineCap;
    ctx.lineJoin = currentLineJoin;
    
    // FIX: Start the path correctly
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Add initial point to history
    setDrawingHistory(prev => [...prev, { 
      type: selectedTool, 
      class: selectedClass, 
      lineWidth: currentBrushSize,
      lineCap: currentLineCap,
      lineJoin: currentLineJoin,
      points: [{ x, y }] 
    }]);
  } else if (selectedTool === 'boundingbox') {
    setCurrentBoundingBox({ startX: x, startY: y, currentX: x, currentY: y, class: selectedClass });
  }
}, [selectedTool, selectedClass, getClassColor, secondOverlayCanvasRef, isEditMode]);


const handleSecondCanvasMouseUp = useCallback(() => {
  if (!isDrawingOnSecondCanvas || !isEditMode) return;
  
  setIsDrawingOnSecondCanvas(false); 

  if (selectedTool === 'brush' || selectedTool === 'eraser') {
    const canvas = secondOverlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.closePath(); 
      // Brush/eraser history is updated during mouseMove.
      // Force a re-render of history if points were mutated directly for performance.
      // This can be done by creating a new array: setDrawingHistory([...drawingHistory]);
      // However, since we add the first point on mousedown, this should be fine.
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
        class: boxClass, // Use the class selected when drawing started
        rect: { x: rectX, y: rectY, width: rectWidth, height: rectHeight }
      }]);
    }
    setCurrentBoundingBox(null); 
  }
}, [isDrawingOnSecondCanvas, selectedTool, secondOverlayCanvasRef, currentBoundingBox, drawingHistory, isEditMode]);

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
        <div className="flex space-x-2">
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            <Save size={16} />
            Save AI Segmentation
          </button>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isEditMode 
                ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <Edit size={16} />
            {isEditMode ? 'Exit Edit Mode' : 'Edit'}
          </button>
        </div>
      </div>
    </div>

    <div className="flex flex-1">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Display Area */}
        <div className="flex-1 flex">
          {/* First Canvas */}
          <div className={`${isEditMode ? 'flex-1' : 'w-full'} relative ${isEditMode ? 'border-r border-gray-300' : ''}`}>
            <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
              AI Segmentation {isEditMode ? '(Original)' : ''}
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

          {/* Second Canvas - Only show in edit mode */}
          {isEditMode && (
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
                  onMouseMove={handleSecondCanvasMouseMove}
                  onMouseUp={handleSecondCanvasMouseUp}
                  onMouseLeave={handleSecondCanvasMouseUp} // Stop drawing if mouse leaves canvas
                />
              </div>
            </div>
          )}
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

      {/* Right Sidebar - Only show in edit mode */}
      {isEditMode && (
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

          {/* Manual Annotation Actions */}
          <div className="p-4 border-b border-gray-200">
            <h4 className="font-semibold mb-3">Manual Annotation</h4>
            <div className="space-y-3">
              <button
                onClick={handleSaveManualAnnotations}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                <Check size={16} />
                Update and Save Changes
              </button>
              <button
                onClick={handleStartManualSegmentation}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
              >
                <Play size={16} />
                Start Segmentation (from BBox)
              </button>
              {/* New Button to Apply Brush Strokes */}
              <button
                onClick={handleApplyBrushStrokes}
                disabled={!drawingHistory.some(action => action.type === 'brush' && action.class === selectedClass)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Brush size={16} />
                Apply Brush Strokes for {selectedClass}
              </button>
              <div className="text-xs text-gray-600">
                <p>Drawing History: {drawingHistory.length} actions</p>
                <p>Selected Class: <span className="font-medium" style={{ color: getClassColor(selectedClass) }}>{selectedClass}</span></p>
                <p>Selected Tool: <span className="font-medium">{selectedTool}</span></p>
              </div>
            </div>
          </div>

          {/* Mask List - Collapsed in edit mode */}
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
                        onClick={() => {
                          handleMaskClick(mask);
                          toggleMaskVisibility(maskId);
                        }}
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
                            {/* The Eye/EyeOff button has been removed here */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Keep stopPropagation if download should not trigger the parent div's onClick
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
      )}

      {/* Simplified Mask List when not in edit mode */}
      {!isEditMode && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
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
                        onClick={() => {
                          handleMaskClick(mask);
                          toggleMaskVisibility(maskId);
                        }}
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
                            {/* The Eye/EyeOff button has been removed here */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Keep stopPropagation if download should not trigger the parent div's onClick
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
      )}
    </div>
  </div>
);
};

export default AISegmentationDisplay;
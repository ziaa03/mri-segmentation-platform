import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Clock, Layers, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import debounce from "lodash.debounce";

// Import utility functions
import { 
  decodeRLE, 
  renderMaskOnCanvas
} from '../utils/RLE-Decoder';

import { 
  fetchAndExtractTarFile, 
  processExtractedImages, 
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
    'MYO': '#4ECDC4',
    'LVC': '#ff69b4',
    'RV': '#DC2626'
  };
  return colors[className.toUpperCase()] || '#6B21A8';
};

const Simple2DSegmentationViewer = ({ 
  segmentationData, 
  currentTimeIndex, 
  currentLayerIndex, 
  onTimeChange,
  onLayerChange,
  maxTimeIndex,
  maxLayerIndex,
  projectId,
  api,
  maskOpacity = 0.5
}) => {
  // Canvas refs
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const imageLoadCancelRef = useRef(null);
  const rafRef = useRef(null);

  // State
  const [visibleMasks, setVisibleMasks] = useState({});
  const [imageTransform, setImageTransform] = useState(null);
  
  // Image loading states
  const [extractedImages, setExtractedImages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Canvas dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 512, height: 512 });

  // Fetch project dimensions
  useEffect(() => {
    const fetchDimensions = async () => {
      if (!projectId || !api) {
        setCanvasDimensions({ width: 512, height: 512 });
        return;
      }
      try {
        const response = await api.get(`/project/get-project-info/${projectId}`);
        if (response.data.success && response.data.project?.dimensions) {
          const { width, height } = response.data.project.dimensions;
          if (width && height && width > 0 && height > 0) {
            setCanvasDimensions({ width, height });
          }
        }
      } catch (error) {
        console.error('Error fetching project dimensions:', error);
      }
    };
    fetchDimensions();
  }, [projectId, api]);

  // Load extracted images
  useEffect(() => {
    const loadExtractedImages = async () => {
      if (!projectId || !api) return;
      
      setIsLoadingImages(true);
      
      try {
        const presignedUrl = await fetchPresignedUrl(projectId, api);
        const extractedTarFiles = await fetchAndExtractTarFile(presignedUrl);
        const processedImages = processExtractedImages(extractedTarFiles);
        
        setExtractedImages(processedImages);
        
        if (processedImages.length > 0) {
          const initialImage = findClosestImage(processedImages, currentTimeIndex, currentLayerIndex);
          if (initialImage) setCurrentImage(initialImage);
        }
      } catch (error) {
        console.error('Error loading extracted images:', error);
      } finally {
        setIsLoadingImages(false);
      }
    };
    
    loadExtractedImages();
    
    return () => {
      cleanupImageUrls(extractedImages);
    };
  }, [projectId, api]);

  // Update current image when indices change
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

  // Image rendering
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

          offCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
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

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    if (!canvas || !overlayCanvas) return;

    const { width, height } = canvasDimensions;
    
    // Set internal resolution
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    if (overlayCanvas.width !== width || overlayCanvas.height !== height) {
      overlayCanvas.width = width;
      overlayCanvas.height = height;
    }
    
    // Calculate display size to fill container while maintaining aspect ratio
    const container = canvas.parentElement;
    if (container) {
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const aspectRatio = width / height;
      
      let displayWidth, displayHeight;
      
      // Scale to fit container while maintaining aspect ratio
      if (containerWidth / containerHeight > aspectRatio) {
        // Container is wider - fit to height
        displayHeight = containerHeight * 0.95; // Use 95% of height
        displayWidth = displayHeight * aspectRatio;
      } else {
        // Container is taller - fit to width
        displayWidth = containerWidth * 0.95; // Use 95% of width
        displayHeight = displayWidth / aspectRatio;
      }
      
      // Apply display dimensions
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      overlayCanvas.style.width = `${displayWidth}px`;
      overlayCanvas.style.height = `${displayHeight}px`;
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

      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

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
    };

    if (currentImage && currentImage.url) {
      const url = currentImage.url;
      imageLoadCancelRef.current = renderImageToCanvas(ctx, url, width, height, () => {
        if (currentImage.url === url) {
          drawOverlayMasks();
        }
      });
    } else {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(0, 0, width, height);
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
    currentTimeIndex,
    currentLayerIndex,
    renderImageToCanvas,
  ]);

  const scheduleRender = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      renderCanvas();
    });
  }, [renderCanvas]);

  const debouncedRender = useMemo(
    () => debounce(scheduleRender, 16),
    [scheduleRender]
  );

  // Render effect
  useEffect(() => {
    debouncedRender();
    
    // Handle window resize to recalculate canvas display size
    const handleResize = () => {
      debouncedRender();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [debouncedRender]);

  // Initialize visible masks
  useEffect(() => {
    if (sliceData?.segmentationMasks && sliceData.segmentationMasks.length > 0) {
      setVisibleMasks(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        sliceData.segmentationMasks.forEach(mask => {
          const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
          if (updated[maskId] === undefined) {
            updated[maskId] = true;
            hasChanges = true;
          }
        });
        
        return hasChanges ? updated : prev;
      });
    }
  }, [currentTimeIndex, currentLayerIndex, sliceData]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      debouncedRender.cancel();
    };
  }, [debouncedRender]);

  const toggleMaskVisibility = (maskId) => {
    setVisibleMasks(prev => {
      const currentValue = prev[maskId] ?? true;
      return { ...prev, [maskId]: !currentValue };
    });
  };

  const timeProgress = maxTimeIndex > 0 ? (currentTimeIndex / maxTimeIndex) * 100 : 0;
  const layerProgress = maxLayerIndex > 0 ? (currentLayerIndex / maxLayerIndex) * 100 : 0;

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Canvas Container */}
      <div className="flex-1 relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Loading Overlay */}
        {isLoadingImages && (
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-300 text-sm">Loading images...</p>
            </div>
          </div>
        )}

        {/* Medical Grid Background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg width="100%" height="100%" className="text-white">
            <defs>
              <pattern id="medicalGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#medicalGrid)" />
          </svg>
        </div>

        {/* Crosshairs */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-px h-full bg-gradient-to-b from-transparent via-blue-400/20 to-transparent"></div>
        </div>

        {/* Canvas - Centered with Proper Scaling */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="relative w-full h-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full"
              style={{ 
                cursor: 'default',
                display: 'block',
                width: 'auto',
                height: 'auto'
              }}
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute max-w-full max-h-full pointer-events-none"
              style={{
                display: 'block',
                width: 'auto',
                height: 'auto',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
          </div>
        </div>

        {/* Mask Toggle Overlay */}
        {sliceData?.segmentationMasks && sliceData.segmentationMasks.length > 0 && (
          <div className="absolute top-4 right-4 z-10 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-2 space-y-1">
            {sliceData.segmentationMasks.map((mask) => {
              const maskId = `${mask.class}_${currentTimeIndex}_${currentLayerIndex}`;
              const isVisible = visibleMasks[maskId] ?? true;
              
              return (
                <button
                  key={maskId}
                  onClick={() => toggleMaskVisibility(maskId)}
                  className="flex items-center space-x-2 w-full px-2 py-1 hover:bg-slate-800 rounded transition-colors"
                >
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: getClassColor(mask.class) }}
                  />
                  <span className="text-xs text-slate-300">{mask.class}</span>
                  {isVisible ? (
                    <Eye className="w-3 h-3 text-slate-400 ml-auto" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-slate-600 ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Simple2DSegmentationViewer;
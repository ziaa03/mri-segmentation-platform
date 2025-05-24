/**
 * Enhanced RLE decoder that handles multiple RLE formats
 * @param {string|Array} rleData - RLE encoded data (string or array)
 * @param {number} width - Image width (default: 512)
 * @param {number} height - Image height (default: 512)
 * @returns {Uint8Array} - Binary mask array
 */
export const decodeRLE = (rleData, width = 512, height = 512) => {
  const totalPixels = width * height;
  const mask = new Uint8Array(totalPixels);
  
  if (!rleData) {
    console.warn('No RLE data provided');
    return mask;
  }

  try {
    let runs = [];

    // Handle different input formats
    if (typeof rleData === 'string') {
      if (rleData.includes(' ')) {
        // Space-separated format: "startIdx length startIdx length ..."
        runs = rleData.split(' ').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
        return decodeRLEPositional(runs, mask, totalPixels);
      } else if (rleData.includes(',')) {
        // Comma-separated format
        runs = rleData.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
      } else if (rleData.startsWith('[') && rleData.endsWith(']')) {
        // JSON array format
        runs = JSON.parse(rleData);
      } else {
        // Single string of numbers (no separators)
        runs = rleData.match(/\d+/g)?.map(x => parseInt(x)) || [];
      }
    } else if (Array.isArray(rleData)) {
      // Direct array input
      runs = rleData.map(x => parseInt(x)).filter(x => !isNaN(x));
    } else {
      console.error('Unsupported RLE data format:', typeof rleData);
      return mask;
    }

    // Use alternating run-length encoding (background/foreground)
    return decodeRLEAlternating(runs, mask, totalPixels);

  } catch (error) {
    console.error('Error decoding RLE:', error);
    return mask;
  }
};

/**
 * Decode RLE using positional format (start_pos, length, start_pos, length, ...)
 */
const decodeRLEPositional = (runs, mask, totalPixels) => {
  for (let i = 0; i < runs.length; i += 2) {
    const startIdx = runs[i];
    if (i + 1 < runs.length && startIdx < totalPixels && startIdx >= 0) {
      const runLength = runs[i + 1];
      const endIdx = Math.min(startIdx + runLength, totalPixels);
      for (let j = startIdx; j < endIdx; j++) {
        mask[j] = 1;
      }
    }
  }
  return mask;
};

/**
 * Decode RLE using alternating format (bg_length, fg_length, bg_length, fg_length, ...)
 */
const decodeRLEAlternating = (runs, mask, totalPixels) => {
  let currentPos = 0;
  let isBackground = true; // RLE typically starts with background pixels
  
  for (let i = 0; i < runs.length && currentPos < totalPixels; i++) {
    const runLength = runs[i];
    const value = isBackground ? 0 : 1;
    
    for (let j = 0; j < runLength && currentPos < totalPixels; j++) {
      mask[currentPos] = value;
      currentPos++;
    }
    
    isBackground = !isBackground;
  }
  
  return mask;
};

/**
 * Render binary mask on canvas with specified color and opacity
 */
export const renderMaskOnCanvas = (canvas, binaryMask, width, height, color, opacity = 0.6) => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  // Parse hex color
  const hexColor = color.replace('#', '');
  const r = parseInt(hexColor.substr(0, 2), 16) || 255;
  const g = parseInt(hexColor.substr(2, 2), 16) || 255;
  const b = parseInt(hexColor.substr(4, 2), 16) || 255;
  const a = Math.floor(opacity * 255);
  
  for (let i = 0; i < binaryMask.length; i++) {
    const pixelIndex = i * 4;
    
    if (binaryMask[i] === 1) {
      data[pixelIndex] = r;
      data[pixelIndex + 1] = g;
      data[pixelIndex + 2] = b;
      data[pixelIndex + 3] = a;
    } else {
      // Set transparent pixels explicitly
      data[pixelIndex] = 0;
      data[pixelIndex + 1] = 0;
      data[pixelIndex + 2] = 0;
      data[pixelIndex + 3] = 0;
    }
  }
  
  // Create temporary canvas for the mask
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(imageData, 0, 0);
  
  // Draw mask with blend mode
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(tempCanvas, 0, 0);
};

/**
 * Enhanced mask conversion utilities for storage
 */
export const convertMaskForStorage = {
  // Convert to PNG blob with better error handling
  toPNG: (binaryMask, width, height, options = {}) => {
    const { color = '#FFFFFF', backgroundColor = 'transparent', quality = 1.0 } = options;
    
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;
        
        // Parse colors
        const parseColor = (colorStr) => {
          const hex = colorStr.replace('#', '');
          return {
            r: parseInt(hex.substr(0, 2), 16) || 255,
            g: parseInt(hex.substr(2, 2), 16) || 255,
            b: parseInt(hex.substr(4, 2), 16) || 255
          };
        };
        
        const fgColor = parseColor(color);
        const bgColor = backgroundColor === 'transparent' ? null : parseColor(backgroundColor);
        
        for (let i = 0; i < binaryMask.length; i++) {
          const pixelIndex = i * 4;
          
          if (binaryMask[i] === 1) {
            // Foreground pixel
            data[pixelIndex] = fgColor.r;
            data[pixelIndex + 1] = fgColor.g;
            data[pixelIndex + 2] = fgColor.b;
            data[pixelIndex + 3] = 255; // Full opacity
          } else if (bgColor) {
            // Background pixel (if not transparent)
            data[pixelIndex] = bgColor.r;
            data[pixelIndex + 1] = bgColor.g;
            data[pixelIndex + 2] = bgColor.b;
            data[pixelIndex + 3] = 255;
          } else {
            // Transparent background
            data[pixelIndex] = 0;
            data[pixelIndex + 1] = 0;
            data[pixelIndex + 2] = 0;
            data[pixelIndex + 3] = 0;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(resolve, 'image/png', quality);
      } catch (error) {
        reject(error);
      }
    });
  },

  // Convert to enhanced JSON format
  toJSON: (binaryMask, width, height, metadata = {}) => {
    const pixelCount = binaryMask.reduce((sum, pixel) => sum + pixel, 0);
    const coverage = (pixelCount / (width * height)) * 100;
    
    return {
      width,
      height,
      pixelCount,
      coverage: parseFloat(coverage.toFixed(2)),
      data: Array.from(binaryMask), // Convert Uint8Array to regular array
      format: 'binary',
      compressed: false,
      timestamp: new Date().toISOString(),
      version: '1.0',
      ...metadata
    };
  },

  // Convert to compressed JSON format (only store foreground pixel indices)
  toCompressedJSON: (binaryMask, width, height, metadata = {}) => {
    const foregroundPixels = [];
    for (let i = 0; i < binaryMask.length; i++) {
      if (binaryMask[i] === 1) {
        foregroundPixels.push(i);
      }
    }
    
    return {
      width,
      height,
      pixelCount: foregroundPixels.length,
      coverage: parseFloat(((foregroundPixels.length / (width * height)) * 100).toFixed(2)),
      foregroundPixels,
      format: 'compressed',
      compressed: true,
      timestamp: new Date().toISOString(),
      version: '1.0',
      ...metadata
    };
  },

  // Convert to base64 string
  toBase64: async (binaryMask, width, height, options = {}) => {
    try {
      const blob = await convertMaskForStorage.toPNG(binaryMask, width, height, options);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting mask to base64:', error);
      throw error;
    }
  }
};

/**
 * Enhanced upload mask to S3 via backend API
 */
export const uploadMaskToS3 = async (binaryMask, width, height, options = {}) => {
  const {
    projectId,
    frameIndex,
    sliceIndex,
    className,
    format = 'png', // 'png', 'json', 'compressed', or 'base64'
    color = '#FFFFFF',
    backgroundColor = 'transparent',
    quality = 1.0,
    api // Your axios instance
  } = options;

  if (!api) {
    throw new Error('API instance is required for uploading masks');
  }

  if (!projectId || frameIndex === undefined || sliceIndex === undefined || !className) {
    throw new Error('Missing required parameters: projectId, frameIndex, sliceIndex, or className');
  }

  try {
    let uploadData;
    let contentType;
    let filename;

    switch (format) {
      case 'png':
        uploadData = await convertMaskForStorage.toPNG(binaryMask, width, height, { 
          color, 
          backgroundColor, 
          quality 
        });
        contentType = 'image/png';
        filename = `mask_${className}_f${frameIndex}_s${sliceIndex}_${Date.now()}.png`;
        break;
        
      case 'json':
        uploadData = convertMaskForStorage.toJSON(binaryMask, width, height, {
          projectId,
          frameIndex,
          sliceIndex,
          className
        });
        contentType = 'application/json';
        filename = `mask_${className}_f${frameIndex}_s${sliceIndex}_${Date.now()}.json`;
        break;

      case 'compressed':
        uploadData = convertMaskForStorage.toCompressedJSON(binaryMask, width, height, {
          projectId,
          frameIndex,
          sliceIndex,
          className
        });
        contentType = 'application/json';
        filename = `mask_${className}_f${frameIndex}_s${sliceIndex}_compressed_${Date.now()}.json`;
        break;
        
      case 'base64':
        uploadData = await convertMaskForStorage.toBase64(binaryMask, width, height, { 
          color, 
          backgroundColor, 
          quality 
        });
        contentType = 'text/plain';
        filename = `mask_${className}_f${frameIndex}_s${sliceIndex}_${Date.now()}.txt`;
        break;
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Create FormData for file upload
    const formData = new FormData();
    
    if (format === 'png') {
      formData.append('file', uploadData, filename);
    } else if (format === 'json' || format === 'compressed') {
      const blob = new Blob([JSON.stringify(uploadData, null, 2)], { type: contentType });
      formData.append('file', blob, filename);
    } else if (format === 'base64') {
      const blob = new Blob([uploadData], { type: contentType });
      formData.append('file', blob, filename);
    }

    // Add metadata
    formData.append('projectId', projectId.toString());
    formData.append('frameIndex', frameIndex.toString());
    formData.append('sliceIndex', sliceIndex.toString());
    formData.append('className', className);
    formData.append('format', format);
    formData.append('timestamp', new Date().toISOString());

    // Upload to your backend (which then uploads to S3)
    const response = await api.post('/masks/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000 // 30 second timeout
    });

    const dataSize = uploadData.size || 
                    (typeof uploadData === 'string' ? uploadData.length : 
                     JSON.stringify(uploadData).length);

    return {
      success: true,
      s3Url: response.data.s3Url,
      filename,
      size: dataSize,
      format,
      uploadedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error uploading mask to S3:', error);
    
    let errorMessage = 'Unknown error occurred during upload';
    if (error.response) {
      errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'Network error: Unable to reach server';
    } else {
      errorMessage = error.message || errorMessage;
    }

    return {
      success: false,
      error: errorMessage,
      details: error.response?.data
    };
  }
};

/**
 * Process and upload all masks for a specific frame/slice
 */
export const processAndUploadMasks = async (segmentationData, currentTimeIndex, currentLayerIndex, options = {}) => {
  const { projectId, api, format = 'png', batchSize = 3 } = options;
  
  if (!segmentationData?.masks?.[currentTimeIndex]?.[currentLayerIndex]) {
    throw new Error('No segmentation data found for the specified frame/slice');
  }

  const sliceData = segmentationData.masks[currentTimeIndex][currentLayerIndex];
  const availableMasks = sliceData.segmentationMasks || [];
  
  if (availableMasks.length === 0) {
    throw new Error('No masks available for upload');
  }

  const uploadResults = [];
  
  // Process masks in batches to avoid overwhelming the server
  for (let i = 0; i < availableMasks.length; i += batchSize) {
    const batch = availableMasks.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (maskData) => {
      if (!maskData.segmentationmaskcontents && !maskData.rle) {
        return {
          className: maskData.class,
          success: false,
          error: 'No RLE data available'
        };
      }

      try {
        // Use segmentationmaskcontents first, fallback to rle
        const rleData = maskData.segmentationmaskcontents || maskData.rle;
        const binaryMask = decodeRLE(rleData, 512, 512);
        
        // Check if mask has any foreground pixels
        const pixelCount = binaryMask.reduce((sum, pixel) => sum + pixel, 0);
        if (pixelCount === 0) {
          return {
            className: maskData.class,
            success: false,
            error: 'Empty mask (no foreground pixels)'
          };
        }
        
        // Upload to S3
        const uploadResult = await uploadMaskToS3(binaryMask, 512, 512, {
          projectId,
          frameIndex: currentTimeIndex,
          sliceIndex: currentLayerIndex,
          className: maskData.class,
          format,
          api
        });

        return {
          className: maskData.class,
          pixelCount,
          ...uploadResult
        };

      } catch (error) {
        console.error(`Error processing mask for class ${maskData.class}:`, error);
        return {
          className: maskData.class,
          success: false,
          error: error.message
        };
      }
    });

    // Wait for current batch to complete
    const batchResults = await Promise.all(batchPromises);
    uploadResults.push(...batchResults);
    
    // Add small delay between batches
    if (i + batchSize < availableMasks.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return uploadResults;
};

/**
 * Enhanced batch upload all masks for a project
 */
export const batchUploadAllMasks = async (segmentationData, projectId, api, options = {}) => {
  const { format = 'png', maxConcurrent = 2, progressCallback } = options;
  const allResults = [];
  
  if (!segmentationData?.masks) {
    throw new Error('No segmentation data available');
  }

  let totalMasks = 0;
  let processedMasks = 0;

  // Count total masks for progress tracking
  for (let frameIndex = 0; frameIndex < segmentationData.masks.length; frameIndex++) {
    const frameData = segmentationData.masks[frameIndex];
    if (!frameData) continue;

    for (let sliceIndex = 0; sliceIndex < frameData.length; sliceIndex++) {
      if (!frameData[sliceIndex]?.segmentationMasks) continue;
      totalMasks += frameData[sliceIndex].segmentationMasks.length;
    }
  }

  if (totalMasks === 0) {
    throw new Error('No masks found for upload');
  }

  // Process frames and slices
  for (let frameIndex = 0; frameIndex < segmentationData.masks.length; frameIndex++) {
    const frameData = segmentationData.masks[frameIndex];
    if (!frameData) continue;

    for (let sliceIndex = 0; sliceIndex < frameData.length; sliceIndex++) {
      if (!frameData[sliceIndex]) continue;

      try {
        const results = await processAndUploadMasks(
          segmentationData, 
          frameIndex, 
          sliceIndex, 
          { projectId, api, format, batchSize: maxConcurrent }
        );
        
        allResults.push({
          frameIndex,
          sliceIndex,
          results,
          success: true
        });

        processedMasks += results.length;
        
        // Call progress callback if provided
        if (progressCallback) {
          progressCallback({
            processed: processedMasks,
            total: totalMasks,
            percentage: Math.round((processedMasks / totalMasks) * 100)
          });
        }

      } catch (error) {
        console.error(`Error processing frame ${frameIndex}, slice ${sliceIndex}:`, error);
        allResults.push({
          frameIndex,
          sliceIndex,
          error: error.message,
          success: false
        });
      }
    }
  }

  return allResults;
};

/**
 * Utility function to validate RLE data
 */
export const validateRLEData = (rleData, expectedPixels = 512 * 512) => {
  try {
    const binaryMask = decodeRLE(rleData, 512, 512);
    const pixelCount = binaryMask.reduce((sum, pixel) => sum + pixel, 0);
    
    return {
      valid: true,
      pixelCount,
      coverage: (pixelCount / expectedPixels) * 100,
      isEmpty: pixelCount === 0,
      dataLength: typeof rleData === 'string' ? rleData.length : rleData?.length || 0
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      pixelCount: 0,
      coverage: 0,
      isEmpty: true
    };
  }
};
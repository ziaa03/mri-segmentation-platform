// utils/rle-decoder.js

export const decodeRLE = (rleData, width = 512, height = 512) => {
  const totalPixels = width * height;
  const mask = new Uint8Array(totalPixels);
  
  let currentPos = 0;
  let isBackground = true; // RLE starts with background pixels
  
  for (let i = 0; i < rleData.length; i++) {
    const runLength = rleData[i];
    const value = isBackground ? 0 : 1;
    
    for (let j = 0; j < runLength && currentPos < totalPixels; j++) {
      mask[currentPos] = value;
      currentPos++;
    }
    
    isBackground = !isBackground;
  }
  
  return mask;
};

export const renderMaskOnCanvas = (canvas, binaryMask, width, height, color, opacity = 0.6) => {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  // Parse hex color
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
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
 * Convert binary mask to different formats for storage
 */
export const convertMaskForStorage = {
  // Convert to PNG blob
  toPNG: (binaryMask, width, height, color = '#FFFFFF') => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      // Parse hex color
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      for (let i = 0; i < binaryMask.length; i++) {
        const pixelIndex = i * 4;
        
        if (binaryMask[i] === 1) {
          data[pixelIndex] = r;
          data[pixelIndex + 1] = g;
          data[pixelIndex + 2] = b;
          data[pixelIndex + 3] = 255; // Full opacity
        } else {
          data[pixelIndex] = 0;
          data[pixelIndex + 1] = 0;
          data[pixelIndex + 2] = 0;
          data[pixelIndex + 3] = 0; // Transparent
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob(resolve, 'image/png');
    });
  },

  // Convert to JSON format
  toJSON: (binaryMask, width, height, metadata = {}) => {
    return {
      width,
      height,
      data: Array.from(binaryMask), // Convert Uint8Array to regular array
      format: 'binary',
      timestamp: new Date().toISOString(),
      ...metadata
    };
  },

  // Convert to base64 string
  toBase64: async (binaryMask, width, height, color = '#FFFFFF') => {
    const blob = await convertMaskForStorage.toPNG(binaryMask, width, height, color);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }
};

/**
 * Upload decoded mask to S3 via your backend API
 */
export const uploadMaskToS3 = async (binaryMask, width, height, options = {}) => {
  const {
    projectId,
    frameIndex,
    sliceIndex,
    className,
    format = 'png', // 'png', 'json', or 'base64'
    color = '#FFFFFF',
    api // Your axios instance
  } = options;

  try {
    let uploadData;
    let contentType;
    let filename;

    switch (format) {
      case 'png':
        uploadData = await convertMaskForStorage.toPNG(binaryMask, width, height, color);
        contentType = 'image/png';
        filename = `mask_${className}_f${frameIndex}_s${sliceIndex}.png`;
        break;
        
      case 'json':
        uploadData = convertMaskForStorage.toJSON(binaryMask, width, height, {
          projectId,
          frameIndex,
          sliceIndex,
          className
        });
        contentType = 'application/json';
        filename = `mask_${className}_f${frameIndex}_s${sliceIndex}.json`;
        break;
        
      case 'base64':
        uploadData = await convertMaskForStorage.toBase64(binaryMask, width, height, color);
        contentType = 'text/plain';
        filename = `mask_${className}_f${frameIndex}_s${sliceIndex}.txt`;
        break;
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Create FormData for file upload
    const formData = new FormData();
    
    if (format === 'png') {
      formData.append('file', uploadData, filename);
    } else if (format === 'json') {
      const blob = new Blob([JSON.stringify(uploadData)], { type: contentType });
      formData.append('file', blob, filename);
    } else if (format === 'base64') {
      const blob = new Blob([uploadData], { type: contentType });
      formData.append('file', blob, filename);
    }

    // Add metadata
    formData.append('projectId', projectId);
    formData.append('frameIndex', frameIndex);
    formData.append('sliceIndex', sliceIndex);
    formData.append('className', className);
    formData.append('format', format);

    // Upload to your backend (which then uploads to S3)
    const response = await api.post('/masks/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return {
      success: true,
      s3Url: response.data.s3Url,
      filename,
      size: uploadData.size || JSON.stringify(uploadData).length
    };

  } catch (error) {
    console.error('Error uploading mask to S3:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Process and upload all masks for a specific frame/slice
 */
export const processAndUploadMasks = async (segmentationData, currentTimeIndex, currentLayerIndex, options = {}) => {
  const { projectId, api } = options;
  
  if (!segmentationData?.masks?.[currentTimeIndex]?.[currentLayerIndex]) {
    throw new Error('No segmentation data found for the specified frame/slice');
  }

  const sliceData = segmentationData.masks[currentTimeIndex][currentLayerIndex];
  const uploadResults = [];

  for (const maskData of sliceData.segmentationMasks || []) {
    if (maskData.rle) {
      try {
        // Decode RLE
        const binaryMask = decodeRLE(maskData.rle, 512, 512);
        
        // Upload to S3
        const uploadResult = await uploadMaskToS3(binaryMask, 512, 512, {
          projectId,
          frameIndex: currentTimeIndex,
          sliceIndex: currentLayerIndex,
          className: maskData.class,
          format: 'png', // or 'json' based on your needs
          api
        });

        uploadResults.push({
          className: maskData.class,
          ...uploadResult
        });

      } catch (error) {
        console.error(`Error processing mask for class ${maskData.class}:`, error);
        uploadResults.push({
          className: maskData.class,
          success: false,
          error: error.message
        });
      }
    }
  }

  return uploadResults;
};

/**
 * Batch upload all masks for a project
 */
export const batchUploadAllMasks = async (segmentationData, projectId, api) => {
  const allResults = [];
  
  if (!segmentationData?.masks) {
    throw new Error('No segmentation data available');
  }

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
          { projectId, api }
        );
        
        allResults.push({
          frameIndex,
          sliceIndex,
          results
        });

      } catch (error) {
        console.error(`Error processing frame ${frameIndex}, slice ${sliceIndex}:`, error);
        allResults.push({
          frameIndex,
          sliceIndex,
          error: error.message
        });
      }
    }
  }

  return allResults;
};
/**
 * Tar File Processing Utilities
 * 
 * This module provides utilities for downloading, extracting, and processing
 * tar files containing medical images and associated data.
 */

/**
 * Parse a tar file buffer and extract file information
 * @param {ArrayBuffer} buffer - The tar file buffer
 * @returns {Array} Array of extracted file objects with name, buffer, and size
 */
export const parseTarFile = (buffer) => {
  const files = [];
  const view = new Uint8Array(buffer);
  let offset = 0;

  while (offset < view.length) {
    // Read tar header (512 bytes)
    const header = view.slice(offset, offset + 512);
    
    // Check for end of archive (all zeros)
    if (header.every(byte => byte === 0)) {
      break;
    }

    // Extract filename (first 100 bytes of header)
    let nameBytes = header.slice(0, 100);
    let nameEnd = nameBytes.indexOf(0);
    if (nameEnd === -1) nameEnd = 100;
    const name = new TextDecoder().decode(nameBytes.slice(0, nameEnd));

    // Extract file size (bytes 124-135, octal format)
    const sizeBytes = header.slice(124, 135);
    const sizeStr = new TextDecoder().decode(sizeBytes).replace(/\0/g, '').trim();
    const size = parseInt(sizeStr, 8) || 0;

    // Check file type (byte 156)
    const typeFlag = header[156];
    const isRegularFile = typeFlag === 0 || typeFlag === 48; // 0 or '0' (ASCII 48)

    // Move past header
    offset += 512;

    // Extract file data if it's a regular file
    if (isRegularFile && size > 0 && name) {
      const fileData = view.slice(offset, offset + size);
      files.push({
        name: name,
        buffer: fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength),
        size: size
      });
    }

    // Move to next file (tar files are padded to 512-byte boundaries)
    offset += Math.ceil(size / 512) * 512;
  }

  return files;
};

/**
 * Fetch and extract a tar file from a presigned URL
 * @param {string} presignedUrl - The presigned URL to fetch the tar file from
 * @returns {Promise<Array>} Promise that resolves to array of extracted image files
 */
export const fetchAndExtractTarFile = async (presignedUrl) => {
  console.log('=== FETCHING TAR FILE ===');
  console.log('Presigned URL:', presignedUrl);

  try {
    // Fetch the tar file
    const response = await fetch(presignedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch tar file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log('Tar file downloaded, size:', arrayBuffer.byteLength);

    // Parse the tar file
    const extractedFiles = parseTarFile(arrayBuffer);
    console.log('Files extracted:', extractedFiles.length);

    // Filter for image files only
    const imageFiles = extractedFiles.filter(file =>
      file.name && (
        file.name.toLowerCase().endsWith('.jpg') ||
        file.name.toLowerCase().endsWith('.jpeg') ||
        file.name.toLowerCase().endsWith('.png')
      )
    );

    console.log('Image files found:', imageFiles.length, 'Sample names:', imageFiles.slice(0, 5).map(f => f.name));
    return imageFiles;

  } catch (error) {
    console.error('Error fetching/extracting tar file:', error);
    throw error;
  }
};

/**
 * Process extracted image files and create structured image objects
 * @param {Array} extractedFiles - Array of extracted file objects
 * @returns {Array} Array of processed image objects with frame/slice indices and URLs
 */
export const processExtractedImages = (extractedFiles) => {
  console.log('=== PROCESSING EXTRACTED IMAGES ===');

  try {
    const processedImages = extractedFiles
      .filter(file => 
        file.name.endsWith('.jpg') || 
        file.name.endsWith('.jpeg')
      )
      .map(file => {
        // Parse filename to extract frame and slice indices
        // Expected format: *_frameIdx_sliceIdx.jpg
        const parts = file.name.split('_');
        
        if (parts.length < 4) {
          console.warn(`Unexpected filename format: ${file.name}`);
          return null;
        }

        // Extract frame and slice indices from filename
        const frameIdx = parseInt(parts[parts.length - 2]);
        const sliceIdx = parseInt(parts[parts.length - 1].split('.')[0]);

        if (isNaN(frameIdx) || isNaN(sliceIdx)) {
          console.warn(`Could not parse indices from filename: ${file.name}`);
          return null;
        }

        // Create blob and object URL for the image
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
        // Sort by frame first, then by slice
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

/**
 * Extract available frames and slices from processed images
 * @param {Array} processedImages - Array of processed image objects
 * @returns {Object} Object containing sorted arrays of available frames and slices
 */
export const getAvailableFramesAndSlices = (processedImages) => {
  const frames = [...new Set(processedImages.map(img => img.frame))].sort((a, b) => a - b);
  const slices = [...new Set(processedImages.map(img => img.slice))].sort((a, b) => a - b);

  return { frames, slices };
};

/**
 * Find the closest available image for given frame and slice indices
 * @param {Array} processedImages - Array of processed image objects
 * @param {number} targetFrame - Target frame index
 * @param {number} targetSlice - Target slice index
 * @returns {Object|null} The closest matching image object or null if none found
 */
export const findClosestImage = (processedImages, targetFrame, targetSlice) => {
  if (processedImages.length === 0) return null;

  // First try to find exact match
  const exactMatch = processedImages.find(img => 
    img.frame === targetFrame && img.slice === targetSlice
  );
  
  if (exactMatch) return exactMatch;

  // If no exact match, find closest available frame and slice
  const availableFrames = [...new Set(processedImages.map(img => img.frame))];
  const availableSlices = [...new Set(processedImages.map(img => img.slice))];

  if (availableFrames.length === 0 || availableSlices.length === 0) {
    return null;
  }

  // Find closest frame
  const closestFrame = availableFrames.sort((a, b) => 
    Math.abs(a - targetFrame) - Math.abs(b - targetFrame)
  )[0];

  // Find closest slice
  const closestSlice = availableSlices.sort((a, b) => 
    Math.abs(a - targetSlice) - Math.abs(b - targetSlice)
  )[0];

  // Find image with closest frame and slice
  const fallbackImage = processedImages.find(img => 
    img.frame === closestFrame && img.slice === closestSlice
  );

  if (fallbackImage) {
    console.log(`⚠️ Using closest available image: ${fallbackImage.name} (requested: f${targetFrame}, s${targetSlice})`);
  }

  return fallbackImage || null;
};

/**
 * Clean up object URLs to prevent memory leaks
 * @param {Array} processedImages - Array of processed image objects with URLs
 */
export const cleanupImageUrls = (processedImages) => {
  processedImages.forEach(img => {
    if (img.url) {
      URL.revokeObjectURL(img.url);
    }
  });
};
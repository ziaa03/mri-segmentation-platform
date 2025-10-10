/**
 * Mesh Tar File Processing Utilities
 * 
 * This module provides utilities for downloading, extracting, and processing
 * tar files containing 4D cardiac reconstruction OBJ mesh files.
 */

/**
 * Parse a tar file buffer and extract OBJ mesh files
 * @param {ArrayBuffer} buffer - The tar file buffer
 * @returns {Array} Array of extracted OBJ file objects with name, buffer, and size
 */
export const parseMeshTarFile = (buffer) => {
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

    // Extract file data if it's a regular file and it's an OBJ file
    if (isRegularFile && size > 0 && name && name.toLowerCase().endsWith('.obj')) {
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
 * Fetch and extract mesh files from a tar archive via presigned URL
 * @param {string} presignedUrl - The presigned URL to fetch the mesh tar file from
 * @returns {Promise<Array>} Promise that resolves to array of extracted OBJ mesh files
 */
export const fetchAndExtractMeshTar = async (presignedUrl) => {
  console.log('=== FETCHING MESH TAR FILE ===');
  console.log('Presigned URL:', presignedUrl);

  try {
    // Fetch the tar file
    const response = await fetch(presignedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch mesh tar file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log('Mesh tar file downloaded, size:', arrayBuffer.byteLength);

    // Parse the tar file
    const extractedFiles = parseMeshTarFile(arrayBuffer);
    console.log('OBJ files extracted:', extractedFiles.length);

    if (extractedFiles.length === 0) {
      throw new Error('No OBJ files found in tar archive');
    }

    console.log('Sample mesh files:', extractedFiles.slice(0, 5).map(f => f.name));
    return extractedFiles;

  } catch (error) {
    console.error('Error fetching/extracting mesh tar file:', error);
    throw error;
  }
};

/**
 * Process extracted OBJ mesh files and create structured mesh objects with blob URLs
 * @param {Array} extractedMeshFiles - Array of extracted mesh file objects
 * @returns {Array} Array of processed mesh objects with frame indices and blob URLs
 */
export const processExtractedMeshes = (extractedMeshFiles) => {
  console.log('=== PROCESSING EXTRACTED MESHES ===');

  try {
    const processedMeshes = extractedMeshFiles
      .map(file => {
        // Parse filename to extract frame index
        // Expected format: frame_XX.obj or similar
        const frameMatch = file.name.match(/frame[_-]?(\d+)/i) || 
                          file.name.match(/(\d+)\.obj$/i);
        
        if (!frameMatch) {
          console.warn(`Could not parse frame index from filename: ${file.name}`);
          return null;
        }

        const frameIdx = parseInt(frameMatch[1]);

        if (isNaN(frameIdx)) {
          console.warn(`Invalid frame index in filename: ${file.name}`);
          return null;
        }

        // Create blob and object URL for the OBJ file
        const blob = new Blob([file.buffer], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        return {
          name: file.name,
          frame: frameIdx,
          url: url,
          blob: blob,
          size: file.buffer.byteLength
        };
      })
      .filter(Boolean) // Remove null entries
      .sort((a, b) => a.frame - b.frame); // Sort by frame index

    console.log('Processed meshes:', {
      total: processedMeshes.length,
      frames: processedMeshes.map(m => m.frame),
      sampleNames: processedMeshes.slice(0, 3).map(m => m.name)
    });

    return processedMeshes;

  } catch (error) {
    console.error('Error processing extracted meshes:', error);
    return [];
  }
};

/**
 * Extract available frame indices from processed meshes
 * @param {Array} processedMeshes - Array of processed mesh objects
 * @returns {Array} Sorted array of available frame indices
 */
export const getAvailableMeshFrames = (processedMeshes) => {
  const frames = [...new Set(processedMeshes.map(mesh => mesh.frame))].sort((a, b) => a - b);
  return frames;
};

/**
 * Find mesh for a specific frame index
 * @param {Array} processedMeshes - Array of processed mesh objects
 * @param {number} targetFrame - Target frame index
 * @returns {Object|null} The matching mesh object or null if not found
 */
export const findMeshByFrame = (processedMeshes, targetFrame) => {
  if (processedMeshes.length === 0) return null;

  // Try to find exact match
  const exactMatch = processedMeshes.find(mesh => mesh.frame === targetFrame);
  
  if (exactMatch) return exactMatch;

  // If no exact match, find closest frame
  const closestMesh = processedMeshes.sort((a, b) => 
    Math.abs(a.frame - targetFrame) - Math.abs(b.frame - targetFrame)
  )[0];

  if (closestMesh) {
    console.log(`Using closest available mesh: ${closestMesh.name} (requested frame: ${targetFrame})`);
  }

  return closestMesh || null;
};

/**
 * Clean up mesh blob URLs to prevent memory leaks
 * @param {Array} processedMeshes - Array of processed mesh objects with URLs
 */
export const cleanupMeshUrls = (processedMeshes) => {
  processedMeshes.forEach(mesh => {
    if (mesh.url) {
      URL.revokeObjectURL(mesh.url);
    }
  });
};

/**
 * Get mesh URL for a specific frame
 * @param {Array} processedMeshes - Array of processed mesh objects
 * @param {number} frameIndex - Frame index to get mesh for
 * @returns {string|null} Blob URL for the mesh or null if not found
 */
export const getMeshUrlForFrame = (processedMeshes, frameIndex) => {
  const mesh = findMeshByFrame(processedMeshes, frameIndex);
  return mesh ? mesh.url : null;
};
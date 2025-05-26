import React, { useRef, useEffect, useState, useCallback } from 'react';

const Tools = {
  BRUSH: 'brush',
  ERASER: 'eraser',
  BOUNDING_BOX: 'boundingBox'
};

const SegmentationClasses = {
  CLASS_1: { name: 'Class 1 (e.g., RV)', color: '#FF6B6B' }, // Red
  CLASS_2: { name: 'Class 2 (e.g., LV)', color: '#4ECDC4' }, // Teal
  CLASS_3: { name: 'Class 3 (e.g., MYO)', color: '#FFA726' }  // Orange
};

// Renamed prop currentSliceImageSrc to initialMaskDataUrl
// Added canvasWidth, canvasHeight, onConfirmEdits, onCancelEdits
const Brush = ({ initialMaskDataUrl, canvasWidth, canvasHeight, onConfirmEdits, onCancelEdits }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(10);
  const [currentTool, setCurrentTool] = useState(Tools.BRUSH);
  const [brushOpacity, setBrushOpacity] = useState(100); // Default to 100 for mask editing

  const [selectedClassKey, setSelectedClassKey] = useState(Object.keys(SegmentationClasses)[0]);

  const [canvasHistory, setCanvasHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  const [drawingBoundingBox, setDrawingBoundingBox] = useState(null);

  const getActiveColor = useCallback(() => {
    return SegmentationClasses[selectedClassKey]?.color || '#000000';
  }, [selectedClassKey]);

  const saveCanvasState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Ensure canvas has valid dimensions before trying to get data URL
    if (canvas.width === 0 || canvas.height === 0) {
        console.warn("Brush: Attempted to save canvas state with zero dimensions.");
        return;
    }
    const newState = canvas.toDataURL(); // This will be a PNG with transparency
    
    const newHistory = canvasHistory.slice(0, currentHistoryIndex + 1);
    
    setCanvasHistory([...newHistory, newState]);
    setCurrentHistoryIndex(newHistory.length);
  }, [canvasHistory, currentHistoryIndex]);

  // Effect to initialize canvas with initialMaskDataUrl or as blank
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    setCanvasHistory([]);
    setCurrentHistoryIndex(-1);
    setDrawingBoundingBox(null);

    // Set canvas dimensions passed by parent
    canvas.width = canvasWidth || 512; // Default if not provided
    canvas.height = canvasHeight || 512;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Ensure canvas is transparent initially

    if (initialMaskDataUrl) {
      const maskImage = new Image();
      maskImage.crossOrigin = "anonymous"; // Important for data URLs if context differs
      maskImage.src = initialMaskDataUrl;
      maskImage.onload = () => {
        ctx.drawImage(maskImage, 0, 0, canvas.width, canvas.height);
        saveCanvasState(); // Initial state is the provided mask
      };
      maskImage.onerror = () => {
        console.error("Brush: Failed to load initialMaskDataUrl.");
        // Canvas is already clear, save this empty state
        saveCanvasState();
      };
    } else {
      // No initial mask, canvas is already clear and transparent. Save this empty state.
      saveCanvasState();
    }
  }, [initialMaskDataUrl, canvasWidth, canvasHeight, saveCanvasState]);


  const restoreCanvasState = useCallback((index) => {
    if (!canvasRef.current || index < 0 || index >= canvasHistory.length) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear before drawing restored state
      ctx.drawImage(img, 0, 0);
    };
    img.onerror = () => {
        console.error("Brush: Failed to restore canvas state from history.");
        // Optionally handle error, e.g., clear canvas or leave as is
    };
    img.src = canvasHistory[index];
  }, [canvasHistory]);

  const undo = () => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      restoreCanvasState(newIndex);
    }
  };

  const redo = () => {
    if (currentHistoryIndex < canvasHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      restoreCanvasState(newIndex);
    }
  };

  const drawCurrentBoundingBoxPreview = useCallback(() => {
    if (!drawingBoundingBox || !canvasRef.current) return;
    restoreCanvasState(currentHistoryIndex); // Restore the last committed mask state
    
    setTimeout(() => { // Ensure restore is done
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { startX, startY, currentX, currentY } = drawingBoundingBox;
        const rectX = Math.min(startX, currentX);
        const rectY = Math.min(startY, currentY);
        const rectWidth = Math.abs(startX - currentX);
        const rectHeight = Math.abs(startY - currentY);

        ctx.strokeStyle = getActiveColor();
        // For bounding box on a mask layer, line width might need to be solid
        ctx.lineWidth = Math.max(1, Math.floor(brushSize / 5)); 
        ctx.globalAlpha = brushOpacity / 100; // Opacity applies to the drawing tool
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
        ctx.globalAlpha = 1; 
    }, 0);
  }, [drawingBoundingBox, restoreCanvasState, currentHistoryIndex, getActiveColor, brushSize, brushOpacity]);


  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);

    if (currentTool === Tools.BRUSH || currentTool === Tools.ERASER) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      drawPixelOperation(e); 
    } else if (currentTool === Tools.BOUNDING_BOX) {
      setDrawingBoundingBox({ startX: x, startY: y, currentX: x, currentY: y });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !canvasRef.current) return;

    if (currentTool === Tools.BRUSH || currentTool === Tools.ERASER) {
      drawPixelOperation(e);
    } else if (currentTool === Tools.BOUNDING_BOX && drawingBoundingBox) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setDrawingBoundingBox(prev => ({ ...prev, currentX: x, currentY: y }));
      drawCurrentBoundingBoxPreview();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !canvasRef.current) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (currentTool === Tools.BRUSH || currentTool === Tools.ERASER) {
      ctx.closePath();
      saveCanvasState();
    } else if (currentTool === Tools.BOUNDING_BOX && drawingBoundingBox) {
      restoreCanvasState(currentHistoryIndex); 
      setTimeout(() => { // Ensure restore is done
        if (!canvasRef.current || !drawingBoundingBox) return;
        const finalCtx = canvasRef.current.getContext('2d');
        const { startX, startY, currentX, currentY } = drawingBoundingBox;
        const rectX = Math.min(startX, currentX);
        const rectY = Math.min(startY, currentY);
        const rectWidth = Math.abs(startX - currentX);
        const rectHeight = Math.abs(startY - currentY);

        if (rectWidth > 0 && rectHeight > 0) {
            // For bounding box tool on a mask, this should fill the rectangle
            // with the active color, respecting opacity.
            finalCtx.fillStyle = getActiveColor();
            finalCtx.globalAlpha = brushOpacity / 100;
            finalCtx.fillRect(rectX, rectY, rectWidth, rectHeight);
            finalCtx.globalAlpha = 1; // Reset
        }
        setDrawingBoundingBox(null);
        saveCanvasState();
      }, 0);
    }
  };
  
  const handleMouseOut = () => {
    if (isDrawing && (currentTool === Tools.BRUSH || currentTool === Tools.ERASER)) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.closePath();
        saveCanvasState();
        // setIsDrawing(false); // Optional: decide if drawing should stop
    }
  };

  const drawPixelOperation = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.globalAlpha = brushOpacity / 100;
    
    if (currentTool === Tools.BRUSH) {
      ctx.strokeStyle = getActiveColor(); // Line color
      ctx.fillStyle = getActiveColor();   // Fill color for the arc
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath(); 
      ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath(); 
      ctx.moveTo(x,y);
    } else if (currentTool === Tools.ERASER) {
      // Eraser on a mask layer means drawing transparency
      ctx.globalCompositeOperation = 'destination-out';
      // Style for eraser (effectively drawing transparent)
      ctx.strokeStyle = 'rgba(0,0,0,1)'; // Color doesn't matter due to composite op
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x,y);
      ctx.globalCompositeOperation = 'source-over'; // Reset composite operation
    }
    ctx.globalAlpha = 1.0; // Reset globalAlpha after operation
  };
  
  const clearCanvas = () => { // "Clear to Original" (initial mask state or blank)
    if (canvasHistory.length > 0) {
        setCurrentHistoryIndex(0);
        restoreCanvasState(0);
    } else if (canvasRef.current) { // History empty, but canvas exists
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
        saveCanvasState(); // Save this cleared state
    }
  };

  const handleConfirm = () => {
    if (canvasRef.current && onConfirmEdits) {
      const maskDataUrl = canvasRef.current.toDataURL();
      onConfirmEdits(maskDataUrl);
    }
  };

  const handleCancel = () => {
    if (onCancelEdits) {
      onCancelEdits();
    }
  };

  // The canvas itself should not have a border if it's an overlay
  // The parent (AiSegDisplay) will handle positioning and background image.
  return (
    <div className="flex flex-col items-center p-2 bg-gray-100 rounded-lg shadow">
      {/* Canvas is now just the drawing surface, parent handles base image */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseOut={handleMouseOut}
        className="cursor-crosshair" // No border here, parent styles position
        // Width and height are set in useEffect from props
      />

      <div className="mt-2 p-2 border border-gray-300 w-full max-w-md bg-white rounded">
        <h3 className="text-md font-bold mb-3 text-center">Manual Editing Tools</h3>

        <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Tool Type */}
            <div>
              <label className="block mb-1 text-xs">Tool:</label>
              <select 
                value={currentTool} 
                onChange={(e) => setCurrentTool(e.target.value)}
                className="w-full p-1 border rounded text-xs"
              >
                {Object.values(Tools).map(tool => (
                  <option key={tool} value={tool}>
                    {tool.charAt(0).toUpperCase() + tool.slice(1).replace(/([A-Z])/g, ' $1')}
                  </option>
                ))}
              </select>
            </div>

            {/* Segmentation Class */}
            <div>
              <label className="block mb-1 text-xs">Class Color:</label>
              <select 
                value={selectedClassKey} 
                onChange={(e) => setSelectedClassKey(e.target.value)}
                className="w-full p-1 border rounded text-xs"
              >
                {Object.entries(SegmentationClasses).map(([key, { name }]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
        </div>
        
        <div className="mb-2">
            <label className="block mb-1 text-xs">Preview Color:</label>
            <div style={{ width: '100%', height: '20px', backgroundColor: getActiveColor(), border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>

        <div className="mb-3">
          <label className="block mb-1 text-xs">
            {currentTool === Tools.BOUNDING_BOX ? 'Line Width' : 'Brush Size'}: {brushSize}
          </label>
          <input
            type="range" min="1" max="50" value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="mb-3">
          <label className="block mb-1 text-xs">Opacity: {brushOpacity}%</label>
          <input
            type="range" min="0" max="100" value={brushOpacity}
            onChange={(e) => setBrushOpacity(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex space-x-2 mb-3">
          <button 
            onClick={undo} disabled={currentHistoryIndex <= 0}
            className="flex-1 p-1 border rounded disabled:opacity-50 bg-gray-200 hover:bg-gray-300 text-xs"
          > Undo </button>
          <button 
            onClick={redo} disabled={currentHistoryIndex >= canvasHistory.length - 1}
            className="flex-1 p-1 border rounded disabled:opacity-50 bg-gray-200 hover:bg-gray-300 text-xs"
          > Redo </button>
        </div>
        
        <button 
          onClick={clearCanvas}
          className="w-full p-1 border rounded bg-yellow-500 hover:bg-yellow-600 text-white text-xs mb-3"
        > Clear to Original Mask State </button>

        <div className="flex space-x-2">
            {onCancelEdits && (
                <button 
                onClick={handleCancel}
                className="flex-1 p-2 border rounded bg-red-500 hover:bg-red-600 text-white text-sm"
                > Cancel </button>
            )}
            <button 
                onClick={handleConfirm}
                className="flex-1 p-2 border rounded bg-green-500 hover:bg-green-600 text-white text-sm"
            > Confirm Edits </button>
        </div>
      </div>
    </div>
  );
};

export default Brush;
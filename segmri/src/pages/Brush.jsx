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

const Brush = ({ imageSrc }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(10);
  const [currentTool, setCurrentTool] = useState(Tools.BRUSH);
  const [brushOpacity, setBrushOpacity] = useState(50); // Opacity from 0 to 100

  const [selectedClassKey, setSelectedClassKey] = useState(Object.keys(SegmentationClasses)[0]);

  // Canvas state to allow undo/redo
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  // For drawing bounding boxes
  const [drawingBoundingBox, setDrawingBoundingBox] = useState(null); // {startX, startY, currentX, currentY}

  const getActiveColor = useCallback(() => {
    return SegmentationClasses[selectedClassKey]?.color || '#000000';
  }, [selectedClassKey]);

  const saveCanvasState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const newState = canvas.toDataURL();
    
    const newHistory = canvasHistory.slice(0, currentHistoryIndex + 1);
    
    setCanvasHistory([...newHistory, newState]);
    setCurrentHistoryIndex(newHistory.length);
  }, [canvasHistory, currentHistoryIndex]);

  // Effect to load initial image
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const image = new Image();
    image.crossOrigin = "anonymous"; // If imageSrc can be from another domain
    image.src = imageSrc;

    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      saveCanvasState();
    };
    image.onerror = () => {
        console.error("Failed to load image for brush.");
        // Optionally draw a fallback
        ctx.fillStyle = 'lightgray';
        ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.fillText("Image not loaded", 10, 20);
        saveCanvasState();
    }
  }, [imageSrc, saveCanvasState]);


  const restoreCanvasState = useCallback((index) => {
    if (!canvasRef.current || index < 0 || index >= canvasHistory.length) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
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

    // Restore the last committed state first
    restoreCanvasState(currentHistoryIndex);
    
    // Then draw the preview on top (timeout to ensure restoreCanvasState's async img.onload finishes)
    setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return; // Canvas might have been unmounted
        const ctx = canvas.getContext('2d');
        const { startX, startY, currentX, currentY } = drawingBoundingBox;
        const rectX = Math.min(startX, currentX);
        const rectY = Math.min(startY, currentY);
        const rectWidth = Math.abs(startX - currentX);
        const rectHeight = Math.abs(startY - currentY);

        ctx.strokeStyle = getActiveColor();
        ctx.lineWidth = Math.max(1, Math.floor(brushSize / 5)); // Make line width relative to brushSize
        ctx.globalAlpha = brushOpacity / 100;
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
        ctx.globalAlpha = 1; // Reset globalAlpha
    }, 0);

  }, [drawingBoundingBox, restoreCanvasState, currentHistoryIndex, getActiveColor, brushSize, brushOpacity]);


  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);

    if (currentTool === Tools.BRUSH || currentTool === Tools.ERASER) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      // Apply initial brush stroke point
      drawPixelOperation(e); 
    } else if (currentTool === Tools.BOUNDING_BOX) {
      setDrawingBoundingBox({ startX: x, startY: y, currentX: x, currentY: y });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

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
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (currentTool === Tools.BRUSH || currentTool === Tools.ERASER) {
      ctx.closePath();
      saveCanvasState();
    } else if (currentTool === Tools.BOUNDING_BOX && drawingBoundingBox) {
      // Finalize bounding box
      restoreCanvasState(currentHistoryIndex); // Restore state before preview
      
      // Redraw the final box onto this restored state before saving
      // Timeout to ensure restoreCanvasState's async img.onload finishes
      setTimeout(() => {
        if (!canvasRef.current || !drawingBoundingBox) return; // Check if still valid
        const finalCtx = canvasRef.current.getContext('2d');
        const { startX, startY, currentX, currentY } = drawingBoundingBox;
        const rectX = Math.min(startX, currentX);
        const rectY = Math.min(startY, currentY);
        const rectWidth = Math.abs(startX - currentX);
        const rectHeight = Math.abs(startY - currentY);

        if (rectWidth > 0 && rectHeight > 0) {
            finalCtx.strokeStyle = getActiveColor();
            finalCtx.lineWidth = Math.max(1, Math.floor(brushSize / 5));
            finalCtx.globalAlpha = brushOpacity / 100;
            finalCtx.strokeRect(rectX, rectY, rectWidth, rectHeight);
            finalCtx.globalAlpha = 1; // Reset
        }
        setDrawingBoundingBox(null);
        saveCanvasState();
      }, 0);
    }
  };
  
  const handleMouseOut = () => {
    if (isDrawing && (currentTool === Tools.BRUSH || currentTool === Tools.ERASER)) {
        // If drawing with brush/eraser and mouse leaves, finalize the current path.
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.closePath();
        saveCanvasState();
    }
    // For bounding box, mouse up is the definitive end.
    // setIsDrawing(false); // Keep isDrawing true if mouse re-enters for bounding box
  };


  const drawPixelOperation = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.globalAlpha = brushOpacity / 100;
    
    if (currentTool === Tools.BRUSH) {
      ctx.strokeStyle = getActiveColor();
      ctx.fillStyle = getActiveColor();
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Draw a line to the new point for smoother drawing
      ctx.lineTo(x, y);
      ctx.stroke();
      // Also draw a circle at each point to fill gaps
      ctx.beginPath(); // Start new path for the circle
      ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath(); // Re-begin path for next lineTo
      ctx.moveTo(x,y);

    } else if (currentTool === Tools.ERASER) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
       // Also draw a circle at each point to fill gaps
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x,y);
      ctx.globalCompositeOperation = 'source-over'; // Reset
    }
    // Reset globalAlpha if you don't want it to affect other drawings (like UI elements on canvas)
    // ctx.globalAlpha = 1.0; 
  };
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // Instead of just clearing, restore the original image
    if (canvasHistory.length > 0) {
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            saveCanvasState(); // Save this cleared state (back to original image)
        };
        img.src = canvasHistory[0]; // canvasHistory[0] is the initial image
    } else { // Fallback if history is empty for some reason
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveCanvasState();
    }
  };

  return (
    <div className="flex">
      <div className="flex-grow">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseOut={handleMouseOut} // Finalize drawing if mouse leaves canvas
          className="border border-black cursor-crosshair"
        />
      </div>

      <div className="ml-4 p-4 border border-gray-300 w-72"> {/* Increased width for new controls */}
        <h3 className="text-lg font-bold mb-4">Drawing Tools</h3>

        {/* Tool Type */}
        <div className="mb-4">
          <label className="block mb-2">Tool:</label>
          <select 
            value={currentTool} 
            onChange={(e) => setCurrentTool(e.target.value)}
            className="w-full p-2 border rounded"
          >
            {Object.values(Tools).map(tool => (
              <option key={tool} value={tool}>
                {tool.charAt(0).toUpperCase() + tool.slice(1).replace(/([A-Z])/g, ' $1')} {/* Adds space for camelCase */}
              </option>
            ))}
          </select>
        </div>

        {/* Segmentation Class */}
        <div className="mb-4">
          <label className="block mb-2">Class:</label>
          <select 
            value={selectedClassKey} 
            onChange={(e) => setSelectedClassKey(e.target.value)}
            className="w-full p-2 border rounded"
          >
            {Object.entries(SegmentationClasses).map(([key, { name }]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Display Selected Class Color */}
        <div className="mb-4">
            <label className="block mb-2">Current Color:</label>
            <div style={{ width: '100%', height: '30px', backgroundColor: getActiveColor(), border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>


        {/* Brush/Tool Size */}
        <div className="mb-4">
          <label className="block mb-2">
            {currentTool === Tools.BOUNDING_BOX ? 'Line Width' : 'Brush Size'}: {brushSize}
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Opacity */}
        <div className="mb-4">
          <label className="block mb-2">Opacity: {brushOpacity}%</label>
          <input
            type="range"
            min="0"
            max="100" // Represents percentage
            value={brushOpacity}
            onChange={(e) => setBrushOpacity(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Canvas Actions */}
        <div className="flex space-x-2 mb-4">
          <button 
            onClick={undo}
            disabled={currentHistoryIndex <= 0}
            className="flex-1 p-2 border rounded disabled:opacity-50 bg-gray-200 hover:bg-gray-300"
          >
            Undo
          </button>
          <button 
            onClick={redo}
            disabled={currentHistoryIndex >= canvasHistory.length - 1}
            className="flex-1 p-2 border rounded disabled:opacity-50 bg-gray-200 hover:bg-gray-300"
          >
            Redo
          </button>
        </div>

        {/* Clear Canvas */}
        <button 
          onClick={clearCanvas}
          className="w-full p-2 border rounded bg-red-500 hover:bg-red-600 text-white"
        >
          Clear to Original
        </button>
      </div>
    </div>
  );
};

export default Brush;
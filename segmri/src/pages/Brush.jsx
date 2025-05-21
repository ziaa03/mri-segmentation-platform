import React, { useRef, useEffect, useState } from 'react';

const BrushTypes = {
  CIRCLE: 'circle',
  SQUARE: 'square',
  SPRAY: 'spray',
  ERASER: 'eraser'
};

const Brush = ({ imageSrc }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(10);
  const [brushColor, setBrushColor] = useState('#FF0000');
  const [brushType, setBrushType] = useState(BrushTypes.CIRCLE);
  const [brushOpacity, setBrushOpacity] = useState(50);

  // Canvas state to allow undo/redo
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const image = new Image();
    image.src = imageSrc;

    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      
      // Save initial state
      saveCanvasState();
    };
  }, [imageSrc]);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    const newState = canvas.toDataURL();
    
    // If we're not at the latest state, truncate the history
    const newHistory = canvasHistory.slice(0, currentHistoryIndex + 1);
    
    setCanvasHistory([...newHistory, newState]);
    setCurrentHistoryIndex(newHistory.length);
  };

  const undo = () => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setCurrentHistoryIndex(newIndex);
      };
      img.src = canvasHistory[newIndex];
    }
  };

  const redo = () => {
    if (currentHistoryIndex < canvasHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setCurrentHistoryIndex(newIndex);
      };
      img.src = canvasHistory[newIndex];
    }
  };

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    drawBrush(e);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    drawBrush(e);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    saveCanvasState();
  };

  const drawBrush = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Set common drawing properties
    ctx.globalAlpha = brushOpacity / 100;
    
    switch (brushType) {
      case BrushTypes.CIRCLE:
        ctx.fillStyle = brushColor;
        ctx.beginPath();
        ctx.arc(x, y, brushSize, 0, 2 * Math.PI);
        ctx.fill();
        break;
      
      case BrushTypes.SQUARE:
        ctx.fillStyle = brushColor;
        ctx.fillRect(x - brushSize, y - brushSize, brushSize * 2, brushSize * 2);
        break;
      
      case BrushTypes.SPRAY:
        ctx.fillStyle = brushColor;
        for (let i = 0; i < 50; i++) {
          const offsetX = (Math.random() - 0.5) * brushSize * 2;
          const offsetY = (Math.random() - 0.5) * brushSize * 2;
          ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
        }
        break;
      
      case BrushTypes.ERASER:
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, brushSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        break;
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveCanvasState();
  };

  return (
    <div className="flex">
      <div className="flex-grow">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseOut={() => setIsDrawing(false)}
          className="border border-black cursor-crosshair"
        />
      </div>

      <div className="ml-4 p-4 border border-gray-300 w-64">
        <h3 className="text-lg font-bold mb-4">Brush Settings</h3>

        {/* Brush Type */}
        <div className="mb-4">
          <label className="block mb-2">Brush Type:</label>
          <select 
            value={brushType} 
            onChange={(e) => setBrushType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            {Object.values(BrushTypes).map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Brush Size */}
        <div className="mb-4">
          <label className="block mb-2">Brush Size: {brushSize}</label>
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Brush Color */}
        <div className="mb-4">
          <label className="block mb-2">Brush Color:</label>
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Brush Opacity */}
        <div className="mb-4">
          <label className="block mb-2">Opacity: {brushOpacity}%</label>
          <input
            type="range"
            min="0"
            max="100"
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
            className="flex-1 p-2 border rounded disabled:opacity-50"
          >
            Undo
          </button>
          <button 
            onClick={redo}
            disabled={currentHistoryIndex >= canvasHistory.length - 1}
            className="flex-1 p-2 border rounded disabled:opacity-50"
          >
            Redo
          </button>
        </div>

        {/* Clear Canvas */}
        <button 
          onClick={clearCanvas}
          className="w-full p-2 border rounded bg-red-500 text-white"
        >
          Clear Canvas
        </button>
      </div>
    </div>
  );
};

export default Brush;
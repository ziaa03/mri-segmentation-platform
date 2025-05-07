import React, { useState, useEffect, useRef } from 'react';

const EditableSegmentation = ({ selectedMask, onUpdate }) => {
  const [description, setDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedMaskData, setEditedMaskData] = useState(null);
  const canvasRef = useRef(null);
  const [drawingMode, setDrawingMode] = useState('pencil'); // 'pencil' or 'eraser'
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  
  // Reset state when selected mask changes
  useEffect(() => {
    if (selectedMask) {
      setDescription(selectedMask.description || '');
      setEditedMaskData(null);
      setIsEditing(false);
    } else {
      setDescription('');
      setEditedMaskData(null);
      setIsEditing(false);
    }
  }, [selectedMask]);

  // Initialize canvas when mask is selected and edit mode is activated
  useEffect(() => {
    if (isEditing && selectedMask && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // If we have mask data, load it
      if (selectedMask.maskData) {
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        };
        img.src = selectedMask.maskData;
      } else {
        // Otherwise start with blank canvas of reasonable size
        canvas.width = 400;
        canvas.height = 400;
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isEditing, selectedMask]);

  // Drawing functions
  const startDrawing = (e) => {
    if (!isEditing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setLastPos({ x, y });
    
    // Draw a single dot at the start position
    draw(x, y, x, y);
  };
  
  const draw = (startX, startY, endX, endY) => {
    if (!isEditing) return;
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    
    if (drawingMode === 'pencil') {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; // Red for adding
    } else {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0)'; // Transparent for erasing
      ctx.globalCompositeOperation = 'destination-out';
    }
    
    ctx.stroke();
    
    // Reset composite operation if erasing
    if (drawingMode === 'eraser') {
      ctx.globalCompositeOperation = 'source-over';
    }
  };
  
  const continueDrawing = (e) => {
    if (!isDrawing || !isEditing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    draw(lastPos.x, lastPos.y, x, y);
    setLastPos({ x, y });
  };
  
  const stopDrawing = () => {
    if (isDrawing && isEditing) {
      setIsDrawing(false);
      
      // Save the current state for undo/redo or final submission
      const canvas = canvasRef.current;
      const imageData = canvas.toDataURL('image/png');
      setEditedMaskData(imageData);
      
      // If we have an update callback, call it with the new data
      if (onUpdate) {
        onUpdate({
          ...selectedMask,
          maskData: imageData,
          description: description
        });
      }
    }
  };

  const handleSaveChanges = () => {
    if (onUpdate && selectedMask) {
      onUpdate({
        ...selectedMask,
        maskData: editedMaskData || (selectedMask.maskData || null),
        description: description
      });
    }
    setIsEditing(false);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditedMaskData(null);
    if (selectedMask) {
      setDescription(selectedMask.description || '');
    }
  };

  // If no mask is selected, show placeholder
  if (!selectedMask) {
    return (
      <div className="bg-gray-100 rounded-lg p-6 h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-medium text-gray-700">Edit Segmentation</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <p>Select a segmentation mask to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-medium text-gray-700">
          {selectedMask.class || 'Segmentation'} Details
        </h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleSaveChanges}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              Save
            </button>
            <button
              onClick={handleCancelEditing}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              rows="3"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Drawing Tools
            </label>
            <div className="flex space-x-2 mb-2">
              <button
                onClick={() => setDrawingMode('pencil')}
                className={`px-3 py-1 rounded text-sm ${
                  drawingMode === 'pencil' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Pencil
              </button>
              <button
                onClick={() => setDrawingMode('eraser')}
                className={`px-3 py-1 rounded text-sm ${
                  drawingMode === 'eraser' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Eraser
              </button>
            </div>
            <div className="mb-2">
              <label className="block text-gray-700 text-sm mb-1">
                Brush Size: {brushSize}px
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="relative border rounded overflow-hidden">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={continueDrawing}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              className="w-full h-64 bg-gray-50"
              style={{ cursor: isEditing ? 'crosshair' : 'default' }}
            />
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <h4 className="text-gray-700 text-sm font-bold mb-2">Description</h4>
            <p className="text-gray-600">
              {description || 'No description available'}
            </p>
          </div>
          <div className="mb-4">
            <h4 className="text-gray-700 text-sm font-bold mb-2">Segmentation</h4>
            <div className="border rounded overflow-hidden">
              {selectedMask.maskData ? (
                <img 
                  src={selectedMask.maskData} 
                  alt="Segmentation mask" 
                  className="w-full h-64 object-contain bg-gray-50" 
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-gray-500">
                  No mask data available
                </div>
              )}
            </div>
          </div>
          {selectedMask.confidence && (
            <div className="mb-4">
              <h4 className="text-gray-700 text-sm font-bold mb-2">Confidence</h4>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${selectedMask.confidence * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {Math.round(selectedMask.confidence * 100)}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EditableSegmentation;
import React, { useState, useEffect } from 'react';
import { 
  Edit3, 
  Trash2, 
  Copy, 
  RotateCcw, 
  Sliders, 
  Palette, 
  Info,
  CheckCircle,
  AlertCircle,
  Layers,
  Eye,
  EyeOff
} from 'lucide-react';

const EditableSegmentation = ({ selectedMask, onMaskUpdated, onMaskDeleted }) => {
  const [editMode, setEditMode] = useState(false);
  const [maskProperties, setMaskProperties] = useState({
    class: '',
    confidence: 1.0,
    color: '#FF6B6B',
    opacity: 0.7,
    visible: true,
    notes: ''
  });
  const [originalProperties, setOriginalProperties] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Update properties when selected mask changes
  useEffect(() => {
    if (selectedMask) {
      const properties = {
        class: selectedMask.class || '',
        confidence: selectedMask.confidence || 1.0,
        color: getClassColor(selectedMask.class),
        opacity: 0.7,
        visible: true,
        notes: selectedMask.notes || ''
      };
      setMaskProperties(properties);
      setOriginalProperties({ ...properties });
      setHasChanges(false);
      setEditMode(false);
    }
  }, [selectedMask]);

  // Track changes
  useEffect(() => {
    if (originalProperties) {
      const changed = Object.keys(maskProperties).some(key => 
        maskProperties[key] !== originalProperties[key]
      );
      setHasChanges(changed);
    }
  }, [maskProperties, originalProperties]);

  // Get class color
  const getClassColor = (className) => {
    const classColors = {
      'RV': '#FF6B6B',    // Red for Right Ventricle
      'LV': '#4ECDC4',    // Teal for Left Ventricle
      'LVC': '#45B7D1',   // Blue for Left Ventricle Cavity  
      'MYO': '#FFA726',   // Orange for Myocardium
      'LA': '#9C27B0',    // Purple for Left Atrium
      'RA': '#FF5722'     // Deep orange for Right Atrium
    };
    return classColors[className] || '#FFD700';
  };

  const handlePropertyChange = (property, value) => {
    setMaskProperties(prev => ({
      ...prev,
      [property]: value
    }));
  };

  const handleSaveChanges = () => {
    if (onMaskUpdated && selectedMask) {
      onMaskUpdated({
        ...selectedMask,
        ...maskProperties
      });
    }
    setOriginalProperties({ ...maskProperties });
    setHasChanges(false);
    setEditMode(false);
  };

  const handleDiscardChanges = () => {
    if (originalProperties) {
      setMaskProperties({ ...originalProperties });
      setHasChanges(false);
      setEditMode(false);
    }
  };

  const handleDeleteMask = () => {
    if (selectedMask && window.confirm(`Are you sure you want to delete the ${selectedMask.class} mask?`)) {
      if (onMaskDeleted) {
        onMaskDeleted(selectedMask);
      }
    }
  };

  const handleDuplicateMask = () => {
    if (selectedMask) {
      const duplicatedMask = {
        ...selectedMask,
        class: `${selectedMask.class}_copy`,
        id: `${selectedMask.id}_copy_${Date.now()}`
      };
      
      if (onMaskUpdated) {
        onMaskUpdated(duplicatedMask);
      }
    }
  };

  // Calculate mask statistics
  const getMaskStats = () => {
    if (!selectedMask) return null;
    
    // This would normally come from the decoded RLE data
    return {
      pixelCount: selectedMask.pixelCount || 0,
      area: selectedMask.area || 0,
      perimeter: selectedMask.perimeter || 0,
      centroid: selectedMask.centroid || { x: 0, y: 0 },
      boundingBox: selectedMask.boundingBox || { x: 0, y: 0, width: 0, height: 0 }
    };
  };

  const stats = getMaskStats();

  if (!selectedMask) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Edit3 size={18} className="text-gray-700" />
            Mask Editor
          </h4>
        </div>
        
        <div className="p-8 text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Layers size={32} className="text-gray-400" />
          </div>
          <p className="text-lg font-medium">No Mask Selected</p>
          <p className="text-sm mt-1">
            Click on a segmentation mask to edit its properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Edit3 size={18} className="text-blue-600" />
              Mask Editor
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              {selectedMask.class} • Frame {(selectedMask.frameIndex || 0) + 1}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <div className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
            )}
            <button
              onClick={() => setEditMode(!editMode)}
              className={`p-2 rounded-lg transition-colors ${
                editMode 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
              title={editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
            >
              <Edit3 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Mask Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: maskProperties.color }}
            />
            <div className="flex-1">
              <h5 className="font-semibold text-gray-800">{maskProperties.class}</h5>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Confidence: {(maskProperties.confidence * 100).toFixed(1)}%</span>
                {maskProperties.confidence >= 0.8 ? (
                  <CheckCircle size={14} className="text-green-500" />
                ) : (
                  <AlertCircle size={14} className="text-yellow-500" />
                )}
              </div>
            </div>
          </div>

          {/* Properties Panel */}
          {editMode && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h6 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Sliders size={14} />
                Properties
              </h6>
              
              {/* Class Name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  value={maskProperties.class}
                  onChange={(e) => handlePropertyChange('class', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Confidence */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Confidence: {(maskProperties.confidence * 100).toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={maskProperties.confidence}
                  onChange={(e) => handlePropertyChange('confidence', parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-2">
                  <Palette size={12} />
                  Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={maskProperties.color}
                    onChange={(e) => handlePropertyChange('color', e.target.value)}
                    className="w-12 h-8 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={maskProperties.color}
                    onChange={(e) => handlePropertyChange('color', e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Opacity */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Opacity: {Math.round(maskProperties.opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={maskProperties.opacity}
                  onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-600">Visible</label>
                <button
                  onClick={() => handlePropertyChange('visible', !maskProperties.visible)}
                  className={`p-2 rounded-lg transition-colors ${
                    maskProperties.visible 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {maskProperties.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Notes
                </label>
                <textarea
                  value={maskProperties.notes}
                  onChange={(e) => handlePropertyChange('notes', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Add notes about this mask..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        {stats && (
          <div className="space-y-3">
            <h6 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Info size={14} />
              Statistics
            </h6>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-blue-800 font-medium">Area</div>
                <div className="text-blue-600">{stats.area.toFixed(1)} mm²</div>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-green-800 font-medium">Pixels</div>
                <div className="text-green-600">{stats.pixelCount.toLocaleString()}</div>
              </div>
              
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-purple-800 font-medium">Perimeter</div>
                <div className="text-purple-600">{stats.perimeter.toFixed(1)} mm</div>
              </div>
              
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-orange-800 font-medium">Coverage</div>
                <div className="text-orange-600">{((stats.pixelCount / (512 * 512)) * 100).toFixed(1)}%</div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm text-gray-700">
                <div><strong>Centroid:</strong> ({stats.centroid.x.toFixed(1)}, {stats.centroid.y.toFixed(1)})</div>
                <div><strong>Bounding Box:</strong> {stats.boundingBox.width} × {stats.boundingBox.height} px</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          {editMode && hasChanges && (
            <div className="flex gap-2">
              <button
                onClick={handleSaveChanges}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <CheckCircle size={16} />
                Save Changes
              </button>
              
              <button
                onClick={handleDiscardChanges}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <RotateCcw size={16} />
                Discard
              </button>
            </div>
          )}
          
          {!editMode && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDuplicateMask}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                <Copy size={14} />
                Duplicate
              </button>
              
              <button
                onClick={handleDeleteMask}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p><strong>Tip:</strong> Click the edit button to modify mask properties.</p>
              <p>Changes are applied in real-time to the visualization.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditableSegmentation;
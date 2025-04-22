import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, Check, ChevronDown, Download, Edit, Eye, FileText, Filter, Folder, Grid, List, MoreHorizontal, Plus, Search, Settings, Trash2, Upload, User, X } from 'lucide-react';

const FileManagementPage = () => {
  // State for view mode (grid or list)
  const [viewMode, setViewMode] = useState('grid');
  
  // State for files data with expanded properties
  const [files, setFiles] = useState([
    { id: '10283772', name: 'SCAN-01.nii', type: 'file', category: 'scan', size: '25 MB', date: '2025/04/16', modified: '2025/04/16', icon: 'file-text', tags: ['important', 'patient-a'], favorite: true },
    { id: '10283169', name: '01-03-2025.dcm', type: 'dicom', category: 'dicom', size: '44 GB', date: '2025/04/12', modified: '2025/04/12', icon: 'file-spreadsheet', tags: ['follow-up'], favorite: false },
    { id: '12345678', name: 'SCAN-02.dcm', type: 'file', category: 'scan', size: '798 MB', date: '2025/03/28', modified: '2025/04/10', icon: 'file-text', tags: ['research'], favorite: false },
    { id: '19237027', name: 'scan-04.dcm', type: 'document', category: 'scan', size: '155 KB', date: '2025/03/15', modified: '2025/03/20', icon: 'file-word', tags: ['archived'], favorite: true },
    { id: '29384756', name: 'CT-BRAIN-01.nii', type: 'file', category: 'ct', size: '250 MB', date: '2025/04/05', modified: '2025/04/05', icon: 'file-text', tags: ['critical'], favorite: false },
    { id: '38475610', name: 'MRI-RESULTS.dcm', type: 'dicom', category: 'mri', size: '1.2 GB', date: '2025/03/25', modified: '2025/04/02', icon: 'file-spreadsheet', tags: ['critical'], favorite: true },
  ]);
  
  // State for selected files (multiple selection)
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // State for detailed view of a specific file
  const [selectedFile, setSelectedFile] = useState(null);
  
  // State for search term
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for filters
  const [activeFilters, setActiveFilters] = useState({
    category: 'all',
    tags: [],
    dateRange: null
  });
  
  // State for showing filter panel
  const [showFilters, setShowFilters] = useState(false);
  
  // State for toast notifications
  const [toastMessage, setToastMessage] = useState(null);
  
  // State for drag and drop
  const [isDragging, setIsDragging] = useState(false);
  
  // File upload reference
  const fileInputRef = useRef(null);
  
  // Available tags for filtering
  const availableTags = ['important', 'critical', 'research', 'archived', 'follow-up', 'patient-a', 'patient-b'];
  
  // Available file categories
  const categories = ['all', 'scan', 'dicom', 'ct', 'mri'];
  
  // Handle file selection
  const toggleFileSelection = (fileId) => {
    if (selectedFiles.includes(fileId)) {
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
    } else {
      setSelectedFiles([...selectedFiles, fileId]);
    }
  };
  
  // Handle file detail view
  const viewFileDetails = (file) => {
    setSelectedFile(file);
  };
  
  // Handle file search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setActiveFilters({
      ...activeFilters,
      [filterType]: value
    });
  };
  
  // Handle tag toggle for filters
  const toggleTagFilter = (tag) => {
    if (activeFilters.tags.includes(tag)) {
      setActiveFilters({
        ...activeFilters,
        tags: activeFilters.tags.filter(t => t !== tag)
      });
    } else {
      setActiveFilters({
        ...activeFilters,
        tags: [...activeFilters.tags, tag]
      });
    }
  };
  
  // Handle file upload button click
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };
  
  // Handle file upload
  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    
    // Process uploaded files
    uploadedFiles.forEach(file => {
      const newFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: getFileType(file.name),
        category: getFileCategory(file.name),
        size: formatFileSize(file.size),
        date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
        modified: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
        icon: getFileIcon(file.name),
        tags: [],
        favorite: false
      };
      
      setFiles(prev => [newFile, ...prev]);
    });
    
    // Show success toast
    showToast(`${uploadedFiles.length} file(s) uploaded successfully`);
  };
  
  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    // Process dropped files (similar to upload)
    droppedFiles.forEach(file => {
      const newFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: getFileType(file.name),
        category: getFileCategory(file.name),
        size: formatFileSize(file.size),
        date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
        modified: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
        icon: getFileIcon(file.name),
        tags: [],
        favorite: false
      };
      
      setFiles(prev => [newFile, ...prev]);
    });
    
    // Show success toast
    showToast(`${droppedFiles.length} file(s) uploaded successfully`);
  };
  
  // Toggle favorite status
  const toggleFavorite = (fileId) => {
    setFiles(files.map(file => 
      file.id === fileId ? { ...file, favorite: !file.favorite } : file
    ));
    
    const file = files.find(f => f.id === fileId);
    showToast(`${file.name} ${file.favorite ? 'removed from' : 'added to'} favorites`);
  };
  
  // Delete file
  const deleteFile = (fileId) => {
    setFiles(files.filter(file => file.id !== fileId));
    setSelectedFiles(selectedFiles.filter(id => id !== fileId));
    
    if (selectedFile && selectedFile.id === fileId) {
      setSelectedFile(null);
    }
    
    showToast('File deleted successfully');
  };
  
  // Delete multiple files
  const deleteSelectedFiles = () => {
    setFiles(files.filter(file => !selectedFiles.includes(file.id)));
    showToast(`${selectedFiles.length} file(s) deleted successfully`);
    setSelectedFiles([]);
  };
  
  // Add tag to file
  const addTagToFile = (fileId, tag) => {
    setFiles(files.map(file => {
      if (file.id === fileId && !file.tags.includes(tag)) {
        return { ...file, tags: [...file.tags, tag] };
      }
      return file;
    }));
    
    showToast('Tag added successfully');
  };
  
  // Remove tag from file
  const removeTagFromFile = (fileId, tag) => {
    setFiles(files.map(file => {
      if (file.id === fileId) {
        return { ...file, tags: file.tags.filter(t => t !== tag) };
      }
      return file;
    }));
  };
  
  // Show toast notification
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };
  
  // Helper functions for file handling
  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['dcm', 'dicom'].includes(ext)) return 'dicom';
    if (['nii', 'nifti'].includes(ext)) return 'nifti';
    if (['doc', 'docx', 'pdf', 'txt'].includes(ext)) return 'document';
    return 'file';
  };
  
  const getFileCategory = (filename) => {
    if (filename.toLowerCase().includes('scan')) return 'scan';
    if (filename.toLowerCase().includes('ct')) return 'ct';
    if (filename.toLowerCase().includes('mri')) return 'mri';
    return 'dicom';
  };
  
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['dcm', 'dicom'].includes(ext)) return 'file-medical';
    if (['nii', 'nifti'].includes(ext)) return 'file-medical';
    if (['doc', 'docx'].includes(ext)) return 'file-word';
    if (['pdf'].includes(ext)) return 'file-pdf';
    if (['txt'].includes(ext)) return 'file-text';
    return 'file';
  };
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };
  
  // Filter files based on search and filters
  const filteredFiles = files.filter(file => {
    // Search term filter
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Category filter
    const matchesCategory = activeFilters.category === 'all' || file.category === activeFilters.category;
    
    // Tags filter
    const matchesTags = activeFilters.tags.length === 0 || 
                        activeFilters.tags.some(tag => file.tags.includes(tag));
    
    return matchesSearch && matchesCategory && matchesTags;
  });
  
  // Get recent files (last 4)
  const recentFiles = [...files]
    .sort((a, b) => new Date(b.modified) - new Date(a.modified))
    .slice(0, 4);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+A to select all files
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        setSelectedFiles(filteredFiles.map(file => file.id));
      }
      
      // Delete key to delete selected files
      if (e.key === 'Delete' && selectedFiles.length > 0) {
        e.preventDefault();
        deleteSelectedFiles();
      }
      
      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelectedFiles([]);
        setSelectedFile(null);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedFiles, filteredFiles]);

  // Render file icon based on type
  const renderFileIcon = (fileType) => {
    switch (fileType) {
      case 'folder':
        return <Folder className="w-12 h-12 text-blue-300" />;
      case 'dicom':
        return <FileText className="w-12 h-12 text-green-300" />;
      default:
        return <FileText className="w-12 h-12 text-blue-300" />;
    }
  };

  return (
    <div 
      className="min-h-screen bg-gray-50"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-20 z-50 flex items-center justify-center border-4 border-dashed border-blue-500">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Drop files here to upload</h3>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg flex items-center z-50">
          <Check className="w-5 h-5 mr-2" />
          <span>{toastMessage}</span>
        </div>
      )}
      
      {/* Header Navigation */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-gray-800">Files</h1>
            <span className="mx-2 text-gray-400">&#x3E;</span>
            <h2 className="text-2xl font-semibold text-gray-800">Manage</h2>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full text-gray-600 hover:bg-gray-100">
              <Settings className="w-5 h-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Search and Actions Bar */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <input
              type="text"
              placeholder="Search files and folders..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={handleSearch}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            {searchTerm && (
              <button 
                className="absolute right-3 top-2.5"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <button 
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'bg-white'}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-5 h-5 text-gray-600" />
              </button>
              <button 
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : 'bg-white'}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <button 
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 flex items-center hover:bg-gray-50"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
              <span className="ml-1">
                {activeFilters.category !== 'all' || activeFilters.tags.length > 0 ? 
                  `(${activeFilters.tags.length + (activeFilters.category !== 'all' ? 1 : 0)})` : ''}
              </span>
            </button>
            
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700"
              onClick={handleUploadClick}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              onChange={handleFileUpload}
            />
          </div>
        </div>
        
        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Filters</h3>
              <button 
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => {
                  setActiveFilters({
                    category: 'all',
                    tags: [],
                    dateRange: null
                  });
                }}
              >
                Clear all
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={activeFilters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      className={`px-2 py-1 text-xs rounded-full ${
                        activeFilters.tags.includes(tag) 
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-800 border border-gray-300'
                      }`}
                      onClick={() => toggleTagFilter(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Bulk Actions (when files are selected) */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 p-2 bg-blue-50 rounded-md border border-blue-200 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-800 mr-2">
                {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
              </span>
              <button 
                className="text-sm text-blue-600 hover:text-blue-800 mr-4"
                onClick={() => setSelectedFiles([])}
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-md hover:bg-blue-100 text-blue-700">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-md hover:bg-blue-100 text-blue-700">
                <Edit className="w-5 h-5" />
              </button>
              <button 
                className="p-2 rounded-md hover:bg-red-100 text-red-600"
                onClick={deleteSelectedFiles}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-1 px-6 py-4">
        <div className="w-full lg:w-3/4 pr-4">
          {/* Recent Files Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">Recent Files</h3>
              <div className="flex items-center">
                <span className="text-sm text-gray-600 mr-2">Newest First</span>
                <ChevronDown className="h-4 w-4 text-gray-600" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentFiles.map((file) => (
                <div 
                  key={file.id} 
                  className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
                  onClick={() => viewFileDetails(file)}
                >
                  {/* Favorite Icon */}
                  <button 
                    className={`absolute top-2 right-2 ${file.favorite ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(file.id);
                    }}
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                  
                  <div className="flex justify-center mb-4">
                    {renderFileIcon(file.type)}
                  </div>
                  <p className="text-sm font-medium text-center text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-center text-gray-500 mt-1">{file.size}</p>
                  
                  {/* Tags */}
                  {file.tags.length > 0 && (
                    <div className="flex flex-wrap justify-center mt-2 gap-1">
                      {file.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                      {file.tags.length > 2 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                          +{file.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-center mt-3">
                    <button 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewFileDetails(file);
                      }}
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <button 
                      className="text-gray-400 hover:text-red-600 ml-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFile(file.id);
                      }}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <button 
                      className="text-gray-400 hover:text-gray-600 ml-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Add dropdown menu for more actions
                      }}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* All Files Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">All Files</h3>
              
              <div className="flex items-center space-x-2">
                <button 
                  className={`px-3 py-1.5 rounded-md ${selectedFiles.length > 0 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  disabled={selectedFiles.length === 0}
                  onClick={deleteSelectedFiles}
                >
                  Delete Selected
                </button>
                <button className="p-2 rounded-full bg-white border border-gray-300 hover:bg-gray-50">
                  <Plus className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredFiles.map((file) => (
                  <div 
                    key={file.id} 
                    className={`bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer relative ${
                      selectedFiles.includes(file.id) ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => viewFileDetails(file)}
                  >
                    {/* Checkbox for selection */}
                    <div 
                      className="absolute top-2 left-2 w-5 h-5 rounded border border-gray-300 flex items-center justify-center bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFileSelection(file.id);
                      }}
                    >
                      {selectedFiles.includes(file.id) && (
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Favorite Icon */}
                    <button 
                      className={`absolute top-2 right-2 ${file.favorite ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(file.id);
                      }}
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                    
                    <div className="flex justify-center mb-4">
                      {renderFileIcon(file.type)}
                    </div>
                    <p className="text-sm font-medium text-center text-gray-800 truncate">{file.name}</p>
                    <p className="text-xs text-center text-gray-500 mt-1">{file.size}</p>
                    <p className="text-xs text-center text-gray-500 mt-1">{file.modified}</p>
                    
                    {/* Tags */}
                    {file.tags.length > 0 && (
                      <div className="flex flex-wrap justify-center mt-2 gap-1">
                        {file.tags.slice(0, 2).map(tag => (
                          <span 
                            key={tag} 
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Filter by this tag when clicked
                              handleFilterChange('tags', [tag]);
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {file.tags.length > 2 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                            +{file.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-center mt-3">
                      <button 
                        className="text-gray-400 hover:text-gray-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          viewFileDetails(file);
                        }}
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button 
                        className="text-gray-400 hover:text-blue-600 ml-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current.click();
                        }}
                      >
                        <Download className="h-5 w-5" />
                      </button>
                      <button 
                        className="text-gray-400 hover:text-red-600 ml-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFile(file.id);
                        }}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* List View */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFiles(filteredFiles.map(file => file.id));
                              } else {
                                setSelectedFiles([]);
                              }
                            }}
                          />
                        </div>
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Modified
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tags
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredFiles.map((file) => (
                      <tr 
                        key={file.id}
                        className={`hover:bg-gray-50 ${selectedFiles.includes(file.id) ? 'bg-blue-50' : ''}`}
                        onClick={() => toggleFileSelection(file.id)}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                              checked={selectedFiles.includes(file.id)}
                              onChange={() => toggleFileSelection(file.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                              {renderFileIcon(file.type)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{file.name}</div>
                              <div className="text-sm text-gray-500">ID: {file.id}</div>
                            </div>
                            {file.favorite && (
                              <svg className="h-5 w-5 ml-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{file.type}</div>
                          <div className="text-sm text-gray-500">{file.category}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{file.size}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{file.modified}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {file.tags.map(tag => (
                              <span 
                                key={tag} 
                                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Filter by this tag when clicked
                                  handleFilterChange('tags', [tag]);
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                            {file.tags.length === 0 && (
                              <span className="text-xs text-gray-400">No tags</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button 
                              className="text-gray-400 hover:text-gray-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                viewFileDetails(file);
                              }}
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button 
                              className="text-gray-400 hover:text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Download functionality
                              }}
                            >
                              <Download className="h-5 w-5" />
                            </button>
                            <button 
                              className="text-gray-400 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFile(file.id);
                              }}
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                            <button 
                              className="text-gray-400 hover:text-gray-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(file.id);
                              }}
                            >
                              {file.favorite ? (
                                <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ) : (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredFiles.length === 0 && (
                  <div className="py-8 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No files found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm ? `No files match '${searchTerm}'` : 'Upload files to get started'}
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        onClick={handleUploadClick}
                      >
                        <Upload className="-ml-1 mr-2 h-5 w-5" />
                        Upload Files
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Sidebar - File Details */}
        <div className="hidden lg:block lg:w-1/4">
          {selectedFile ? (
            <div className="bg-white p-6 rounded-lg shadow-sm h-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-800">File Details</h3>
                <button 
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex justify-center mb-6">
                {renderFileIcon(selectedFile.type)}
              </div>
              
              <h4 className="text-xl font-medium text-center mb-6">{selectedFile.name}</h4>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Type</span>
                  <span className="text-sm font-medium">{selectedFile.type}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Category</span>
                  <span className="text-sm font-medium capitalize">{selectedFile.category}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Size</span>
                  <span className="text-sm font-medium">{selectedFile.size}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Created</span>
                  <span className="text-sm font-medium">{selectedFile.date}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Modified</span>
                  <span className="text-sm font-medium">{selectedFile.modified}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">ID</span>
                  <span className="text-sm font-medium">{selectedFile.id}</span>
                </div>
                
                {/* Tags Section */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Tags</span>
                    <button className="text-xs text-blue-600 hover:text-blue-800">
                      Add Tag
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {selectedFile.tags.map(tag => (
                      <div key={tag} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                        <span className="text-xs text-gray-800">{tag}</span>
                        <button 
                          className="ml-1 text-gray-400 hover:text-gray-600"
                          onClick={() => removeTagFromFile(selectedFile.id, tag)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    
                    {selectedFile.tags.length === 0 && (
                      <span className="text-xs text-gray-400">No tags</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-8 space-y-4">
                <button className="w-full py-2 bg-blue-600 text-white rounded-md flex items-center justify-center hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </button>
                <button className="w-full py-2 bg-gray-100 text-gray-800 rounded-md flex items-center justify-center hover:bg-gray-200">
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </button>
                <button 
                  className="w-full py-2 bg-red-50 text-red-600 rounded-md flex items-center justify-center hover:bg-red-100"
                  onClick={() => {
                    deleteFile(selectedFile.id);
                    setSelectedFile(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 h-full flex flex-col items-center justify-center text-center">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">No file selected</h3>
              <p className="text-sm text-gray-500">
                Select a file to view its details and options
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileManagementPage;
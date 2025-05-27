import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, Check, Download, Edit, Eye, FileText, Filter, Folder, Grid, List, 
         MoreHorizontal, Plus, Search, Trash2, Upload, X, Pencil } from 'lucide-react';
import { Link } from "react-router-dom";
import api from '../api/AxiosInstance';


// File card component to reduce repetition
const FileCard = ({ file, isSelected, onSelect, onView, onFavorite, onDelete }) => {
  const renderFileIcon = () => {
    switch (file.filetype) {
      case 'folder': return <Folder className="w-10 h-10 text-blue-500" />;
      case 'dicom': return <FileText className="w-10 h-10 text-green-500" />;
      default: return <FileText className="w-10 h-10 text-blue-500" />;
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer relative 
                  ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
      onClick={() => onView(file)}>
      {/* Selection checkbox */}
      <div 
        className="absolute top-3 left-3 w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center bg-white z-10"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(file.projectId);
        }}
      >
        {isSelected && (
          <Check className="w-3 h-3 text-blue-600" />
        )}
      </div>
      
      {/* Favorite toggle */}
      <button 
        className={`absolute top-3 right-3 ${file.favorite ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500 z-10`}
        onClick={(e) => {
          e.stopPropagation();
          onFavorite(file.projectId);
        }}
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </button>
      
      <div className="p-6 flex flex-col items-center">
        {renderFileIcon()}
        <p className="text-sm font-medium text-center text-gray-800 mt-4 truncate w-full">{file.name}</p>
        <p className="text-xs text-center text-gray-500 mt-1">{file.filesize}</p>
        
        {/* Tags */}
        {/* {file.tags.length > 0 && ( */}
          {/* // <div className="flex flex-wrap justify-center mt-3 gap-1"> */}
            {/* {file.tags.slice(0, 2).map(tag => ( */}
              {/* // <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"> */}
                {/* {tag} */}
              {/* </span> */}
            {/* // ))} */}
            {/* {file.tags.length > 2 && ( */}
              {/* // <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"> */}
                {/* +{file.tags.length - 2} */}
              {/* </span> */}
            {/* // )} */}
          {/* </div> */}
        {/* // )} */}
        
        <div className="flex justify-center mt-4 space-x-2 text-gray-400">
          <button className="hover:text-gray-700 p-1" onClick={(e) => { e.stopPropagation(); onView(file); }}>
            {/* <Eye className="h-4 w-4" /> */}
            <Pencil className="h-4 w-4" />
          </button>
          <button className="hover:text-blue-600 p-1">
            <Download className="h-4 w-4" />
          </button>
          <button className="hover:text-red-600 p-1" onClick={(e) => { e.stopPropagation(); onDelete(file.projectId); }}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// File detail sidebar component
const FileDetailsSidebar = ({ file, onClose, onDelete, onFavorite, onRemoveTag }) => {
  if (!file) return (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 h-full flex flex-col items-center justify-center text-center">
      <FileText className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-800 mb-2">No file selected</h3>
      <p className="text-sm text-gray-500">Select a file to view its details</p>
    </div>
  );

  const renderFileIcon = () => {
    switch (file.filetype) {
      case 'folder': return <Folder className="w-12 h-12 text-blue-500" />;
      case 'dicom': return <FileText className="w-12 h-12 text-green-500" />;
      default: return <FileText className="w-12 h-12 text-blue-500" />;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-800">File Details</h3>
        <button className="text-gray-400 hover:text-gray-600" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="flex justify-center mb-6">
        {renderFileIcon()}
      </div>
      
      <h4 className="text-xl font-medium text-center mb-6">{file.name}</h4>
      
      {/* { label: "Category", value: file.category, capitalize: true }, */}
      {/* right side preview */}
      <div className="space-y-4">
        {[
          // { label: "Type", value: file.filetype },
          { label: "ID", value: file.projectId },
          { label: "Size", value: file.filesize },
          { label: "Created", value: file.createdAt },
          { label: "Modified", value: file.updatedAt },
          
        ].map((item) => (
          <div key={item.label} className="flex justify-between items-center pb-3 border-b border-gray-100">
            <span className="text-sm text-gray-500">{item.label}</span>
            <span className={`text-sm font-medium ${item.capitalize ? 'capitalize' : ''}`}>{item.value}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-8 space-y-3">
        {/* <button className="w-full py-2 bg-gray-100 text-gray-800 rounded-md flex items-center justify-center hover:bg-gray-200 transition-colors"> */}
          {/* <Eye className="h-4 w-4 mr-2" /> */}
          {/* Preview */}
        {/* </button> */}
        <button className="w-full py-2 bg-[#5B7B9A] text-white rounded-md flex items-center justify-center hover:bg-[#4A6A89] 
        transition-colors">
          <Download className="h-4 w-4 mr-2" />
          Download
        </button>
        <button className="w-full py-2 bg-gray-100 text-gray-800 rounded-md flex items-center justify-center hover:bg-gray-200 
        transition-colors">
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </button>
        <button 
          className="w-full py-2 bg-red-50 text-red-600 rounded-md flex items-center justify-center hover:bg-red-100 transition-colors"
          onClick={() => onDelete(file.projectId)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </button>
      </div>
    </div>
  );
};

// Toast notification component
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 bg-gray-800 text-white px-4 py-3 rounded-md shadow-lg flex items-center z-50 animate-fade-in">
      <Check className="w-5 h-5 mr-2 text-green-400" />
      <span>{message}</span>
    </div>
  );
};

// Main file management component
const FileManagementPage = () => {
  // State hooks
  const [viewMode, setViewMode] = useState('grid');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState({ category: 'all', tags: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  
  // api for fetch own projects
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await api.get('/project/get-projects-list');
        const projects = response.data.projects || [];

        const formattedProjects = projects.map(p => ({
          projectId: p.projectId,
          name: p.name,
          filesize: p.filesize,
          createdAt: p.createdAt?.slice(0, 10),
          updatedAt: p.updatedAt?.slice(0, 10),
        }));

        setFiles(formattedProjects);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    };

    fetchFiles();
  }, []);
  
  
  const fileInputRef = useRef(null);
  
  // const availableTags = ['important', 'critical', 'research', 'archived', 'follow-up'];
  const categories = ['all', 'scan', 'dicom', 'ct', 'mri'];
  
  // File operations
  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };
  
  const viewFileDetails = (file) => {
    setSelectedFile(file);
  };
  
  const toggleFavorite = (fileId) => {
    setFiles(files.map(file => 
      file.projectId === fileId ? { ...file, favorite: !file.favorite } : file
    ));
    
    const file = files.find(f => f.id === fileId);
    showToast(`${file.name} ${file.favorite ? 'removed from' : 'added to'} favorites`);
  };
  
  // const deleteFile = (fileId) => {
    // setFiles(files.filter(file => file.projectId !== fileId));
    // setSelectedFiles(selectedFiles.filter(id => id !== fileId));
    // 
    // if (selectedFile && selectedfile.projectId === fileId) {
      // setSelectedFile(null);
    // }
    // 
    // showToast('File deleted successfully');
  // };
  const deleteFile = async (fileId) => {
    try {
      const response = await api.delete(`/project/user-delete-project/${fileId}`);
    
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete project');
      }
    
      // Update UI state
      setFiles(files.filter(file => file.projectId !== fileId));
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
      if (selectedFile && selectedFile.projectId === fileId) {
        setSelectedFile(null);
      }
    
      showToast('File deleted successfully');
    } catch (error) {
      console.error('Error deleting file:', error);
      showToast(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  
  const deleteSelectedFiles = () => {
    setFiles(files.filter(file => !selectedFiles.includes(file.projectId)));
    showToast(`${selectedFiles.length} file(s) deleted successfully`);
    setSelectedFiles([]);
  };
  
  const removeTagFromFile = (fileId, tag) => {
    setFiles(files.map(file => {
      if (file.projectId === fileId) {
        return { ...file, tags: file.tags.filter(t => t !== tag) };
      }
      return file;
    }));
    
    showToast('Tag removed successfully');
  };
  
  // Filter operations
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleFilterChange = (filterType, value) => {
    setActiveFilters({
      ...activeFilters,
      [filterType]: value
    });
  };
  
  const toggleTagFilter = (tag) => {
    setActiveFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const processFiles = (files) => {
    return files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: getFileType(file.name),
      category: getFileCategory(file.name),
      size: typeof file.filesize === 'number' ? formatFileSize(file.filesize) : '0 B',
      date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      modified: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      // tags: [],
      favorite: false
    }));
  };

  
  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    const newFiles = processFiles(uploadedFiles);
    setFiles(prev => [...newFiles, ...prev]);
    showToast(`${uploadedFiles.length} file(s) uploaded successfully`);
  };
  
  // Drag and drop operations
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
    const newFiles = processFiles(droppedFiles);
    setFiles(prev => [...newFiles, ...prev]);
    showToast(`${droppedFiles.length} file(s) uploaded successfully`);
  };
  
  // Helper functions
  const showToast = (message) => {
    setToastMessage(message);
  };
  
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
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        setSelectedFiles(filteredFiles.map(file => file.projectId));
      }
      
      if (e.key === 'Delete' && selectedFiles.length > 0) {
        e.preventDefault();
        deleteSelectedFiles();
      }
      
      if (e.key === 'Escape') {
        setSelectedFiles([]);
        setSelectedFile(null);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedFiles, filteredFiles]);

  return (
    <div 
      className="min-h-screen bg-[#FFFCF6] text-gray-800 p-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-blue-500 bg-opacity-20 z-50 flex items-center justify-center border-4 border-dashed border-blue-500">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center">
            <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold">Drop files here to upload</h3>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
      
      {/* Header Section */}
      <div className="header-sect px-6 lg:px-12">
        <h1 className="text-3xl font-light text-[#3A4454] mb-6">File Management</h1>
        <p className="text-sm text-gray-500 mt-1">View, update and delete your files here</p>
      </div>

      {/* Search and Actions Bar */}
      <div className="px-6 lg:px-12 py-6 bg-[#FFFCF6] border-b border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="Search files..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            
            {/* <button  */}
              {/* // className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 flex items-center hover:bg-gray-50 transition-colors" */}
              {/* // onClick={() => setShowFilters(!showFilters)} */}
            {/* // > */}
              {/* <Filter className="w-4 h-4 mr-2" /> */}
              {/* Filter */}
              {/* {(activeFilters.category !== 'all' || activeFilters.tags.length > 0) && ( */}
                {/* // <span className="ml-1 bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs"> */}
                  {/* {activeFilters.tags.length + (activeFilters.category !== 'all' ? 1 : 0)} */}
                {/* </span> */}
              {/* // )} */}
            {/* </button> */}
            
            <Link to="/cardiac-analysis"
              className="px-4 py-2 bg-[#5B7B9A] text-white rounded-md flex items-center hover:bg-[#4A6A89] transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Link>
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
          <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Filters</h3>
              <button 
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => {
                  setActiveFilters({
                    category: 'all',
                    tags: []
                  });
                }}
              >
                Clear all
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              
              {/* <div> */}
                {/* <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label> */}
                {/* <div className="flex flex-wrap gap-2"> */}
                  {/* {availableTags.map(tag => ( */}
                    {/* // <button */}
                      {/* // key={tag} */}
                      {/* // className={`px-2 py-1 text-xs rounded-full ${ */}
                        {/* // activeFilters.tags.includes(tag)  */}
                          {/* // ? 'bg-blue-100 text-blue-800 border border-blue-300'  */}
                          {/* // : 'bg-gray-100 text-gray-800 border border-gray-300' */}
                      {/* // }`} */}
                      {/* // onClick={() => toggleTagFilter(tag)} */}
                    {/* // > */}
                      {/* {tag} */}
                    {/* </button> */}
                  {/* // ))} */}
                {/* </div> */}
              {/* </div> */}
            </div>
          </div>
        )}
        
        {/* Bulk Actions */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-800">
                {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
              </span>
              <button 
                className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                onClick={() => setSelectedFiles([])}
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-md hover:bg-blue-100 text-blue-700 transition-colors">
                <Download className="w-5 h-5" />
              </button>
              <button 
                className="p-2 rounded-md hover:bg-red-100 text-red-600 transition-colors"
                onClick={deleteSelectedFiles}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Main Content Area */}
      <div className="flex flex-1 px-6 lg:px-12 py-8">
        <div className="w-full lg:w-3/4 pr-0 lg:pr-8">
          {/* Recent Files Section */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">Recent Files</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentFiles.map((file) => (
                <FileCard 
                  key={file.projectId}
                  file={file}
                  isSelected={selectedFiles.includes(file.projectId)}
                  onSelect={toggleFileSelection}
                  onView={viewFileDetails}
                  onFavorite={toggleFavorite}
                  onDelete={deleteFile}
                />
              ))}
            </div>
          </div>
          
          {/* All Files Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">All Files</h3>
              
              {selectedFiles.length > 0 && (
                <button 
                  className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                  onClick={deleteSelectedFiles}
                >
                  Delete Selected
                </button>
              )}
            </div>
            
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFiles.map((file) => (
                  <FileCard 
                    key={file.projectId}
                    file={file}
                    isSelected={selectedFiles.includes(file.projectId)}
                    onSelect={toggleFileSelection}
                    onView={viewFileDetails}
                    onFavorite={toggleFavorite}
                    onDelete={deleteFile}
                  />
                ))}
          </div>
            )}
            
            {/* List View */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={selectedFiles.length > 0 && selectedFiles.length === filteredFiles.length}
                          onChange={() => {
                            if (selectedFiles.length === filteredFiles.length) {
                              setSelectedFiles([]);
                            } else {
                              setSelectedFiles(filteredFiles.map(file => file.projectId));
                            }
                          }}
                        />
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      {/* <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell"> */}
                        {/* Type */}
                      {/* </th> */}
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Size
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Created
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Modified
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredFiles.map((file) => (
                      <tr 
                        key={file.projectId} 
                        className={`hover:bg-gray-50 ${selectedFiles.includes(file.projectId) ? 'bg-blue-50' : ''}`}
                        onClick={() => viewFileDetails(file)}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={selectedFiles.includes(file.projectId)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleFileSelection(file.projectId);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{file.name}</div>
                              {/* <div className="flex space-x-1 mt-1"> */}
                                {/* {file.tags.slice(0, 2).map(tag => ( */}
                                  {/* // <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"> */}
                                    {/* {tag} */}
                                  {/* </span> */}
                                {/* // ))} */}
                                {/* {file.tags.length > 2 && ( */}
                                  {/* // <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"> */}
                                    {/* +{file.tags.length - 2} */}
                                  {/* </span> */}
                                {/* // )} */}
                              {/* </div> */}
                            </div>
                          </div>
                        </td>
                        {/* <td className="px-4 py-4 hidden sm:table-cell"> */}
                          {/* <span className="capitalize text-sm text-gray-700">{file.category}</span> */}
                        {/* </td> */}
                        <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell">
                          {file.filesize}
                          {/* formatFileSize(file.size) */}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell">
                          {file.createdAt}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell">
                          {file.updatedAt}
                        </td>
                        <td className="px-4 py-4 text-right text-sm">
                          <div className="flex justify-end space-x-3">
                            <button
                              className="text-gray-400 hover:text-gray-700"
                              onClick={(e) => { e.stopPropagation(); }}>
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              className="text-gray-400 hover:text-gray-700"
                              onClick={(e) => { e.stopPropagation(); }}>
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              className="text-gray-400 hover:text-red-500"
                              onClick={(e) => { 
                                e.stopPropagation();
                                deleteFile(file.projectId);
                              }}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredFiles.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center">
                          <div className="flex flex-col items-center">
                            <Search className="h-8 w-8 text-gray-300 mb-2" />
                            <h3 className="text-base font-medium text-gray-900 mb-1">No files found</h3>
                            <p className="text-sm text-gray-500">
                              {searchTerm ? `No results found for "${searchTerm}"` : 'Try uploading a file or changing your filters'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination (Optional) */}
            <div className="mt-6 flex justify-center">
              <nav className="inline-flex rounded-md shadow">
                <button className="px-3 py-1 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  Previous
                </button>
                <button className="px-3 py-1 border-t border-b border-gray-300 bg-white text-sm font-medium text-blue-600">
                  1
                </button>
                <button className="px-3 py-1 border-t border-b border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  2
                </button>
                <button className="px-3 py-1 border-t border-b border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  3
                </button>
                <button className="px-3 py-1 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
        
        {/* Right Sidebar */}
        <div className="hidden lg:block lg:w-1/4">
          <FileDetailsSidebar 
            file={selectedFile} 
            onClose={() => setSelectedFile(null)}
            onDelete={deleteFile}
            onFavorite={toggleFavorite}
            onRemoveTag={removeTagFromFile}
          />
        </div>
      </div>
    </div>
  );
}

export default FileManagementPage;
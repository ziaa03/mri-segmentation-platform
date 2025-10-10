import React, { useState, useEffect } from 'react';
import { 
  Heart, Brain, Activity, Folder, Plus, Search, Settings, User, Bell, 
  FileText, BarChart3, Upload, Archive, ChevronRight, ChevronLeft,
  Home, Database, Share2, Download, Calendar, Clock, Stethoscope,
  Monitor, Zap, Shield, Pencil
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/AxiosInstance'; // Adjust the import path as needed

const Sidebar = ({ processingComplete = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Get current active section based on the current route
  const getActiveSection = () => {
    const path = location.pathname;
    if (path === '/vis-hub') return 'upload';
    if (path === '/dashboard') return 'dashboard';
    if (path === '/files') return 'projects';
    if (path.includes('/cardiac-analysis')) return 'analytics';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/archive')) return 'archive';
    if (path.includes('/sharing')) return 'sharing';
    if (path.includes('/schedule')) return 'schedule';
    return 'dashboard';
  };

  const activeSection = getActiveSection();

  // Fetch projects from API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await api.get('/project/get-projects-list');
        const projects = response.data.projects || [];

        // Format projects for sidebar display
        const formattedProjects = projects.map(p => ({
          id: p.projectId,
          projectId: p.projectId,
          name: p.name,
          type: getProjectType(p.name), // Determine type from name
          date: p.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          status: 'active', // You might want to add status to your API response
          patient: `Project-${p.projectId.slice(-3)}`, // Generate patient ID from projectId
          filesize: p.filesize,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        }));

        setRecentProjects(formattedProjects.slice(0, 4)); // Show only recent 4
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        setRecentProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Helper function to determine project type from name
  const getProjectType = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('mri')) return 'MRI';
    if (lowerName.includes('ct')) return 'CT';
    if (lowerName.includes('echo')) return 'Echo';
    if (lowerName.includes('cardiac')) return 'MRI';
    return 'NIFTI';
  };

  const navigationItems = [
    { 
      id: 'upload', 
      label: 'New Upload', 
      icon: Upload, 
      section: 'main',
      route: '/vis-hub'
    },
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: Home, 
      section: 'main',
      route: '/dashboard'
    },
    { 
      id: 'projects', 
      label: 'Active Projects', 
      icon: Folder, 
      section: 'main', 
      badge: recentProjects.filter(p => p.status === 'active').length,
      route: '/files'
    },
    { 
      id: 'analytics', 
      label: 'Clinical Analytics', 
      icon: BarChart3, 
      section: 'main',
      route: '/vis-hub' 
    },
    { 
      id: 'reports', 
      label: 'Medical Reports', 
      icon: FileText, 
      section: 'main',
      route: '/files' // For now, redirect to files page
    },
    { 
      id: 'archive', 
      label: 'Patient Archive', 
      icon: Archive, 
      section: 'secondary',
      route: '/files' // For now, redirect to files page
    },
    { 
      id: 'sharing', 
      label: 'Secure Sharing', 
      icon: Share2, 
      section: 'secondary',
      route: '/files' // For now, redirect to files page
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'completed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'processing': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'MRI': return Brain;
      case 'CT': return Activity;
      case 'Echo': return Heart;
      default: return Monitor;
    }
  };

  return (
  <div className="bg-white border-b border-gray-200 shadow-sm">
    <div className="px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Main Navigation */}
        <nav className="flex items-center space-x-1">
          {navigationItems.filter(item => item.section === 'main').map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Link
                key={item.id}
                to={item.route}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#5B7B9A] to-[#3A4454] text-white shadow-md' 
                    : 'text-[#3A4454] hover:bg-[#F8F2E6] hover:text-[#5B7B9A]'
                }`}
              >
                <IconComponent size={16} />
                <span className="font-medium text-sm">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-[#FDBA74] text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Secondary Navigation */}
        <nav className="flex items-center space-x-1">
          {navigationItems.filter(item => item.section === 'secondary').map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Link
                key={item.id}
                to={item.route}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-[#F8F2E6] text-[#5B7B9A] border border-[#FDBA74]/30' 
                    : 'text-[#3A4454]/70 hover:bg-[#F8F2E6]/50 hover:text-[#5B7B9A]'
                }`}
              >
                <IconComponent size={16} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  </div>
);
};

export default Sidebar;
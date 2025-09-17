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
    return 'DICOM';
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
      route: '/vis-hub' // You might want to create a dedicated analytics page
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
    // { 
    //   id: 'schedule', 
    //   label: 'Appointments', 
    //   icon: Calendar, 
    //   section: 'secondary',
    //   route: '/files' // For now, redirect to files page
    // },
  ];

  const userActions = [
    { id: 'profile', label: 'Dr. Profile', icon: User, route: '/user-settings' },
    { id: 'notifications', label: 'Alerts', icon: Bell, badge: 2, route: '/dashboard' },
    { id: 'settings', label: 'Preferences', icon: Settings, route: '/user-settings' }
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
    <div className={`bg-white shadow-xl border-r border-gray-200 transition-all duration-300 flex flex-col relative ${
      isExpanded ? 'w-80' : 'w-20'
    }`}>
      {/* Toggle Button - Positioned in middle vertically */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1/2 z-10 p-2 bg-white border border-gray-200 hover:border-[#5B7B9A] hover:bg-[#5B7B9A]/5 rounded-full shadow-md transition-all duration-200"
      >
        {isExpanded ? <ChevronLeft size={16} className="text-[#5B7B9A]" /> : <ChevronRight size={16} className="text-[#5B7B9A]" />}
      </button>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* Main Navigation */}
        <div className="p-4">
          {isExpanded && (
            <h3 className="text-xs font-semibold text-[#3A4454] uppercase tracking-wider mb-3 flex items-center">
              <Monitor className="w-3 h-3 mr-2" />
              Clinical Navigation
            </h3>
          )}
          <nav className="space-y-1">
            {navigationItems.filter(item => item.section === 'main').map((item) => {
              const IconComponent = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <Link
                  key={item.id}
                  to={item.route}
                  title={!isExpanded ? item.label : ''}
                  className={`w-full flex items-center ${isExpanded ? 'gap-3' : 'justify-center'} p-3 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? 'bg-gradient-to-r from-[#5B7B9A] to-[#3A4454] text-white shadow-lg transform scale-[1.02]' 
                      : 'text-[#3A4454] hover:bg-[#F8F2E6] hover:text-[#5B7B9A] hover:shadow-md'
                  }`}
                >
                  <IconComponent size={18} className="flex-shrink-0" />
                  {isExpanded && (
                    <>
                      <span className="font-medium text-sm flex-1 text-left">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          isActive 
                            ? 'bg-white/20 text-white' 
                            : 'bg-[#FDBA74] text-white shadow-sm'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Recent Projects Section */}
        {isExpanded && activeSection === 'projects' && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[#3A4454] uppercase tracking-wider flex items-center">
                <Folder className="w-3 h-3 mr-2" />
                Recent Studies
              </h3>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-emerald-600 font-medium">Live</span>
              </div>
            </div>
            
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="p-3 border border-gray-200 rounded-xl animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Folder className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No projects found</p>
                <Link 
                  to="/vis-hub"
                  className="text-xs text-[#5B7B9A] hover:underline mt-1 inline-block"
                >
                  Create your first project
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentProjects.map((project) => {
                  const TypeIcon = getTypeIcon(project.type);
                  return (
                    <div
                      key={project.projectId}
                      className="p-3 border border-gray-200 rounded-xl hover:border-[#FDBA74] hover:shadow-md transition-all duration-200 cursor-pointer group bg-white hover:bg-gradient-to-r hover:from-white hover:to-[#F8F2E6]/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-[#F8F2E6] rounded-lg group-hover:bg-gradient-to-br group-hover:from-[#FDBA74]/20 group-hover:to-[#5B7B9A]/10 transition-all duration-200">
                          <TypeIcon size={14} className="text-[#5B7B9A]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[#3A4454] text-sm truncate mb-1">{project.name}</h4>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">{project.type}</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(project.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">{project.patient}</span>
                            <div className="flex items-center gap-1">
                              <span className={`inline-block px-2 py-1 text-xs rounded-full border font-medium ${getStatusColor(project.status)}`}>
                                {project.status}
                              </span>
                              <Link 
                                to={`/vis-hub?projectId=${project.projectId}`}
                                className="p-1 text-gray-400 hover:text-[#5B7B9A] transition-colors"
                                title="Edit Project"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Pencil size={12} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Secondary Navigation */}
        <div className="px-4 pb-4 border-t border-gray-100">
          {isExpanded && (
            <h3 className="text-xs font-semibold text-[#3A4454] uppercase tracking-wider mb-3 mt-4 flex items-center">
              <Shield className="w-3 h-3 mr-2" />
              Clinical Tools
            </h3>
          )}
          <nav className="space-y-1">
            {navigationItems.filter(item => item.section === 'secondary').map((item) => {
              const IconComponent = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <Link
                  key={item.id}
                  to={item.route}
                  className={`w-full flex items-center ${isExpanded ? 'gap-3' : 'justify-center'} p-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-[#F8F2E6] text-[#5B7B9A] border border-[#FDBA74]/30 shadow-sm' 
                      : 'text-[#3A4454]/70 hover:bg-[#F8F2E6]/50 hover:text-[#5B7B9A]'
                  }`}
                >
                  <IconComponent size={16} className="flex-shrink-0" />
                  {isExpanded && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Actions Section
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100 mt-auto">
            <h3 className="text-xs font-semibold text-[#3A4454] uppercase tracking-wider mb-3 mt-4 flex items-center">
              <User className="w-3 h-3 mr-2" />
              Account
            </h3>
            <nav className="space-y-1">
              {userActions.map((action) => {
                const IconComponent = action.icon;
                
                return (
                  <Link
                    key={action.id}
                    to={action.route}
                    className={`w-full flex items-center ${isExpanded ? 'gap-3' : 'justify-center'} p-3 rounded-xl transition-all duration-200 text-[#3A4454]/70 hover:bg-[#F8F2E6]/50 hover:text-[#5B7B9A]`}
                  >
                    <IconComponent size={16} className="flex-shrink-0" />
                    {isExpanded && (
                      <>
                        <span className="text-sm font-medium flex-1 text-left">{action.label}</span>
                        {action.badge && action.badge > 0 && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                            {action.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default Sidebar;
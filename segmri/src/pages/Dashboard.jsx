import React, { useState, useEffect } from 'react';
import { 
  Heart, Brain, Activity, Folder, Plus, Search, FileText, BarChart3, 
  Upload, Calendar, Clock, Users, TrendingUp, AlertCircle,
  Download, Edit, Eye, Pencil, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/AxiosInstance'; // Adjust the import path as needed

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalSize: '0 MB'
  });

  // Fetch projects for dashboard
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/project/get-projects-list');
        const projectsData = response.data.projects || [];

        // Format projects for dashboard
        const formattedProjects = projectsData.map(p => ({
          id: p.projectId,
          projectId: p.projectId,
          name: p.name,
          type: getProjectType(p.name),
          date: p.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          status: 'active', // You might want to add status to your API
          filesize: p.filesize,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        }));

        setProjects(formattedProjects);

        // Calculate stats
        const totalSize = projectsData.reduce((acc, p) => {
          const size = parseFloat(p.filesize) || 0;
          return acc + size;
        }, 0);

        setStats({
          totalProjects: projectsData.length,
          activeProjects: formattedProjects.filter(p => p.status === 'active').length,
          completedProjects: formattedProjects.filter(p => p.status === 'completed').length,
          totalSize: formatFileSize(totalSize)
        });

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Helper functions
  const getProjectType = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('mri')) return 'MRI';
    if (lowerName.includes('ct')) return 'CT';
    if (lowerName.includes('echo')) return 'Echo';
    if (lowerName.includes('cardiac')) return 'MRI';
    return 'NIFTI';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'MRI': return Brain;
      case 'CT': return Activity;
      case 'Echo': return Heart;
      default: return FileText;
    }
  };

  const recentProjects = projects.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#FFFCF6] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-light text-[#3A4454] mb-2">Medical Dashboard</h1>
        <p className="text-gray-600">Overview of your cardiac analysis projects and system activity</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Projects</p>
              <p className="text-2xl font-semibold text-[#3A4454]">{loading ? '...' : stats.totalProjects}</p>
            </div>
            <div className="p-3 bg-[#F8F2E6] rounded-lg">
              <Folder className="w-6 h-6 text-[#5B7B9A]" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Active Studies</p>
              <p className="text-2xl font-semibold text-emerald-600">{loading ? '...' : stats.activeProjects}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Completed</p>
              <p className="text-2xl font-semibold text-blue-600">{loading ? '...' : stats.completedProjects}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Storage</p>
              <p className="text-2xl font-semibold text-[#FDBA74]">{loading ? '...' : stats.totalSize}</p>
            </div>
            <div className="p-3 bg-[#FDBA74]/10 rounded-lg">
              <FileText className="w-6 h-6 text-[#FDBA74]" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#3A4454]">Recent Projects</h2>
              <Link 
                to="/files" 
                className="text-sm text-[#5B7B9A] hover:underline flex items-center gap-1"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="flex items-center p-4 border border-gray-200 rounded-lg animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg mr-4"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                    <div className="w-20 h-6 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-500 mb-4">Get started by uploading your first medical file</p>
                <Link 
                  to="/vis-hub"
                  className="inline-flex items-center px-4 py-2 bg-[#5B7B9A] text-white rounded-md hover:bg-[#4A6A89] transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => {
                  const TypeIcon = getTypeIcon(project.type);
                  return (
                    <div 
                      key={project.projectId} 
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-[#FDBA74] hover:bg-[#F8F2E6]/30 transition-all duration-200 cursor-pointer group"
                    >
                      <div className="p-2 bg-[#F8F2E6] rounded-lg mr-4 group-hover:bg-[#FDBA74]/20">
                        <TypeIcon size={20} className="text-[#5B7B9A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-[#3A4454] truncate">{project.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{project.type}</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(project.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                          {project.status}
                        </span>
                        <Link 
                          to={`/vis-hub?projectId=${project.projectId}`}
                          className="p-2 text-gray-400 hover:text-[#5B7B9A] transition-colors"
                          title="Edit Project"
                        >
                          <Pencil size={16} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & System Status */}
        <div className="space-y-6">
          {/* System Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-[#3A4454] mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">System Health</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span className="text-sm font-medium text-emerald-600">Operational</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Processing Queue</span>
                <span className="text-sm font-medium text-[#3A4454]">0 pending</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Backup</span>
                <span className="text-sm font-medium text-[#3A4454]">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-[#3A4454] mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-200 rounded mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center">
                      <Plus size={14} className="text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#3A4454]">System initialized</p>
                      <p className="text-xs text-gray-500">Ready for file uploads</p>
                    </div>
                  </div>
                  {projects.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                        <FileText size={14} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[#3A4454]">Latest project created</p>
                        <p className="text-xs text-gray-500">{projects[0]?.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
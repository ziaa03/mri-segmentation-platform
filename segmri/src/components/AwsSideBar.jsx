import React, { useState } from 'react';

const AwsSideBar = ({ activeSection, onSectionChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      id: 's3',
      label: 'S3 Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      subItems: [
        { id: 's3-storage', label: 'Storage Metrics' },
        { id: 's3-requests', label: 'Request Analytics' },
      ]
    },
    {
      id: 'ec2',
      label: 'EC2 Instances',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      ),
      subItems: [
        { id: 'cpu-utilization', label: 'CPU Utilization' },
        { id: 'memory-usage', label: 'Memory Usage' },
      ]
    },
    {
      id: 'load-balancer',
      label: 'Load Balancer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      subItems: [
        { id: 'lb-requests', label: 'Request Count' },
        { id: 'lb-health', label: 'Target Health' }
      ]
    },
  ];

  return (
    <div className={`bg-gray-900 text-white h-screen flex flex-col transition-all sticky left-0 top-0 duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold">AWS Analytics</h1>
              <p className="text-xs text-gray-400">Admin Dashboard</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation with custom scrollbar */}
      <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              {item.subItems ? (
                <div>
                  {/* Header - Static, non-clickable */}
                  <div className={`flex items-center space-x-3 p-3 rounded-lg ${
                    activeSection?.startsWith(item.id) ? 'bg-gray-800 border-l-4 border-orange-500' : ''
                  }`}>
                    {item.icon}
                    {!isCollapsed && (
                      <span className="font-medium">{item.label}</span>
                    )}
                  </div>
                  
                  {/* Submenu - Always visible when not collapsed */}
                  {!isCollapsed && (
                    <ul className="ml-8 mt-1 space-y-1">
                      {item.subItems.map((subItem) => (
                        <li key={subItem.id}>
                          <button
                            onClick={() => onSectionChange(subItem.id)}
                            className={`w-full text-left p-2 rounded-lg hover:bg-gray-800 transition-colors text-sm ${
                              activeSection === subItem.id 
                                ? 'bg-gray-800 text-orange-400 font-medium' 
                                : 'text-gray-300'
                            }`}
                          >
                            {subItem.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => onSectionChange(item.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors ${
                    activeSection === item.id ? 'bg-gray-800 border-l-4 border-orange-500' : ''
                  }`}
                >
                  {item.icon}
                  {!isCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default AwsSideBar;
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaAws } from "react-icons/fa";
import { SiAmazonec2 } from "react-icons/si";
import { SiAmazons3 } from "react-icons/si";
import { RiMoneyCnyCircleLine } from "react-icons/ri";
import { SiAwselasticloadbalancing } from "react-icons/si";
// import { TbCloudLock } from "react-icons/tb";
import { PiArrowsInCardinal } from "react-icons/pi";

const AwsSideBar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      id: 'cpu',
      label: 'CPU Utilization',
      path: '/aws-cpu', // route to navigate
      icon: (
        <SiAmazonec2 className="w-6 h-6" />
      )
    },
    {
      id: 's3',
      label: 'S3 Analytics',
      path: '/aws-s3',
      icon: (
        <SiAmazons3 className="w-6 h-6" />
      )
    },
    {
      id: 'ecr',
      label: 'ECR',
      path: '/aws-ecr',
      icon: (
        <img src="ECR.png" alt="ECR" className="w-10 h-10 -ml-1.5" />
      )
    },
    {
      id: 'elb',
      label: 'Load Balancer',
      path: '/aws-alb',
      icon: (
        <SiAwselasticloadbalancing className="w-6 h-6" />
      )
    },
    {
      id: 'asg',
      label: 'Auto Scaling Group',
      path: '/aws-asg',
      icon: (
        <PiArrowsInCardinal className="w-6 h-6" />
      )
    },
    {
      id: 'cost',
      label: 'Cost',
      path: '/aws-bill',
      icon: (
        <RiMoneyCnyCircleLine className="w-6 h-6" />
      )
    },
    {
      // check the fetch info are the same with cpu utilization
      id: 'cpu-testFetch',
      label: 'CPU Fetch',
      path: '/cpu-testing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 
    0l4 4m-4-4l4-4" />
        </svg>
      )
    },
    {
      id: 'testing',
      label: 'Testing',
      path: '/aws-testing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    },
  ];

  return (
    <div className={`bg-gray-900 text-white h-screen flex flex-col transition-all sticky left-0 top-0 duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <FaAws className="w-6 h-6 text-white" />
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <li key={item.id}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-800 transition-colors ${
                    isActive ? 'bg-gray-800 border-l-4 border-orange-500' : ''
                  }`}
                >
                  {item.icon}
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                </button>
              </li>
            );
          })}
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
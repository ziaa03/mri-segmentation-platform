import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChevronDown, Menu, X, User, LogOut, Settings } from 'lucide-react';

const Header = () => {
  const { currentUser, userRole, logout, isAuthenticated, isAdmin, isUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showFilesDropdown, setShowFilesDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const filesDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowUserDropdown(false);
  };

  const toggleFilesDropdown = () => {
    setShowFilesDropdown(prev => !prev);
  };

  const toggleUserDropdown = () => {
    setShowUserDropdown(prev => !prev);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filesDropdownRef.current && !filesDropdownRef.current.contains(event.target)) {
        setShowFilesDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper function to check if link is active
  const isActiveLink = (path) => location.pathname === path;

  const navLinks = [
    { path: '/landing', label: 'OVERVIEW' },
    { path: '/features', label: 'THE EXPERIENCE' },
    { path: '/vis-hub', label: 'VISHEART HUB', badge: 'DEMO' },
    { path: '/team', label: 'ABOUT US' },
    { path: '/3d-viewer', label: '3D MODEL VIEWER' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white backdrop-blur-sm border-b border-[#74342B]/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/landing" className="group">
              <h1 className="text-2xl font-bold tracking-tight transition-all duration-200 group-hover:scale-105">
                <span className="text-[#74342B] bg-gradient-to-r from-[#74342B] to-[#8B4D42] bg-clip-text text-transparent">
                  Vis
                </span>
                <span className="text-[#343231]">Heart</span>
              </h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <div key={link.path} className="relative">
                <Link
                  to={link.path}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-[#74342B]/5 ${
                    isActiveLink(link.path)
                      ? 'text-[#74342B] bg-[#74342B]/5'
                      : 'text-[#343231] hover:text-[#74342B]'
                  }`}
                >
                  {link.label}
                  {link.badge && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full animate-pulse">
                      {link.badge}
                    </span>
                  )}
                  {isActiveLink(link.path) && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-[#74342B] rounded-full" />
                  )}
                </Link>
              </div>
            ))}

            {/* Users Link for Admin - Only keep essential admin-only features */}
            {isAuthenticated && isAdmin && (
              <Link
                to="/user-management"
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-[#74342B]/5 ${
                  isActiveLink('/user-management')
                    ? 'text-[#74342B] bg-[#74342B]/5'
                    : 'text-[#343231] hover:text-[#74342B]'
                }`}
              >
                USERS
                {isActiveLink('/user-management') && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-[#74342B] rounded-full" />
                )}
              </Link>
            )}
          </nav>

          {/* User Menu / Login - Simplified */}
          <div className="hidden lg:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/user-settings"
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-[#343231] hover:bg-[#74342B]/5 hover:text-[#74342B] transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-[#74342B] to-[#8B4D42] rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold">{currentUser?.username || userRole}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-[#74342B] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#5D2B22] transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
              >
                LOGIN
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#343231] hover:bg-[#74342B]/5 hover:text-[#74342B] transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-[#74342B]/10 animate-in slide-in-from-top-5 duration-200">
            <nav className="space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActiveLink(link.path)
                      ? 'text-[#74342B] bg-[#74342B]/5'
                      : 'text-[#343231] hover:bg-[#74342B]/5 hover:text-[#74342B]'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="px-2 py-1 text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full">
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}

              {/* Only show admin-only items */}
              {isAuthenticated && isAdmin && (
                <Link
                  to="/user-management"
                  className="block px-4 py-3 rounded-lg text-sm font-medium text-[#343231] hover:bg-[#74342B]/5 hover:text-[#74342B] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  USERS
                </Link>
              )}

              {isAuthenticated && (
                <>
                  <hr className="my-2 border-[#74342B]/10" />
                  
                  <Link
                    to="/user-settings"
                    className="flex items-center px-4 py-3 rounded-lg text-sm font-medium text-[#343231] hover:bg-[#74342B]/5 hover:text-[#74342B] transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </>
              )}

              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="block w-full text-center bg-[#74342B] text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-[#5D2B22] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  LOGIN
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
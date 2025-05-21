import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const { currentUser, userRole, logout, isAuthenticated, isAdmin, isUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="py-4 px-8 bg-[#FFFCF6] text-[#343231] shadow-sm">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {/* Logo */}
            <Link to="/">
              <h1 className="text-2xl font-semibold mr-4 transition-colors">
                <span className="text-[#74342B]">Vis</span>Heart
              </h1>
            </Link>
          </div>

          <nav className="hidden md:block">
            <ul className="flex space-x-8 text-sm font-medium">
              {/* Common menu items for all users */}
              <li>
                <Link to="/" className="text-[#343231] hover:text-[#74342B] transition-colors">
                  HOME
                </Link>
              </li>
              <li>
                <Link to="/about-us" className="text-[#343231] hover:text-[#74342B] transition-colors">
                  ABOUT US
                </Link>
              </li>
              <li>
                <Link to="/cardiac-analysis" className="text-[#343231] hover:text-[#74342B] transition-colors">
                  CARDIAC ANALYSIS
                </Link>
              </li>

              {/* Authenticated user menu items */}
              {isAuthenticated && (
                <>
                  {/* User and Admin only menu items */}
                  {(isUser || isAdmin) && (
                    <li>
                      <Link to="/files" className="text-[#343231] hover:text-[#74342B] transition-colors">
                        FILES
                      </Link>
                    </li>
                  )}
                  
                  {/* Admin only menu items */}
                  {isAdmin && (
                    <li>
                      <Link to="/user-management" className="text-[#343231] hover:text-[#74342B] transition-colors">
                        USERS
                      </Link>
                    </li>
                  )}
                </>
              )}

              {/* Login/Logout */}
              <li>
                {isAuthenticated ? (
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={handleLogout}
                      className="text-[#343231] hover:text-[#74342B] transition-colors"
                    >
                      LOGOUT
                    </button>
                    <Link to="/user-settings" className="text-[#343231] hover:text-[#74342B] transition-colors">
                    <span className="text-[#74342B] font-semibold">
                      {currentUser?.username || userRole}
                    </span>
                    </Link>
                  </div>
                ) : (
                  <Link to="/login" className="text-[#343231] hover:text-[#74342B] transition-colors">
                    LOGIN
                  </Link>
                )}
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
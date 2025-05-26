import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Header = () => {
  const { currentUser, userRole, logout, isAuthenticated, isAdmin, isUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

   const [showFilesDropdown, setShowFilesDropdown] = useState(false);
   const dropdownRef = useRef(null);
   
   const toggleFilesDropdown = () => {
     setShowFilesDropdown(prev => !prev);
   };

   useEffect(() => {
     const handleClickOutside = (event) => {
       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
         setShowFilesDropdown(false);
       }
     };
   
     document.addEventListener("mousedown", handleClickOutside);
   
     return () => {
       document.removeEventListener("mousedown", handleClickOutside);
     };
   }, []);   

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
                <Link to="/landing" className="text-[#343231] hover:text-[#74342B] transition-colors">
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
                  {/* User only menu items */}
                  { isUser && (
                    <li>
                      <Link to="/files" className="text-[#343231] hover:text-[#74342B] transition-colors">
                        FILES
                      </Link>
                    </li>
                  )}
                  
                  {/* Admin only menu items */}
                  {isAdmin && (
                  <li className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowFilesDropdown((prev) => !prev)}
                      className="text-[#343231] hover:text-[#74342B] transition-colors focus:outline-none"
                    >
                      FILES
                    </button>
                                  
                    {showFilesDropdown && (
                      <ul className="absolute left-1/2 transform -translate-x-1/2 bg-white border rounded-md shadow-md mt-2 w-[90px] z-10">
                        <li>
                          <Link
                            to="/files"
                            className="block px-4 py-2 text-sm text-[#343231] hover:bg-gray-100 text-center"
                            onClick={() => setShowFilesDropdown(false)}
                          >
                            Own Files
                          </Link>
                        </li>
                        <li>
                          <Link
                            to="/all-files"
                            className="block px-4 py-2 text-sm text-[#343231] hover:bg-gray-100 text-center"
                            onClick={() => setShowFilesDropdown(false)}
                          >
                            All Files
                          </Link>
                        </li>
                      </ul>
                    )}
                  </li>
                )}


                   {/* Admin only menu item: USERS */}
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
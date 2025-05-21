import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Component to handle route authorization based on user role
const ProtectedRoute = ({ 
  allowedRoles = [], // Array of allowed roles for this route
  redirectPath = '/login-choice', // Redirect to login choice rather than login directly
  children 
}) => {
  const { isAuthenticated, currentUser, userRole, loading } = useAuth();
  
  useEffect(() => {
    console.log('Protected Route State:', { 
      isAuthenticated, 
      currentUser, 
      userRole,
      loading 
    });
  }, [isAuthenticated, currentUser, userRole, loading]);

  // If authentication is still checking, show a loader
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#741E20]"></div>
      </div>
    );
  }
  
  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to', redirectPath);
    return <Navigate to={redirectPath} replace />;
  }
  
  // If allowedRoles is empty, any authenticated user can access
  if (allowedRoles.length === 0) {
    console.log('No role restrictions, allowing access');
    return children ? children : <Outlet />;
  }
  
  // If user role is in the allowed roles, allow access
  if (allowedRoles.includes(userRole)) {
    console.log('User role is allowed, granting access');
    return children ? children : <Outlet />;
  }
  
  // If none of the above, redirect to unauthorized or home
  console.log('User role not allowed, redirecting to home');
  return <Navigate to="/" replace />;
};

export default ProtectedRoute;
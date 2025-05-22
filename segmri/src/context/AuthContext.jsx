import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api/AxiosInstance';

// Create authentication context
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('guest');
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on component mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Make a single call to fetch user data - this will fail if not authenticated
        const userDataResponse = await api.get('/auth/fetch');
        
        if (userDataResponse.data && userDataResponse.data.fetch && userDataResponse.data.user) {
          const userData = userDataResponse.data.user;
          setCurrentUser({
            username: userData.username,
            email: userData.email,
            phone: userData.phone,
            role: userData.role
          });
          setUserRole(userData.role || 'user');
        }
      } catch (error) {
        // Handle based on status code
        if (error.response?.status === 401) {
          // User is not authenticated
          setCurrentUser(null);
          setUserRole('guest');
        } else {
          // Other error - session might be valid but fetch failed
          console.error('Error checking auth status:', error.message || 'Unknown error');
          setCurrentUser(null);
          setUserRole('guest');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const data = response.data;
  
      if (!data.login) {
        throw new Error('Login failed');
      }
      
      // First set basic user info from login response
      const user = {
        username: data.username,
        role: data.role || 'user'
      };
      
      setCurrentUser(user);
      setUserRole(user.role);
      
      // Try to fetch full user details in the background
      try {
        const userDataResponse = await api.get('/auth/fetch');
        
        if (userDataResponse.data?.fetch && userDataResponse.data?.user) {
          const userData = userDataResponse.data.user;
          const fullUser = {
            username: userData.username,
            email: userData.email,
            phone: userData.phone,
            role: userData.role
          };
          
          setCurrentUser(fullUser);
          setUserRole(userData.role || 'user');
          
          return { success: true, user: fullUser };
        }
      } catch (fetchError) {
        // Just log this error but don't fail the login
        console.error('Additional user data fetch failed:', fetchError.message || 'Unknown error');
      }
      
      // Return success with basic user info if full fetch failed
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Login failed. Please try again.'
      };
    }
  };

  // Guest login function
  const loginAsGuest = async () => {
    try {
      const response = await api.post('/auth/guest');
      const data = response.data;
      
      if (!data.login) {
        throw new Error('Guest login failed');
      }
      
      const user = {
        username: data.username || 'Guest',
        role: 'guest',
        isGuest: true
      };
      
      setCurrentUser(user);
      setUserRole('guest');
      
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Guest login failed. Please try again.'
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error.message || 'Unknown error');
    } finally {
      // Reset state regardless of server response
      setCurrentUser(null);
      setUserRole('guest');
    }
  };

  const authContextValue = {
    currentUser,
    userRole,
    login,
    loginAsGuest,
    logout,
    isAdmin: userRole === 'admin',
    isUser: userRole === 'user',
    isGuest: userRole === 'guest',
    isAuthenticated: !!currentUser,
    loading
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
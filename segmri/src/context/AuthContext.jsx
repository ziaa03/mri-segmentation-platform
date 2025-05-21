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
        // First attempt to access a protected route to check if we're authenticated
        const response = await api.get('/auth/protected');
        
        if (response.status === 200) {
          try {
            // If protected route works, fetch user details
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
          } catch (fetchError) {
            console.error('Error fetching user data:', fetchError);
            // Even if fetch fails, we're still authenticated
            setCurrentUser({ username: 'authenticated-user' });
            setUserRole('user');
          }
        }
      } catch (error) {
        console.error('Auth status check failed:', error);
        // If the request fails, the user is not logged in
        setCurrentUser(null);
        setUserRole('guest');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (username, password) => {
    try {
      // First login to get credentials established
      const response = await api.post('/auth/login', { username, password });
      const data = response.data;
  
      if (!data.login) {
        throw new Error('Login failed');
      }
      
      // Create a basic user object with what we know from login response
      const basicUser = {
        username: data.username || username,
        role: data.role || 'user'
      };
      
      // Set current user immediately with basic info
      setCurrentUser(basicUser);
      setUserRole(basicUser.role);
      
      try {
        // Then try to fetch complete user data
        const userDataResponse = await api.get('/auth/fetch');
        
        if (userDataResponse.data && userDataResponse.data.fetch && userDataResponse.data.user) {
          const userData = userDataResponse.data.user;
          
          // Update with full details if available
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
        console.error('User data fetch failed:', fetchError);
      }
      
      // Return success with whatever user info we have
      return { success: true, user: basicUser };
    } catch (error) {
      console.error('Login failed:', error);
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
      console.error('Guest login failed:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Guest login failed. Please try again.'
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint to invalidate the session on the server
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Reset state
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
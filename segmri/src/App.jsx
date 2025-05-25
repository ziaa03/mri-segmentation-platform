import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FileManagementPage from './pages/FileManagementPage';
import UserManagement from './pages/UserManagementPage';
import AboutUsPage from './pages/AboutUsPage';
import UserSettingPage from './pages/UserSettingPage';
import CardiacAnalysisPage from './pages/CardiacAnalysis';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import LoginUserGuest from './pages/LoginUserGuest';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes - No Header/Footer */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login-choice" element={<LoginUserGuest />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* All other routes - With Header/Footer */}
          <Route
            path="/*"
            element={
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow">
                  <Routes>
                    {/* Public routes */}
                    {/* <Route path="/" element={<Navigate to="/login-choice" />} /> */}
                    <Route index element={<Navigate to="/login-choice" />} />
                    <Route path="/landing" element={<LandingPage />} />
                    <Route path="/about-us" element={<AboutUsPage />} />
                    <Route path="/cardiac-analysis" element={<CardiacAnalysisPage />} />
                    
                    {/* Protected routes - require any authenticated user */}
                    <Route element={<ProtectedRoute allowedRoles={['user', 'admin']} />}>
                      <Route path="/user-settings" element={<UserSettingPage />} />
                    </Route>
                    
                    {/* Protected routes - users and admins only */}
                    <Route element={<ProtectedRoute allowedRoles={['user', 'admin']} />}>
                      <Route path="/files" element={<FileManagementPage />} />
                    </Route>
                    
                    {/* Admin only routes */}
                    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                      <Route path="/user-management" element={<UserManagement />} />
                    </Route>
                    
                    {/* Fallback route */}
                    <Route path="*" element={<Navigate to="/login-choice" />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
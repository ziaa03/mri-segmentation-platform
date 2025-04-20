import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FileManagementPage from './pages/FileManagementPage';
import UserManagement from './pages/UserManagementPage';
import './index.css'; 

function App() {
  return (
    <Router>
      <Routes>
        {/* Login Route - No Header/Footer */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* All other routes - With Header/Footer */}
        <Route 
          path="/*" 
          element={
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/uploads" element={<FileManagementPage />} />
                  <Route path="/user-management" element={<UserManagement />} />
                  <Route path="/about-us" element={<div>About Us Page</div>} />
                  <Route path="/login" element={<div>Login Page</div>} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
              <Footer />
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
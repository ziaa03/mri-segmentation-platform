import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Sidebar from './pages/Sidebar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FileManagementPage from './pages/FileManagementPage';
import UserManagement from './pages/UserManagementPage';
import UserSettingPage from './pages/UserSettingPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import LoginUserGuest from './pages/LoginUserGuest';
import TeamPage from './pages/TeamPage';
import FeaturesPage from './pages/Features';
import './index.css';
import AdminFileManagementPage from './pages/AdminFileManagementPage';
import AdvancedMedicalUI from './pages/Test';
import Dashboard from './pages/Dashboard';
import { useLocation } from 'react-router-dom';
import ObjViewer from '../3D/ObjModel';

// Component to determine if sidebar should be shown
const AppLayout = () => {
  const location = useLocation();
  
  // Define routes where sidebar should be visible
  const sidebarRoutes = ['/dashboard', '/files', '/vis-hub'];
  const showSidebar = sidebarRoutes.some(route => location.pathname.startsWith(route));

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-grow">
        {showSidebar && <Sidebar />}
        <main className={`flex-grow ${showSidebar ? '' : ''}`}>
          <Routes>
            {/* Public routes */}
            <Route index element={<Navigate to="/login-choice" />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/team" element={<TeamPage />} />

            {/* 3D Model Viewer Route */}
            <Route path="/3d-viewer" element={<ObjViewer />} />

            {/* Medical Upload/Analysis - Changed from cardiac-analysis to vis-hub */}
            <Route path="/vis-hub" element={<AdvancedMedicalUI />} />
            {/* <Route path="/cardiac-analysis" element={<Navigate to="/vis-hub" />} /> */}
            <Route path="/medicalfileupload" element={<Navigate to="/vis-hub" />} />
            
            {/* Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Protected routes - require any authenticated user */}
            <Route element={<ProtectedRoute allowedRoles={['user', 'admin']} />}>
              <Route path="/user-settings" element={<UserSettingPage />} />
            </Route>
            
            {/* Protected routes - users and admins only */}
            <Route element={<ProtectedRoute allowedRoles={['user', 'admin']} />}>
              <Route path="/files" element={<FileManagementPage />} />
              <Route path="/file-management" element={<Navigate to="/files" />} />
            </Route>
            
            {/* Admin only routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/user-management" element={<UserManagement />} />
              <Route path="/all-files" element={<AdminFileManagementPage />} />
            </Route>
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/login-choice" />} />
          </Routes>
        </main>
      </div>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes - No Header/Footer/Sidebar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login-choice" element={<LoginUserGuest />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* All other routes - With Header/Footer and conditional Sidebar */}
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
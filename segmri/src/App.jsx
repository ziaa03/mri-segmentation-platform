import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
// import Sidebar from './pages/Sidebar';
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
import AwsSideBar from './components/AwsSideBar';
import CpuUtilizationPage from './pages/CpuUtilizationPage';
import S3AnalyticsPage from './pages/S3AnalyticsPage';
import Testing from './pages/Testing';
import GpuConfigPage from './pages/GpuConfigPage';
import ReconstructionPage from './pages/ReconstructionPage';
import CpuDebugPage from './pages/CpuDebugPage';
import ECRMetricsPage from './pages/ECRMetricsPage';
import ScrollToTop from './utils/SmoothScroll';
import LoadBalancerPage from './pages/LoadBalancerPage';
import AutoScalingGroupPage from './pages/AutoScalingGroupPage';
import BillingMetricsPage from './pages/BillingMetricsPage';

// Component to determine if sidebar should be shown
const AppLayout = () => {
  const location = useLocation();
  
  // Define routes where sidebar should be visible
  const sidebarRoutes = ['/dashboard', '/files', '/vis-hub'];
  const showSidebar = sidebarRoutes.some(route => location.pathname.startsWith(route));

  // Define routes where sidebar should be visible
  const AwsSidebarRoutes = ['/aws-cpu', '/aws-s3', '/aws-testing', '/cpu-testing', '/aws-ecr', '/aws-alb', '/aws-asg', '/aws-bill'];
  const showAwsSidebar = AwsSidebarRoutes.some(route => location.pathname.startsWith(route));

    return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex flex-grow">
      {showAwsSidebar && <AwsSideBar />}
      
      {/* Main content - no margin needed */}
      <main className={`flex-grow ${showAwsSidebar ? '' : ''}`}>
        <Routes>
            {/* Public routes */}
            <Route index element={<Navigate to="/login-choice" />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/team" element={<TeamPage />} />

            {/* 4D Cardiac Reconstruction Route */}
            <Route path="/reconstruction/:projectId" element={<ReconstructionPage />} />

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
              <Route path="/admin-files" element={<AdminFileManagementPage />} />

            {/* AWS Integrated Dashboard Routes */}
            <Route path="/aws-cpu" element={<CpuUtilizationPage />} />
            <Route path="/aws-s3" element={<S3AnalyticsPage />} />
            <Route path="/aws-ecr" element={<ECRMetricsPage />} />
            <Route path="/aws-alb" element={<LoadBalancerPage />} />
            <Route path="/aws-asg" element={<AutoScalingGroupPage />} />
            <Route path="/aws-bill" element={<BillingMetricsPage />} />
            <Route path="/aws-testing" element={<Testing />} />

            {/* cpu debug page */}
            <Route path="/cpu-testing" element={<CpuDebugPage />} />


            {/* GPU Configuration Route */}
            <Route path="/gpu-config" element={<GpuConfigPage />} />

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
        <ScrollToTop />
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
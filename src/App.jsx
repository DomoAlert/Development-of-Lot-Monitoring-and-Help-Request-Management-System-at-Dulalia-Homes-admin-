import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import { PageTitleProvider } from './context/PageTitleContext';
import Login from './pages/Login';
import Dashboard from './pages/Admin/Dashboard';
import Inventory from './pages/Admin/Inventory';
import Staff from './pages/Admin/Staff';
import UserAccounts from './pages/Admin/UserAccounts';
import FacilityRequests from './pages/Admin/FacilityRequests';
import ServiceRequests from './pages/Admin/ServiceRequests';
import Announcements from './pages/Admin/Announcements';
import Feedback from './pages/Admin/Feedback';
import GuardAccounts from './pages/Admin/GuardAccounts';
import VisitorLogs from './pages/Admin/VisitorLogs';
import LotMonitoring from './pages/Admin/LotStatus';

// Root redirect component to handle the root URL path
const RootRedirect = () => {
  // Check if user is authenticated
  const adminToken = localStorage.getItem('adminToken');
  
  // If authenticated, redirect to admin dashboard, otherwise to login
  if (adminToken) {
    return <Navigate to="/admin" replace />;
  } else {
    return <Navigate to="/login" replace />;
  }
};

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const [isChecking, setIsChecking] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  
  React.useEffect(() => {
    try {
      console.log('Checking authentication status...');
      const adminToken = localStorage.getItem('adminToken');
      const lastLogin = localStorage.getItem('adminLastLogin');
      
      // Check for token existence
      if (!adminToken) {
        console.log('No admin token found, redirecting to login');
        setIsAuthenticated(false);
        setIsChecking(false);
        return;
      }
      
      // Check for token expiration (24 hours)
      if (lastLogin && Date.now() - parseInt(lastLogin, 10) > 24 * 60 * 60 * 1000) {
        console.log('Admin token expired, redirecting to login');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminLastLogin');
        setIsAuthenticated(false);
        setIsChecking(false);
        return;
      }
      
      // User is authenticated
      console.log('User is authenticated');
      setIsAuthenticated(true);
      setIsChecking(false);
    } catch (error) {
      console.error('Error checking authentication:', error);
      setIsAuthenticated(false);
      setIsChecking(false);
    }
  }, []);
  
  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-700">Verifying authentication...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Router>
          <Routes>
            {/* Root redirect to either admin (if logged in) or login page */}
            <Route 
              path="/" 
              element={
                <RootRedirect />
              }
            />
            
            {/* Explicit login route */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Admin Routes - All wrapped with PageTitleProvider */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <PageTitleProvider>
                    <Dashboard />
                  </PageTitleProvider>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/user-accounts" 
              element={
                <ProtectedRoute>
                  <PageTitleProvider>
                    <UserAccounts />
                  </PageTitleProvider>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/staff" 
              element={
                <ProtectedRoute>
                  <PageTitleProvider>
                    <Staff />
                  </PageTitleProvider>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/facility-requests" 
              element={
                <ProtectedRoute>
                  <PageTitleProvider>
                    <FacilityRequests />
                  </PageTitleProvider>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/service-requests" 
              element={
                <ProtectedRoute>
                  <PageTitleProvider>
                    <ServiceRequests />
                  </PageTitleProvider>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/announcements" 
              element={
                <ProtectedRoute>
                  <PageTitleProvider>
                    <Announcements />
                  </PageTitleProvider>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/feedback" 
              element={
                <ProtectedRoute>
                  <PageTitleProvider>
                    <Feedback />
                  </PageTitleProvider>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/admin/inventory" 
              element={
                <ProtectedRoute>
                  <PageTitleProvider>
                    <Inventory />
                  </PageTitleProvider>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/guard-accounts" 
              element={
                <ProtectedRoute>
                  <PageTitleProvider>
                    <GuardAccounts />
                  </PageTitleProvider>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/visitor-logs" 
              element={
                <ProtectedRoute>
                  <PageTitleProvider>
                    <VisitorLogs />
                  </PageTitleProvider>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/lot-status" 
              element={
                <ProtectedRoute>
                  <PageTitleProvider>
                    <LotMonitoring />
                  </PageTitleProvider>
                </ProtectedRoute>
              } 
            />
          </Routes>
          <ToastContainer 
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </Router>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
import React, { Suspense } from 'react';
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

// Safe auth check utility
const checkAuth = () => {
  try {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) return false;

    const lastLogin = localStorage.getItem('adminLastLogin');
    if (lastLogin && Date.now() - parseInt(lastLogin, 10) > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminLastLogin');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const [isChecking, setIsChecking] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    const authenticated = checkAuth();
    setIsAuthenticated(authenticated);
    setIsChecking(false);
  }, []);

  if (isChecking) {
    return <div className="flex items-center justify-center min-h-screen">Verifying...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Root Redirect
const RootRedirect = () => {
  const [isChecking, setIsChecking] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    const authenticated = checkAuth();
    setIsAuthenticated(authenticated);
    setIsChecking(false);
  }, []);

  if (isChecking) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/login" replace />;
};

// Inner Error Boundary for Routes
const RoutesErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        <div>
          <h2>Something went wrong.</h2>
          <button onClick={() => setHasError(false)} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Router>
          <PageTitleProvider> {/* Moved inside Router */}
            <ToastContainer />
            <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading app...</div>}>
              <RoutesErrorBoundary>
                <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/admin/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                  <Route path="/admin/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
                  <Route path="/admin/user-accounts" element={<ProtectedRoute><UserAccounts /></ProtectedRoute>} />
                  <Route path="/admin/facility-requests" element={<ProtectedRoute><FacilityRequests /></ProtectedRoute>} />
                  <Route path="/admin/service-requests" element={<ProtectedRoute><ServiceRequests /></ProtectedRoute>} />
                  <Route path="/admin/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
                  <Route path="/admin/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
                  <Route path="/admin/guard-accounts" element={<ProtectedRoute><GuardAccounts /></ProtectedRoute>} />
                  <Route path="/admin/visitor-logs" element={<ProtectedRoute><VisitorLogs /></ProtectedRoute>} />
                  <Route path="/admin/lot-monitoring" element={<ProtectedRoute><LotMonitoring /></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </RoutesErrorBoundary>
            </Suspense>
          </PageTitleProvider>
        </Router>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
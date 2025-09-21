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

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  
  if (!adminToken) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            
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
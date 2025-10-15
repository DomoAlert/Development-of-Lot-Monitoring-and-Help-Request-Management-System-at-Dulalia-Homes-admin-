import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { signInAdmin } from '../services/authService';
import logo from '../assets/images/logo.png';
import { FaEye, FaEyeSlash} from 'react-icons/fa';
import DiagnosticPanel from '../components/DiagnosticPanel';
import { checkEnvironment } from '../utils/debug';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Set debug mode based on environment or URL parameter
  const showDiagnostics = process.env.NODE_ENV !== 'production' || new URLSearchParams(window.location.search).has('debug');
  
  // Set page title
  document.title = "Admin Login";
  
  // Run environment check on component mount
  useEffect(() => {
    try {
      checkEnvironment();
      console.log('Login component mounted');
      
      // Check if we already have a token and redirect if needed
      const adminToken = localStorage.getItem('adminToken');
      if (adminToken) {
        console.log('Token found, redirecting to admin dashboard...');
        // If user is already logged in, redirect to admin dashboard immediately
        navigate('/admin', { replace: true });
        return;
      }
    } catch (error) {
      console.error('Error during login component initialization:', error);
    }
  }, [navigate]);
  
  const handleLogin = async () => {
    // Clear previous errors
    setEmailError(null);
    setPasswordError(null);

    // Validate inputs
    if (!email) {
      setEmailError('Please enter your email.');
      toast.error('Please enter your email.');
      return;
    }
    if (!password) {
      setPasswordError('Please enter your password.');
      toast.error('Please enter your password.');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address.');
      toast.error('Please enter a valid email address.');
      return;
    }
    
    // Check for admin email domain
    if (!email.endsWith('@admin.com')) {
      setEmailError('Access restricted to admin users only.');
      toast.error('Access restricted to admin users only.');
      return;
    }

    console.log('Attempting login for:', email);
    setIsLoading(true);
    
    try {
      // First clear any existing tokens
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminLastLogin');
      
      const user = await signInAdmin(email.trim().toLowerCase(), password.trim());
      console.log('Login successful, storing token');
      
      // Store the auth token
      localStorage.setItem('adminToken', user.accessToken);
      localStorage.setItem('adminLastLogin', Date.now().toString());
      
      // Show success message
      toast.success('Login successful!');
      console.log('Navigating to admin dashboard');
      
      // Navigate to admin dashboard with replace: true to prevent back button issues
      setTimeout(() => navigate('/admin', { replace: true }), 1000);
    } catch (err) {
      console.error('Login error:', err);
      
      // Show specific error messages
      if (err.code === 'auth/user-not-found') {
        toast.error('Email not found. Please check your email address.');
      } else if (err.code === 'auth/wrong-password') {
        toast.error('Incorrect password. Please try again.');
        setPasswordError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        toast.error('Too many failed login attempts. Please try again later.');
      } else if (err.code === 'auth/network-request-failed') {
        toast.error('Network error. Please check your internet connection.');
      } else {
        toast.error(err.message || 'Login failed. Please try again.');
      }
      
      // Log detailed error for debugging
      console.error('Login error details:', {
        code: err.code,
        message: err.message,
        fullError: err
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (    <div className="min-h-screen flex items-center justify-center bg-neutral">
      <div className="bg-base p-8 rounded-lg shadow-lg w-full max-w-md border-t-4 border-secondary">
        <img src={logo} alt="Logo" className="mx-auto h-24 mb-6" />
        <h2 className="text-2xl font-bold text-primary text-center mb-6">Admin Login</h2>

        <input
          type="email"
          placeholder="Admin Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={handleKeyPress}          className="w-full px-4 py-3 mb-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-secondary bg-neutral"
        />
        {emailError && <p className="text-accent text-sm mb-2">{emailError}</p>}

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 mb-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-secondary bg-neutral"
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 cursor-pointer text-gray-500 hover:text-gray-700"
          >
        {showPassword ? (
            <FaEye className="h-5 w-5" />
          ) : (
          <FaEyeSlash className="h-5 w-5" />
          )}
          </span>
        </div>
        {passwordError && <p className="text-red-500 text-sm mb-2">{passwordError}</p>}        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primaryLight transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        <a href="/forgot-password" className="text-sm text-primary hover:text-primaryLight block text-center mt-5">
          Forgot password?
        </a>

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </div>
      
      {/* Debug diagnostics panel - only visible in development or with ?debug in URL */}
      {showDiagnostics && <DiagnosticPanel />}
    </div>
  );
}

export default Login;
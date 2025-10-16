import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logo from '../assets/images/logoo.png';
import overlayPng from '../assets/images/images.jpg';
import bgPattern from '../assets/images/dulalia.webp';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
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
  const [loginSuccess, setLoginSuccess] = useState(false); // Controls both animations
  const showDiagnostics = process.env.NODE_ENV !== 'production' || new URLSearchParams(window.location.search).has('debug');

  document.title = "Admin Login";

  useEffect(() => {
    try {
      checkEnvironment();
      console.log('Login component mounted');
      const adminToken = localStorage.getItem('adminToken');
      if (adminToken) {
        console.log('Token found, checking if still valid...');
      }
    } catch (error) {
      console.error('Error during login component initialization:', error);
    }
  }, []);

  const handleLogin = async () => {
    setEmailError(null);
    setPasswordError(null);

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address.');
      toast.error('Please enter a valid email address.');
      return;
    }

    if (!email.endsWith('@admin.com')) {
      setEmailError('Access restricted to admin users only.');
      toast.error('Access restricted to admin users only.');
      return;
    }

    console.log('Attempting login for:', email);
    setIsLoading(true);

    const fakeSignInAdmin = async (email, password) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (email === 'admin@admin.com' && password === '123456') {
            resolve({
              accessToken: 'fake_admin_token_12345',
              email,
            });
          } else if (email !== 'admin@admin.com') {
            reject({ code: 'auth/user-not-found', message: 'Email not found.' });
          } else {
            reject({ code: 'auth/wrong-password', message: 'Incorrect password.' });
          }
        }, 1000);
      });
    };

    try {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminLastLogin');

      const user = await fakeSignInAdmin(email.trim().toLowerCase(), password.trim());
      console.log('Login successful, storing token');

      localStorage.setItem('adminToken', user.accessToken);
      localStorage.setItem('adminLastLogin', Date.now().toString());

      toast.success('Login successful!');
      setLoginSuccess(true);
      setTimeout(() => navigate('/admin'), 1500);
    } catch (err) {
      console.error('Login error:', err);
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
      console.error('Login error details:', { code: err.code, message: err.message, fullError: err });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Background: brightens on success */}
      <div
        className="absolute inset-0 z-0 transition-all duration-1000"
        style={{
          backgroundImage: `url(${bgPattern})`,
          backgroundColor: '#0a2540',
          backgroundBlendMode: 'overlay',
          opacity: loginSuccess ? 0.3 : 0.9,
        }}
      />

      {/* Login Card */}
      <div className="w-full max-w-md bg-neutral rounded-2xl shadow-lg overflow-hidden border border-gray-200/50 z-10">
        {/* 🔹 Logo Container — 3D flip enabled */}
        <div 
          className="relative w-full h-32 bg-primary flex justify-center items-center overflow-hidden"
          style={{ 
            transformStyle: 'preserve-3d',
            perspective: '1000px'
          }}
        >
          <img
            src={overlayPng}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-50"
            aria-hidden="true"
          />
          
          {/* 🔹 Logo wrapper for flip animation */}
          <div 
            className={`relative z-10 ${
              loginSuccess ? 'card-flip-logo' : ''
            }`}
            style={{
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden'
            }}
          >
            <img
              src={logo}
              alt="Admin Logo"
              className="h-16 w-auto object-contain"
              style={{
                filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 6px rgba(255, 255, 255, 0.4))',
                backfaceVisibility: 'hidden',
              }}
            />
          </div>
        </div>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Admin Portal</h2>
          <p className="text-gray-500 text-center mb-8">Secure access for authorized personnel</p>

          <div className="mb-5">
            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent bg-neutral"
              disabled={isLoading || loginSuccess}
            />
            {emailError && <p className="text-accent text-sm mt-1">{emailError}</p>}
          </div>

          <div className="mb-6 relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3.5 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent bg-neutral"
              disabled={isLoading || loginSuccess}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              disabled={loginSuccess}
            >
              {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
            </button>
            {passwordError && <p className="text-accent text-sm mt-1">{passwordError}</p>}
          </div>

          {/* ✅ Login Button with Success State */}
          <button
            onClick={handleLogin}
            disabled={isLoading || loginSuccess}
            className={`w-full py-3.5 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-md hover:shadow-lg disabled:cursor-not-allowed ${
              loginSuccess
                ? 'bg-green-500 text-white login-success-pulse'
                : 'bg-primary text-white hover:bg-primaryLight'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : loginSuccess ? (
              <span className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Login Successful!
              </span>
            ) : (
              'Login'
            )}
          </button>

          {!loginSuccess && (
            <a
              href="/forgot-password"
              className="block text-center mt-5 text-sm text-primary hover:text-primaryLight font-medium transition"
            >
              Forgot password?
            </a>
          )}
        </div>
      </div>

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

      {showDiagnostics && <DiagnosticPanel />}
    </div>
  );
}

export default Login;
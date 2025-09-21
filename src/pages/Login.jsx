import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { signInAdmin } from '../services/authService';
import logo from '../assets/images/logo.png';
import { FaEye, FaEyeSlash} from 'react-icons/fa';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  document.title = "Admin Login";
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
      return;
    }

    setIsLoading(true);
    try {
      const user = await signInAdmin(email.trim().toLowerCase(), password.trim());
      // Store the auth token
      localStorage.setItem('adminToken', user.accessToken);
      // Show success message
      toast.success('Login successful!');
      // Navigate to admin dashboard
      navigate('/admin');
    } catch (err) {
      // Show specific error messages
      if (err.code === 'auth/user-not-found') {
        toast.error('Email not found. Please check your email address.');
      } else if (err.code === 'auth/wrong-password') {
        toast.error('Incorrect password. Please try again.');
      } else if (!email.endsWith('@admin.com')) {
        toast.error('Access restricted to admin users only.');
      } else {
        toast.error(err.message || 'Login failed. Please try again.');
      }
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
    </div>
  );
}

export default Login;
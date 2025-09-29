import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { debugLog, reportError } from '../utils/debug';

export const signInAdmin = async (email, password) => {
  try {
    debugLog('Attempting admin sign in for:', email);
    
    // First check if the email is an admin email to avoid unnecessary auth attempts
    if (!email.endsWith('@admin.com')) {
      debugLog('Rejected non-admin email domain:', email);
      throw new Error('Access restricted to admin users only.');
    }
    
    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    debugLog('Admin sign in successful', { uid: user.uid, email: user.email });
    
    // Store sign-in time for session tracking
    localStorage.setItem('adminLastLogin', Date.now().toString());
    
    return user;
  } catch (error) {
    // Enhanced error logging
    reportError(error, 'Admin Sign In');
    
    // Rethrow with improved error message if needed
    if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    }
    
    // Pass through the original error
    throw error;
  }
};

// Add a function to check if a user is authenticated with proper error handling
export const checkAdminAuth = () => {
  try {
    const token = localStorage.getItem('adminToken');
    const lastLogin = localStorage.getItem('adminLastLogin');
    
    // No token means not authenticated
    if (!token) {
      debugLog('No admin token found');
      return false;
    }
    
    // Check for token expiration (24 hours)
    if (lastLogin && Date.now() - parseInt(lastLogin, 10) > 24 * 60 * 60 * 1000) {
      debugLog('Admin token expired');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminLastLogin');
      return false;
    }
    
    // User has valid token
    debugLog('Admin token valid');
    return true;
  } catch (error) {
    reportError(error, 'Checking Admin Auth');
    return false;
  }
};

// Add a function to log out
export const signOutAdmin = () => {
  try {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminLastLogin');
    return true;
  } catch (error) {
    reportError(error, 'Admin Sign Out');
    return false;
  }
};

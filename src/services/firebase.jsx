// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { debugLog, checkFirebaseConfig, reportError } from '../utils/debug';

const firebaseConfig = {
  apiKey: 'AIzaSyDbkipGwNvBRB9lFZZwV0ef1RHNXtZp86c',
  authDomain: 'dulalia-fb.firebaseapp.com',
  projectId: 'dulalia-fb',
  storageBucket: 'dulalia-fb.appspot.com',
  messagingSenderId: '317007260701',
  appId: '1:317007260701:web:acbe6f3bfb1e10f4ed2af4',
};

// Debug log the config
checkFirebaseConfig(firebaseConfig);

let app;
let auth;
let db;
let storage;

try {
  debugLog('Initializing Firebase');
  app = initializeApp(firebaseConfig);
  
  debugLog('Getting Firebase Auth');
  auth = getAuth(app);
  
  // Use session persistence instead of local persistence
  // This can help with auth issues in some environments
  try {
    debugLog('Setting auth persistence to browser session');
    setPersistence(auth, browserSessionPersistence)
      .then(() => debugLog('Auth persistence set successfully'))
      .catch(error => reportError(error, 'Auth Persistence'));
  } catch (persistenceError) {
    reportError(persistenceError, 'Setting Auth Persistence');
  }
  
  debugLog('Getting Firestore');
  db = getFirestore(app);
  
  debugLog('Getting Storage');
  storage = getStorage(app);
  
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  reportError(error, 'Firebase Initialization');
  
  // Create fallback objects to prevent null reference errors
  if (!auth) auth = { 
    signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase Auth not initialized')),
    currentUser: null 
  };
  if (!db) db = { collection: () => ({ doc: () => ({}) }) };
  if (!storage) storage = { ref: () => ({}) };
  
  // Show visible error for users
  const errorMessage = document.createElement('div');
  errorMessage.style.padding = '20px';
  errorMessage.style.margin = '20px';
  errorMessage.style.backgroundColor = '#ffebee';
  errorMessage.style.border = '1px solid #ef5350';
  errorMessage.style.borderRadius = '4px';
  errorMessage.style.color = '#b71c1c';
  errorMessage.innerHTML = `
    <h3>Firebase Connection Error</h3>
    <p>Could not connect to Firebase. This might be due to:</p>
    <ul>
      <li>Network connectivity issues</li>
      <li>Firebase service disruption</li>
      <li>Ad-blockers or privacy extensions</li>
    </ul>
    <p>Try disabling ad blockers or try again later.</p>
    <button onclick="window.location.reload()" style="padding: 8px 16px; background-color: #b71c1c; color: white; border: none; border-radius: 4px; cursor: pointer;">
      Reload Page
    </button>
  `;
  
  // Add to DOM when loaded
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('root');
    if (root) root.appendChild(errorMessage);
  });
}

export { auth, db, storage };

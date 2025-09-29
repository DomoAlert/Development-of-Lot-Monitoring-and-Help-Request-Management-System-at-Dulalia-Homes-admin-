// Debug utilities for troubleshooting deployment issues
const DEBUG = process.env.NODE_ENV !== 'production' || window.location.search.includes('debug=true');

export const debugLog = (...args) => {
  if (DEBUG) {
    console.log('🐞 DEBUG:', ...args);
  }
};

export const checkEnvironment = () => {
  debugLog('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    PUBLIC_URL: process.env.PUBLIC_URL || '',
    window_location: window.location.href,
    userAgent: navigator.userAgent,
    localStorage_available: checkLocalStorage(),
    indexedDB_available: checkIndexedDB(),
  });
};

export const checkFirebaseConfig = (config) => {
  debugLog('Firebase config check:', {
    apiKeyDefined: !!config.apiKey,
    authDomainDefined: !!config.authDomain,
    projectIdDefined: !!config.projectId,
    // Remove this in production as it logs sensitive info
    fullConfig: DEBUG ? config : '[hidden in production]',
  });
};

const checkLocalStorage = () => {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return true;
  } catch (e) {
    return false;
  }
};

const checkIndexedDB = () => {
  try {
    return !!window.indexedDB;
  } catch (e) {
    return false;
  }
};

export const reportError = (error, context = '') => {
  console.error(`Error in ${context}:`, error);
  
  // You could send this to a logging service
  if (DEBUG) {
    // Display in-app error for development
    const errorContainer = document.createElement('div');
    errorContainer.style.position = 'fixed';
    errorContainer.style.bottom = '20px';
    errorContainer.style.right = '20px';
    errorContainer.style.backgroundColor = '#f44336';
    errorContainer.style.color = 'white';
    errorContainer.style.padding = '15px';
    errorContainer.style.borderRadius = '5px';
    errorContainer.style.zIndex = '10000';
    errorContainer.style.maxWidth = '400px';
    errorContainer.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    
    errorContainer.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">Error in ${context}</div>
      <div>${error.message}</div>
      <div style="margin-top: 10px; font-size: 0.8em; text-align: right;">
        <button id="close-error" style="background: transparent; border: 1px solid white; color: white; padding: 3px 8px; cursor: pointer; border-radius: 3px;">
          Close
        </button>
      </div>
    `;
    
    document.body.appendChild(errorContainer);
    document.getElementById('close-error').addEventListener('click', () => {
      errorContainer.remove();
    });

    // Auto-remove after 10 seconds
    setTimeout(() => {
      errorContainer.remove();
    }, 10000);
  }
};

const debugUtils = {
  debugLog,
  checkEnvironment,
  checkFirebaseConfig,
  reportError
};

export default debugUtils;
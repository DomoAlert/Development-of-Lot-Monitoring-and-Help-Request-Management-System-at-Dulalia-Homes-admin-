import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tailwind.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Add inline styles to ensure visibility even if CSS fails to load
const rootStyles = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#f8f9fa'
};

// Enhanced error reporting
const logError = (error, source) => {
  console.error(`Error in ${source}:`, error);
  // You could also implement additional error reporting to a service here
};

// Clear any existing auth tokens if in development mode or if requested
if (process.env.NODE_ENV === 'development' || new URLSearchParams(window.location.search).has('clearAuth')) {
  localStorage.removeItem('adminToken');
  console.log('Auth tokens cleared');
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.style.minHeight = '100vh';
    rootElement.style.display = 'flex';
    rootElement.style.flexDirection = 'column';
  }
});

try {
  console.log('Starting application render');
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found in the DOM');
  }
  
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ErrorBoundary onError={(error) => {
      logError(error, 'Root ErrorBoundary');
      // Additional: Report to console with stack
      console.error('Full error stack:', error.stack);
    }}>
      <React.StrictMode>  {/* Add StrictMode for better error detection */}
        <App />
      </React.StrictMode>
    </ErrorBoundary>
  );
  console.log('Application rendered successfully');
} catch (err) {
  logError(err, 'Application initialization');
  document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h2>Error Loading Application</h2>
          <p>${err.message || 'Unknown error occurred'}</p>
          <p>Please check the console for more details.</p>
          <button onclick="window.location.reload(true)" style="padding: 8px 16px; background-color: #4a90e2; color: white; border: none; border-radius: 4px; margin-top: 10px; cursor: pointer;">
            Reload Application
          </button>
        </div>
      `;
    }
  });
}
import React, { useEffect } from 'react';

function ErrorBoundary({ children }) {
  // Log any errors to console
  useEffect(() => {
    const errorHandler = (error, errorInfo) => {
      console.error('React Error:', error);
      console.error('Component Stack:', errorInfo?.componentStack);
      
      // You could send this to a logging service
      const errorEl = document.createElement('div');
      errorEl.style.position = 'fixed';
      errorEl.style.top = '0';
      errorEl.style.left = '0';
      errorEl.style.right = '0';
      errorEl.style.backgroundColor = '#f44336';
      errorEl.style.color = 'white';
      errorEl.style.padding = '20px';
      errorEl.style.zIndex = '9999';
      errorEl.style.textAlign = 'center';
      errorEl.innerText = `Error: ${error.message || 'Unknown error occurred'}`;
      document.body.appendChild(errorEl);
    };

    window.addEventListener('error', (event) => {
      console.error('Window Error:', event.error);
      errorHandler(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      errorHandler(new Error(`Promise Rejection: ${event.reason}`));
    });

    // For development help
    console.log('App initialized - Debugging enabled');
    console.log('Environment:', process.env.NODE_ENV);
    
    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', errorHandler);
    };
  }, []);

  return <>{children}</>;
}

export default ErrorBoundary;
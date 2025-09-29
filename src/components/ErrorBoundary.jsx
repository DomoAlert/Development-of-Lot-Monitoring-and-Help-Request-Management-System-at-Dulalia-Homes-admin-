import React, { Component, useEffect } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  componentDidMount() {
    // Global error listeners
    this.errorHandler = (event) => {
      console.error('Window Error:', event.error);
      this.logError(event.error, 'Window Error');
    };

    this.rejectionHandler = (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      this.logError(new Error(`Promise Rejection: ${event.reason}`), 'Promise Rejection');
    };

    window.addEventListener('error', this.errorHandler);
    window.addEventListener('unhandledrejection', this.rejectionHandler);
    
    // For development help
    console.log('ErrorBoundary mounted - Debugging enabled');
    console.log('Environment:', process.env.NODE_ENV);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.errorHandler);
    window.removeEventListener('unhandledrejection', this.rejectionHandler);
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    this.logError(error, 'React Component Error', errorInfo);
    
    // You can also log the error to an error reporting service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  logError(error, source, errorInfo = null) {
    console.error(`Error in ${source}:`, error);
    if (errorInfo) {
      console.error('Component Stack:', errorInfo.componentStack);
    }
    
    // Visual error notification
    this.showErrorBanner(error.message || 'An unknown error occurred');
    
    // Update state
    this.setState({
      hasError: true,
      error,
      errorInfo
    });
  }

  showErrorBanner(message) {
    // Only show banner if it doesn't exist yet
    if (!document.getElementById('error-banner')) {
      const errorEl = document.createElement('div');
      errorEl.id = 'error-banner';
      errorEl.style.position = 'fixed';
      errorEl.style.top = '0';
      errorEl.style.left = '0';
      errorEl.style.right = '0';
      errorEl.style.backgroundColor = '#f44336';
      errorEl.style.color = 'white';
      errorEl.style.padding = '20px';
      errorEl.style.zIndex = '9999';
      errorEl.style.textAlign = 'center';
      
      // Add close button
      const closeButton = document.createElement('button');
      closeButton.innerText = '×';
      closeButton.style.position = 'absolute';
      closeButton.style.right = '10px';
      closeButton.style.top = '10px';
      closeButton.style.background = 'transparent';
      closeButton.style.border = 'none';
      closeButton.style.color = 'white';
      closeButton.style.fontSize = '20px';
      closeButton.style.cursor = 'pointer';
      closeButton.onclick = () => errorEl.remove();
      
      // Add message and reload button
      const messageText = document.createElement('span');
      messageText.innerText = `Error: ${message}`;
      
      const reloadBtn = document.createElement('button');
      reloadBtn.innerText = 'Reload App';
      reloadBtn.style.marginLeft = '20px';
      reloadBtn.style.padding = '5px 10px';
      reloadBtn.style.backgroundColor = 'white';
      reloadBtn.style.color = '#f44336';
      reloadBtn.style.border = 'none';
      reloadBtn.style.borderRadius = '4px';
      reloadBtn.style.cursor = 'pointer';
      reloadBtn.onclick = () => window.location.reload(true);
      
      errorEl.appendChild(closeButton);
      errorEl.appendChild(messageText);
      errorEl.appendChild(reloadBtn);
      
      document.body.appendChild(errorEl);
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px auto',
          maxWidth: '600px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#dc3545' }}>Something went wrong</h2>
          <p style={{ marginBottom: '20px' }}>
            {this.state.error?.message || 'An unknown error occurred'}
          </p>
          {this.state.errorInfo && (
            <details style={{ 
              whiteSpace: 'pre-wrap', 
              textAlign: 'left',
              backgroundColor: '#f1f3f5',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '20px' 
            }}>
              <summary>Error Details</summary>
              {this.state.errorInfo.componentStack}
            </details>
          )}
          <button 
            onClick={() => window.location.reload(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0d6efd',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
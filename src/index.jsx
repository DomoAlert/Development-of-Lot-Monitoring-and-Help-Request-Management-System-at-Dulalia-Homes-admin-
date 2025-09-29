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

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.style.minHeight = '100vh';
    rootElement.style.display = 'flex';
    rootElement.style.flexDirection = 'column';
  }
});

try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <ErrorBoundary>
      <div style={rootStyles}>
        <App />
      </div>
    </ErrorBoundary>
  );
} catch (err) {
  console.error('Failed to render application:', err);
  document.addEventListener('DOMContentLoaded', () => {
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h2>Error Loading Application</h2>
          <p>${err.message || 'Unknown error occurred'}</p>
          <p>Please check the console for more details.</p>
        </div>
      `;
    }
  });
}
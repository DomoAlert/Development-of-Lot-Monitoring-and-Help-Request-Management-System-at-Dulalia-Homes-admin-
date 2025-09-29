import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';

// A diagnostic component you can temporarily add to your app
// to debug issues in production
function DiagnosticPanel() {
  const [diagnosticData, setDiagnosticData] = useState({
    environment: process.env.NODE_ENV || 'unknown',
    url: window.location.href,
    authStatus: 'checking...',
    adminToken: 'checking...',
    lastLogin: 'checking...',
    userAgent: navigator.userAgent,
    localStorage: 'checking...',
    cookiesEnabled: navigator.cookieEnabled,
    timestamp: new Date().toISOString(),
  });

  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const adminToken = localStorage.getItem('adminToken') ? 'exists' : 'missing';
        const lastLogin = localStorage.getItem('adminLastLogin');
        
        let authStatus = 'not authenticated';
        if (auth && auth.currentUser) {
          authStatus = `authenticated as ${auth.currentUser.email}`;
        }
        
        setDiagnosticData(prev => ({
          ...prev,
          authStatus,
          adminToken,
          lastLogin: lastLogin ? new Date(parseInt(lastLogin)).toLocaleString() : 'missing',
          localStorage: 'available'
        }));
      } catch (err) {
        setDiagnosticData(prev => ({
          ...prev,
          authStatus: `error: ${err.message}`,
          localStorage: `error: ${err.message}`
        }));
      }
    };
    
    checkAuth();
  }, []);
  
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 10000,
          backgroundColor: '#666',
          color: 'white',
          padding: '5px',
          borderRadius: '3px',
          fontSize: '12px',
          opacity: 0.7
        }}
      >
        Show Diagnostics
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '5px',
      zIndex: 10000,
      fontSize: '12px',
      maxWidth: '350px',
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Diagnostic Info</h3>
        <button 
          onClick={() => setIsVisible(false)}
          style={{ 
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ×
        </button>
      </div>
      
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {Object.entries(diagnosticData).map(([key, value]) => (
            <tr key={key} style={{ borderBottom: '1px solid #333' }}>
              <td style={{ padding: '4px', color: '#aaa' }}>{key}</td>
              <td style={{ padding: '4px', wordBreak: 'break-all' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div style={{ marginTop: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminLastLogin');
            window.location.href = '/';
          }}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '5px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Clear Auth & Reload
        </button>
        
        <button
          onClick={() => window.location.reload(true)}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '5px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Hard Reload
        </button>
        
        <button
          onClick={() => {
            console.log('Diagnostic Data:', diagnosticData);
            alert('Diagnostic data logged to console');
          }}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '5px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Log to Console
        </button>
      </div>
    </div>
  );
}

export default DiagnosticPanel;
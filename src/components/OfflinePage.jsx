import React, { useState, useEffect } from 'react';
import { FaWifi, FaSpinner } from 'react-icons/fa';

const OfflinePage = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    // The reload will only succeed if the connection is back.
    // The spinner provides feedback while the browser attempts to reload.
    window.location.reload();
  };

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-[9999] transition-opacity duration-300 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full text-center transform transition-all animate-scaleIn">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
          <FaWifi className="h-8 w-8 text-red-600 transform rotate-45" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-gray-900">
          No Internet Connection
        </h2>
        <p className="mt-3 text-gray-600">
          Please check your connection and try again.
        </p>
        <div className="mt-8">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isRetrying ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                Retrying...
              </>
            ) : (
              'Retry'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple keyframe animations for the fade-in effect
const style = document.createElement('style');
style.innerHTML = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }
  .animate-scaleIn {
    animation: scaleIn 0.3s ease-out forwards;
  }
`;
document.head.appendChild(style);

export default OfflinePage;

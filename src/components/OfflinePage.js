import React, { useState, useEffect, useRef } from 'react';
import { FaWifi, FaSpinner } from 'react-icons/fa';
import { createPortal } from 'react-dom';

const DEFAULT_PING_URL = 'https://www.gstatic.com/generate_204';

const OfflinePage = ({ pingUrl = DEFAULT_PING_URL, pollInterval = 2500, pingTimeout = 2500 }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Robust connectivity check that uses navigator.onLine + a lightweight fetch ping
    const checkConnectivity = async () => {
      try {
        if (navigator.onLine === false) {
          if (mounted.current) setIsOffline(true);
          return;
        }

        // Try to fetch a lightweight URL with timeout
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), pingTimeout);

        await fetch(pingUrl, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: controller.signal });
        clearTimeout(id);

        if (mounted.current) setIsOffline(false);
      } catch (err) {
        if (mounted.current) setIsOffline(true);
      }
    };

    // initial check
    checkConnectivity();

    // event listeners for browsers that support them
    const onOnline = () => { if (mounted.current) setIsOffline(false); };
    const onOffline = () => { if (mounted.current) setIsOffline(true); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // polling fallback for browsers (like Opera GX) that may not update navigator.onLine reliably
    const interval = setInterval(checkConnectivity, pollInterval);

    // expose manual helpers for debugging / testing
    // eslint-disable-next-line no-underscore-dangle
    window.__showOffline = () => { if (mounted.current) setIsOffline(true); };
    // eslint-disable-next-line no-underscore-dangle
    window.__hideOffline = () => { if (mounted.current) setIsOffline(false); };

    return () => {
      mounted.current = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(interval);
      // cleanup helpers
      // eslint-disable-next-line no-underscore-dangle
      try { delete window.__showOffline; delete window.__hideOffline; } catch (e) {}
    };
  }, [pingUrl, pollInterval, pingTimeout]);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Wait a bit to show the spinner
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Re-check connectivity instead of reloading the page
    try {
      if (navigator.onLine === false) {
        setIsOffline(true);
        setIsRetrying(false);
        return;
      }

      // Try to fetch a lightweight URL with timeout
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), pingTimeout);

      await fetch(pingUrl, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: controller.signal });
      clearTimeout(id);

      // If we get here, connection is restored
      setIsOffline(false);
    } catch (err) {
      // Still offline, keep the page visible
      setIsOffline(true);
    }
    
    setIsRetrying(false);
  };

  if (!isOffline) return null;

  return createPortal(
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-[10000] transition-opacity duration-300" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}>
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full text-center transform transition-all" style={{ position: 'relative', zIndex: 10001 }}>
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
          <FaWifi className="h-8 w-8 text-red-600 transform rotate-45" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-gray-900">No Internet Connection</h2>
        <p className="mt-3 text-gray-600">Please check your connection and try again.</p>
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
    </div>,
    document.body
  );
};

export default OfflinePage;

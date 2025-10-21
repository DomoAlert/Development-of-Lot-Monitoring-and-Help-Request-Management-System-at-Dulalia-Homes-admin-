import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../assets/images/logoo.png';

/**
 * SplashScreen
 * - Shows only on first page load per tab (sessionStorage key: 'dulalia_splash_shown')
 * - Hides after a minimum duration (~2600ms) or when an 'app-ready' event is received
 * - Uses Framer Motion for fade/scale animations
 */
export default function SplashScreen({ background = '#ffffff', minDuration = 2600, showOncePerSession = true, ignoreAppReady = false }) {
  const [visible, setVisible] = useState(() => {
    try {
      if (!showOncePerSession) return true; // ignore sessionStorage when configured to always show
      return sessionStorage.getItem('dulalia_splash_shown') !== 'true';
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    if (!visible) return; // nothing to do

    let dismissed = false;

    const hide = () => {
      if (dismissed) return;
      dismissed = true;
      try {
        if (showOncePerSession) sessionStorage.setItem('dulalia_splash_shown', 'true');
      } catch (e) {}
      setVisible(false);
    };

    // Fallback timeout so splash doesn't hang (minDuration ms)
    const timer = setTimeout(() => hide(), minDuration);

    // If part of the app signals readiness earlier, hide immediately (unless explicitly ignored)
    let onAppReady;
    if (!ignoreAppReady) {
      onAppReady = () => hide();
      window.addEventListener('app-ready', onAppReady);
    }

    return () => {
      clearTimeout(timer);
      if (!ignoreAppReady && onAppReady) window.removeEventListener('app-ready', onAppReady);
    };
  }, [visible, minDuration]);

  // Allow other parts of the app to trigger the splash manually (e.g., after login)
  useEffect(() => {
    const onShowSplash = (e) => {
      try {
        const detail = e?.detail || {};
        const requestedDuration = typeof detail.minDuration === 'number' ? detail.minDuration : minDuration;
        const requestedIgnoreAppReady = detail.ignoreAppReady === true;

        // Temporarily show the splash and set a timer to hide
        setVisible(true);

        // If the caller requested to ignore app-ready for this show, temporarily attach a listener flag
        let dismissed = false;
        const hideNow = () => {
          if (dismissed) return;
          dismissed = true;
          try {
            if (showOncePerSession && detail.setSession === true) sessionStorage.setItem('dulalia_splash_shown', 'true');
          } catch (err) {}
          setVisible(false);
        };

        const t = setTimeout(hideNow, requestedDuration);

        // If they didn't request ignoring app-ready, hide on app-ready
        const onAppReadyOne = () => {
          if (!requestedIgnoreAppReady) hideNow();
        };
        if (!requestedIgnoreAppReady) window.addEventListener('app-ready', onAppReadyOne);

        // Cleanup after the timer finishes
        const cleanup = () => {
          clearTimeout(t);
          if (!requestedIgnoreAppReady) window.removeEventListener('app-ready', onAppReadyOne);
        };

        // Attach a short-lived cleanup via a microtask to be safe; the timer will clear later anyway
        // Return nothing; cleanup is handled by the timer and event removal above.
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('show-splash', onShowSplash);
    return () => window.removeEventListener('show-splash', onShowSplash);
  }, [minDuration, showOncePerSession]);

  // If sessionStorage said don't show, render null
  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="splash-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45 }}
        style={{ background, position: 'fixed', inset: 0, zIndex: 9999 }}
        className="flex items-center justify-center"
        aria-hidden
      >
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.55 }}
          className="flex flex-col items-center justify-center px-6 py-8"
        >
          <motion.div
            className="mb-4"
            animate={{ scale: [0.96, 1.06, 1.0] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
          >
            <img src={logo} alt="Dulalia logo" className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-2xl sm:text-3xl font-semibold text-gray-800"
          >
            Dulalia Admin
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="text-sm text-gray-600 mt-2 flex items-center"
          >
            <span className="mr-2">Loading</span>
            <span className="flex items-center" aria-hidden>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0.25, scale: 0.85 }}
                  animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.08, 0.85] }}
                  transition={{ duration: 1.05, repeat: Infinity, repeatDelay: 0.05, delay: i * 0.18, ease: 'easeInOut' }}
                  className="inline-block w-1.5 h-1.5 bg-gray-600 rounded-full mx-0.5"
                />
              ))}
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

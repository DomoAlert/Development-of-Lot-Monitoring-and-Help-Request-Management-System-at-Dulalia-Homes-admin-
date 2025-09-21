import React, { useState, useEffect } from 'react';
import 'tailwindcss/tailwind.css';
import Navbar from './Navbar'; // Using the new dedicated Navbar component
import { useTheme } from '../context/ThemeContext';
import { usePageTitle } from '../context/PageTitleContext';
import { FaMoon, FaSun } from 'react-icons/fa';

function AdminLayout({ children }) {
  const { darkMode, toggleDarkMode } = useTheme();
  const pageTitle = usePageTitle();

  // Apply dark mode class to the root HTML element
  useEffect(() => {
    // We need to ensure the document root element has the dark class for Tailwind's dark mode to work
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Also store the preference for persistence across page refreshes
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="w-full min-h-screen bg-neutral dark:bg-gray-900 transition-colors duration-200 pt-[130px]">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-white text-primary hover:bg-primaryLight hover:text-white dark:bg-gray-800 dark:text-secondary dark:hover:bg-gray-700 shadow-sm transition-all duration-200"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
            </button>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
// components/AdminLayout.jsx
import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import { useTheme } from '../context/ThemeContext';
import { usePageTitle } from '../context/PageTitleContext';

function AdminLayout({ children }) {
  const { darkMode } = useTheme(); // toggleDarkMode no longer needed here
  const [isCollapsed, setIsCollapsed] = useState(false);
  usePageTitle();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  return (
    <div className="relative min-h-screen bg-neutral dark:bg-gray-900 transition-colors duration-200">
      {/* Background Image with 80% Opacity */}
      <div
        className="absolute inset-0 z-0 opacity-80"
        style={{
          backgroundImage: `url('/images/dulalia.webp')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Overlay to improve text readability */}
      <div className="absolute inset-0 z-10 bg-white/70 dark:bg-gray-900/70"></div>

      {/* Layout Content */}
      <div className="relative z-20 flex min-h-screen">
        {/* Sidebar + Top Navbar */}
        <Navbar onToggleCollapse={(collapsed) => setIsCollapsed(collapsed)} />

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-300 pt-16 ${
            isCollapsed ? 'ml-20' : 'ml-64'
          } p-4 sm:p-6 md:p-8`}
        >
          {/* Page Content */}
          <div className="container mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
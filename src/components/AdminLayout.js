// components/AdminLayout.jsx
import React, { useState } from 'react';
import Navbar from './Navbar';

function AdminLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="relative min-h-screen bg-gray-50 bg-gray-50">
      {/* Background Image (subtle) */}
      <div
        className="absolute inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `url('/images/dulalia.webp')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        aria-hidden="true"
      />
      {/* Readability overlay */}
      <div className="absolute inset-0 z-10 bg-white/70 bg-gray-50/70"></div>

      {/* Main layout container */}
      <div className="relative z-20 flex min-h-screen">
        {/* Sidebar */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            isCollapsed ? 'w-20' : 'w-64'
          } flex-shrink-0`}
        >
          <Navbar onToggleCollapse={setIsCollapsed} isCollapsed={isCollapsed} />
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Top padding to account for fixed navbar (if any) */}
          <div className="pt-16"></div>

          {/* Page content with responsive padding */}
          <div className="flex-1 p-4 sm:p-6 md:p-8">
            <div className="max-w-7xl mx-auto w-full">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;

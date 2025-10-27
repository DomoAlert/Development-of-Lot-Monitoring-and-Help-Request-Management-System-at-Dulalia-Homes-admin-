// components/ResponsiveLayout.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaCog, FaSignOutAlt } from 'react-icons/fa';
import {
  MdDashboard,
  MdPeople,
  MdAssignment,
  MdAnnouncement,
  MdChat,
  MdSecurity,
  MdQrCode,
  MdExpandMore,
  MdWarning,
} from 'react-icons/md';
import { toast } from 'react-toastify';
import { usePageTitle } from '../context/PageTitleContext';
import logo from '../assets/images/logoo.png';

function ResponsiveLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  usePageTitle();

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (window.innerWidth < 1024 && isSidebarOpen) {
        const sidebar = document.getElementById('responsive-sidebar');
        const hamburger = document.getElementById('hamburger-button');
        if (sidebar && !sidebar.contains(event.target) && !hamburger.contains(event.target)) {
          setIsSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true); // Always open on large screens
      } else {
        setIsSidebarOpen(false); // Closed by default on smaller screens
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdowns when sidebar collapses
  useEffect(() => {
    if (isCollapsed) {
      setIsAccountsOpen(false);
      setIsRequestsOpen(false);
      setIsStaffOpen(false);
    }
  }, [isCollapsed]);

  // Handle settings dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const DULALIA_PURPLE = '#04317aff';
  const LIGHT_PURPLE = '#9F7AEA';
  const ORANGE_ACCENT = '#F6AD55';

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path, isSubmenu = false) =>
    `flex items-center ${isSubmenu ? 'p-2' : 'p-3'} rounded-lg cursor-pointer transition-all duration-200 ease-in-out hover:bg-[${LIGHT_PURPLE}]/20 ${
      isActive(path)
        ? `bg-[${DULALIA_PURPLE}] text-white shadow-md`
        : `text-white hover:text-[${ORANGE_ACCENT}]`
    }`;

  const dropdownClass = `flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out hover:bg-[${LIGHT_PURPLE}]/20 text-white hover:text-[${ORANGE_ACCENT}]`;

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminLastLogin');
    toast.success('Logged out successfully');
    navigate('/login');
    setShowLogoutConfirm(false);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50 bg-gray-50 flex flex-col">
      {/* Background Image (subtle) */}
      <div
        className="fixed inset-0 z-0 opacity-10"
        style={{
          backgroundImage: `url('/images/dulalia.webp')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        aria-hidden="true"
      />
      {/* Readability overlay */}
      <div className="fixed inset-0 z-10 bg-white/70 bg-gray-50/70"></div>

      {/* Main layout container */}
      <div className="relative z-20 flex min-h-screen">
        {/* Mobile Overlay */}
        {isSidebarOpen && window.innerWidth < 1024 && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          id="responsive-sidebar"
          className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
            ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
            w-64
            flex flex-col
          `}
          style={{ backgroundColor: DULALIA_PURPLE }}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-[${LIGHT_PURPLE}]">
            <div
              className="flex items-center space-x-2 cursor-pointer transform hover:scale-105 transition-transform duration-200"
              onClick={toggleCollapse}
            >
              <div className="p-1 rounded-lg bg-white/10">
                <img src={logo} alt="Dulalia Logo" className="h-10 w-10 object-contain" />
              </div>
              {!isCollapsed && <h2 className="text-white font-bold text-lg">Dulalia</h2>}
            </div>
            {/* Close button for mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-white hover:text-[${ORANGE_ACCENT}] transition-colors duration-200"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button
              onClick={() => navigate('/admin')}
              className={navLinkClass('/admin')}
            >
              <MdDashboard className="mr-3 text-xl flex-shrink-0" />
              {!isCollapsed && 'Dashboard'}
            </button>

            <div>
              <button
                onClick={() => (isCollapsed ? navigate('/admin/user-accounts') : setIsAccountsOpen(!isAccountsOpen))}
                className={dropdownClass}
              >
                <div className="flex items-center">
                  <MdPeople className="mr-3 text-xl flex-shrink-0" />
                  {!isCollapsed && 'Accounts'}
                </div>
                {!isCollapsed && (
                  <MdExpandMore
                    size={14}
                    className={`transition-transform duration-200 ${isAccountsOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
              {isAccountsOpen && !isCollapsed && (
                <div className="pl-6 space-y-1 transition-all duration-200 ease-in-out">
                  <button
                    onClick={() => navigate('/admin/user-accounts')}
                    className={navLinkClass('/admin/user-accounts', true)}
                  >
                    <MdPeople className="mr-2 text-lg flex-shrink-0" /> User Accounts
                  </button>
                  <button
                    onClick={() => navigate('/admin/guard-accounts')}
                    className={navLinkClass('/admin/guard-accounts', true)}
                  >
                    <MdSecurity className="mr-2 text-lg flex-shrink-0" /> Guard Accounts
                  </button>
                </div>
              )}
            </div>

            <div>
              <button
                onClick={() => (isCollapsed ? navigate('/admin/facility-requests') : setIsRequestsOpen(!isRequestsOpen))}
                className={dropdownClass}
              >
                <div className="flex items-center">
                  <MdAssignment className="mr-3 text-xl flex-shrink-0" />
                  {!isCollapsed && 'Requests'}
                </div>
                {!isCollapsed && (
                  <MdExpandMore
                    size={14}
                    className={`transition-transform duration-200 ${isRequestsOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
              {isRequestsOpen && !isCollapsed && (
                <div className="pl-6 space-y-1 transition-all duration-200 ease-in-out">
                  <button
                    onClick={() => navigate('/admin/facility-requests')}
                    className={navLinkClass('/admin/facility-requests', true)}
                  >
                    <MdAssignment className="mr-2 text-lg flex-shrink-0" /> Facility Requests
                  </button>
                  <button
                    onClick={() => navigate('/admin/service-requests')}
                    className={navLinkClass('/admin/service-requests', true)}
                  >
                    <MdAssignment className="mr-2 text-lg flex-shrink-0" /> Service Requests
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/admin/lot-status')}
              className={navLinkClass('/admin/lot-status')}
            >
              <MdDashboard className="mr-3 text-xl flex-shrink-0" />
              {!isCollapsed && 'Lot Status'}
            </button>

            <button
              onClick={() => navigate('/admin/visitor-logs')}
              className={navLinkClass('/admin/visitor-logs')}
            >
              <MdQrCode className="mr-3 text-xl flex-shrink-0" />
              {!isCollapsed && 'Visitor Logs'}
            </button>

            <div>
              <button
                onClick={() => (isCollapsed ? navigate('/admin/staff') : setIsStaffOpen(!isStaffOpen))}
                className={dropdownClass}
              >
                <div className="flex items-center">
                  <MdAssignment className="mr-3 text-xl flex-shrink-0" />
                  {!isCollapsed && 'Staff'}
                </div>
                {!isCollapsed && (
                  <MdExpandMore
                    size={14}
                    className={`transition-transform duration-200 ${isStaffOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
              {isStaffOpen && !isCollapsed && (
                <div className="pl-6 space-y-1 transition-all duration-200 ease-in-out">
                  <button
                    onClick={() => navigate('/admin/head-staff-accounts')}
                    className={navLinkClass('/admin/head-staff-accounts', true)}
                  >
                    <MdSecurity className="mr-2 text-lg flex-shrink-0" /> Head Staff
                  </button>
                  <button
                    onClick={() => navigate('/admin/staff')}
                    className={navLinkClass('/admin/staff', true)}
                  >
                    <MdAssignment className="mr-2 text-lg flex-shrink-0" /> Staff Accounts
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/admin/announcements')}
              className={navLinkClass('/admin/announcements')}
            >
              <MdAnnouncement className="mr-3 text-xl flex-shrink-0" />
              {!isCollapsed && 'Announcements'}
            </button>

            <button
              onClick={() => navigate('/admin/feedback')}
              className={navLinkClass('/admin/feedback')}
            >
              <MdChat className="mr-3 text-xl flex-shrink-0" />
              {!isCollapsed && 'Feedback'}
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="fixed top-0 left-0 right-0 z-30 bg-white bg-white border-b border-gray-200 border-gray-200 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                {/* Hamburger Menu for Mobile */}
                <button
                  id="hamburger-button"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:text-gray-700"
                >
                  <FaBars className="h-6 w-6" />
                </button>

                {/* Welcome Message */}
                <div className="flex-1 lg:ml-0">
                  <h1 className="font-semibold text-lg text-gray-800 text-black">
                    Welcome, Admin
                  </h1>
                </div>

                {/* Settings Dropdown */}
                <div className="relative" ref={settingsRef}>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center space-x-2 focus:outline-none transform hover:scale-105 transition-transform duration-200 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:text-gray-700"
                  >
                    <FaCog className="h-5 w-5" />
                    <span className="hidden sm:block font-medium">Settings</span>
                  </button>
                  {showSettings && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 border bg-white bg-white border-gray-200 border-gray-200 z-50">
                      <button
                        onClick={() => {
                          setShowSettings(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600  hover:bg-gray-100  flex items-center space-x-2 transition-colors duration-200"
                      >
                        <FaSignOutAlt className="text-lg" />
                        <span>Logout</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Collapse Toggle for Large Screens */}
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="hidden lg:block p-2 rounded-md text-gray-500 hover:text-gray-700 hover:text-gray-700 ml-2"
                >
                  <svg
                    className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className={`flex-1 overflow-y-auto pt-16 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
            <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowLogoutConfirm(false)}
        >
          <div className="bg-white bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-full flex items-center justify-center bg-red-100 ">
                <MdWarning className="text-red-600 " size={24} />
              </div>
            </div>
            <h3 className="text-lg font-medium text-center mb-2 text-gray-900 text-black">
              Confirm Logout
            </h3>
            <p className="text-sm text-center mb-6 text-gray-500 text-gray-600">
              Are you sure you want to log out?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-md transition-colors duration-200 bg-gray-200 hover:bg-gray-300   text-gray-900 text-black"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResponsiveLayout;

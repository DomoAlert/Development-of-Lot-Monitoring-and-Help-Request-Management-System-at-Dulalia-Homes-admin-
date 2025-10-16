import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaHome,
  FaUsers,
  FaClipboardList,
  FaBullhorn,
  FaComments,
  FaSignOutAlt,
  FaUserShield,
  FaQrcode,
  FaChevronDown,
  FaTimes,
  FaExclamationTriangle,
  FaMoon,
  FaSun,
} from 'react-icons/fa';
import logo from '../assets/images/logoo.png';
import { toast } from 'react-toastify';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ onToggleCollapse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAccountsDropdownOpen, setIsAccountsDropdownOpen] = useState(false);
  const [isRequestDropdownOpen, setIsRequestDropdownOpen] = useState(false);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();

  const settingsRef = useRef(null);

  const DULALIA_BLUE = '#174361'; // 💙 Custom brand color

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettingsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (onToggleCollapse) onToggleCollapse(newState);
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `flex items-center py-2 px-4 rounded-lg cursor-pointer transition-all duration-200 ${
      isActive(path)
        ? darkMode
          ? 'bg-gray-700 text-white'
          : 'bg-blue-900 text-white'
        : darkMode
        ? 'text-gray-300 hover:bg-gray-700/60'
        : 'text-white hover:bg-blue-900/40'
    }`;

  const dropdownClass = `flex justify-between items-center py-2 px-4 rounded-lg cursor-pointer transition-all duration-200 ${
    darkMode
      ? 'text-gray-300 hover:bg-gray-700/60'
      : 'text-white hover:bg-blue-900/40'
  }`;

  const handleLogout = () => setShowLogoutConfirm(true);
  const confirmLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminLastLogin');
    toast.success('Logged out successfully');
    navigate('/login');
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => setShowLogoutConfirm(false);

  return (
    <>
      {/* Sidebar */}
    <aside
  className={`fixed top-0 left-0 h-full z-40 flex flex-col ${
    darkMode ? 'bg-gray-900' : ''
  }`}
  style={{
    backgroundColor: darkMode ? '#0f172a' : DULALIA_BLUE,
    width: isCollapsed ? '5rem' : '12rem',
    overflowY: 'auto', // ✅ Enables scrolling if needed
    scrollbarWidth: 'none', // ✅ Hides scrollbar (Firefox)
    msOverflowStyle: 'none', // ✅ Hides scrollbar (IE/Edge)
    transition: 'width 0.3s ease',
    boxShadow: '2px 0 15px rgba(0, 0, 0, 0.15)',
    borderRight: darkMode ? '1px solid #1e293b' : '1px solid #1a3d57',
  }}
>


        {/* Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{
            backgroundColor: darkMode ? '#0f172a' : DULALIA_BLUE,
            borderBottom: darkMode ? '1px solid #1e293b' : '1px solid #1a3d57',
          }}
        >
     <div
  className="flex items-center space-x-2 cursor-pointer"
  onClick={toggleCollapse}
>
  {/* Logo with white outline */}
  <div className="p-1 rounded-lg border-2 border-white dark:border-gray-200 bg-white/10 flex items-center justify-center">
    <img src={logo} alt="Logo" className="h-10 w-10 object-contain" />
  </div>
  {!isCollapsed && (
    <h2 className="text-white font-bold text-lg">Dulalia</h2>
  )}
</div>


          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              className="text-white hover:text-gray-300"
              title="Collapse Menu"
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Nav Links */}
        <nav
          className={`flex-1 p-4 space-y-2 ${
            isCollapsed ? 'overflow-hidden' : 'overflow-y-auto'
          }`}
        >
          <button
            onClick={() => navigate('/admin')}
            className={navLinkClass('/admin')}
          >
            <FaHome className="mr-3 flex-shrink-0" />
            {!isCollapsed && 'Dashboard'}
          </button>

          {/* Accounts Dropdown */}
          <div>
            <button
              onClick={() =>
                setIsAccountsDropdownOpen(!isAccountsDropdownOpen)
              }
              className={dropdownClass}
            >
              <div className="flex items-center">
                <FaUsers className="mr-3 flex-shrink-0" />
                {!isCollapsed && 'Accounts'}
              </div>
              {!isCollapsed && (
                <FaChevronDown
                  size={12}
                  className={`transition-transform ${
                    isAccountsDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>
            {isAccountsDropdownOpen && !isCollapsed && (
              <div className="pl-6 space-y-1">
                <button
                  onClick={() => navigate('/admin/user-accounts')}
                  className={navLinkClass('/admin/user-accounts')}
                >
                  <FaUsers className="mr-2 flex-shrink-0" /> User Accounts
                </button>
                <button
                  onClick={() => navigate('/admin/guard-accounts')}
                  className={navLinkClass('/admin/guard-accounts')}
                >
                  <FaUserShield className="mr-2 flex-shrink-0" /> Guard Accounts
                </button>
              </div>
            )}
          </div>

          {/* Requests Dropdown */}
          <div>
            <button
              onClick={() =>
                setIsRequestDropdownOpen(!isRequestDropdownOpen)
              }
              className={dropdownClass}
            >
              <div className="flex items-center">
                <FaClipboardList className="mr-3 flex-shrink-0" />
                {!isCollapsed && 'Requests'}
              </div>
              {!isCollapsed && (
                <FaChevronDown
                  size={12}
                  className={`transition-transform ${
                    isRequestDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>
            {isRequestDropdownOpen && !isCollapsed && (
              <div className="pl-6 space-y-1">
                <button
                  onClick={() => navigate('/admin/facility-requests')}
                  className={navLinkClass('/admin/facility-requests')}
                >
                  <FaClipboardList className="mr-2 flex-shrink-0" /> Facility Requests
                </button>
                <button
                  onClick={() => navigate('/admin/service-requests')}
                  className={navLinkClass('/admin/service-requests')}
                >
                  <FaClipboardList className="mr-2 flex-shrink-0" /> Service Requests
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/admin/lot-status')}
            className={navLinkClass('/admin/lot-status')}
          >
            <FaHome className="mr-3 flex-shrink-0" />
            {!isCollapsed && 'Lot Status'}
          </button>

          <button
            onClick={() => navigate('/admin/visitor-logs')}
            className={navLinkClass('/admin/visitor-logs')}
          >
            <FaQrcode className="mr-3 flex-shrink-0" />
            {!isCollapsed && 'Visitor Logs'}
          </button>

          {/* Staff Dropdown */}
          <div>
            <button
              onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
              className={dropdownClass}
            >
              <div className="flex items-center">
                <FaClipboardList className="mr-3 flex-shrink-0" />
                {!isCollapsed && 'Staff'}
              </div>
              {!isCollapsed && (
                <FaChevronDown
                  size={12}
                  className={`transition-transform ${
                    isStaffDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
        </button>
{isStaffDropdownOpen && !isCollapsed && (
  <div className="pl-6 space-y-1">
    <button
      onClick={() => navigate('/admin/head-staff-accounts')}
      className={navLinkClass('/admin/head-staff-accounts')}
    >
      <FaUserShield className="mr-2 flex-shrink-0" /> Head Staff
    </button>
    <button
      onClick={() => navigate('/admin/staff')}
      className={navLinkClass('/admin/staff')}
    >
      <FaClipboardList className="mr-2 flex-shrink-0" /> Staff Accounts
    </button>
  </div>
)}
</div>

<button
  onClick={() => navigate('/admin/announcements')}
  className={navLinkClass('/admin/announcements')}
>
  <FaBullhorn className="mr-3 flex-shrink-0" />
  {!isCollapsed && 'Announcements'}
</button>

<button
  onClick={() => navigate('/admin/feedback')}
  className={navLinkClass('/admin/feedback')}
>
  <FaComments className="mr-3 flex-shrink-0" />
  {!isCollapsed && 'Feedback'}
</button>
</nav>
</aside>

{/* Top Navbar with Welcome & Settings */}
<header
  className="fixed top-0 left-0 right-0 h-16 z-30 flex items-center justify-between px-4"
  style={{
    backgroundColor: darkMode ? DULALIA_BLUE : '#FEE209',
    marginLeft: isCollapsed ? '5rem' : '12rem', // ✅ Adjusted to match new sidebar width
    transition: 'margin-left 0.3s ease',
    borderBottom: darkMode
      ? '1px solid #1a3d57'
      : '1px solid #E6C700',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  }}
>
  {/* Welcome Text */}
  <div>
    <h1
      className="font-semibold text-lg"
      style={{
        color: darkMode ? '#ffffff' : '#174361',
      }}
    >
      Welcome, Admin
    </h1>
  </div>


        {/* Settings Dropdown */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
            className="flex items-center space-x-2 focus:outline-none"
            aria-label="User settings"
          >
            <span
              className="font-medium"
              style={{
                color: darkMode ? '#ffffff' : '#174361',
              }}
            >
              Settings
            </span>
            <FaChevronDown
              size={12}
              style={{
                color: darkMode ? '#ffffff' : '#174361',
                transition: 'transform 0.2s',
                transform: showSettingsDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {/* Dropdown Menu */}
          {showSettingsDropdown && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border"
              style={{
                borderColor: darkMode ? '#1a3d57' : '#E6C700',
              }}
            >
              {/* Theme Toggle */}
              <button
                onClick={() => {
                  toggleDarkMode();
                  setShowSettingsDropdown(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
              >
                {darkMode ? (
                  <>
                    <FaSun className="text-yellow-500" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <FaMoon className="text-gray-700" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>

              <hr className="my-1 border-gray-200 dark:border-gray-700" />

              {/* Logout */}
              <button
                onClick={() => {
                  setShowSettingsDropdown(false);
                  handleLogout();
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLogoutConfirm(false);
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <FaExclamationTriangle
                  className="text-red-600 dark:text-red-400"
                  size={24}
                />
              </div>
            </div>
            <h3 className="text-lg font-medium text-center mb-2 text-gray-900 dark:text-white">
              Confirm Logout
            </h3>
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to log out?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
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
import { toast } from 'react-toastify';
import { useTheme } from '../context/ThemeContext';
import logo from '../assets/images/logoo.png';

const Navbar = ({ onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();
  const settingsRef = useRef(null);
  const DULALIA_BLUE = '#174361';
  const LIGHT_BLUE = '#3b6b8a';
  const SOFT_BLUE = '#93c5fd';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onToggleCollapse?.(newState);
    if (newState) {
      setIsAccountsOpen(false);
      setIsRequestsOpen(false);
      setIsStaffOpen(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105 ${
      isActive(path)
        ? darkMode
          ? 'bg-gray-700 text-white shadow-md'
          : `bg-[${DULALIA_BLUE}] text-white shadow-md`
        : darkMode
        ? `text-gray-300 hover:bg-gray-700/60 hover:text-[${SOFT_BLUE}]`
        : `text-white hover:bg-[${LIGHT_BLUE}] hover:text-[${SOFT_BLUE}]`
    }`;

  const dropdownClass = `flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105 ${
    darkMode
      ? `text-gray-300 hover:bg-gray-700/60 hover:text-[${SOFT_BLUE}]`
      : `text-white hover:bg-[${LIGHT_BLUE}] hover:text-[${SOFT_BLUE}]`
  }`;

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminLastLogin');
    toast.success('Logged out successfully');
    navigate('/login');
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <aside
        className="fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-400 ease-in-out shadow-lg"
        style={{ 
          backgroundColor: darkMode ? '#0f172a' : DULALIA_BLUE,
          width: isCollapsed ? '5rem' : '12rem' 
        }}
      >
        <div
          className={`flex items-center justify-between p-4 border-b ${
            darkMode ? 'border-gray-700' : 'border-[#1a3d57]'
          }`}
        >
          <div 
            className="flex items-center space-x-2 cursor-pointer transform hover:scale-105 transition-transform duration-200" 
            onClick={toggleCollapse}
          >
            <div className="p-1 rounded-lg border-2 border-white bg-white/10">
              <img src={logo} alt="Logo" className="h-10 w-10 object-contain" />
            </div>
            {!isCollapsed && <h2 className="text-white font-bold text-lg">Dulalia</h2>}
          </div>
          {!isCollapsed && (
            <button 
              onClick={toggleCollapse}
              className="text-white hover:text-[#93c5fd] transition-colors duration-200" 
              title="Collapse Menu"
            >
              <FaTimes />
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => navigate('/admin')} 
            className={navLinkClass('/admin')}
            title="Dashboard"
          >
            <FaHome className="mr-3" />
            {!isCollapsed && 'Dashboard'}
          </button>

          <div>
            <button 
              onClick={() => isCollapsed ? navigate('/admin/user-accounts') : setIsAccountsOpen(!isAccountsOpen)} 
              className={dropdownClass}
              title="Accounts"
            >
              <div className="flex items-center">
                <FaUsers className="mr-3" />
                {!isCollapsed && 'Accounts'}
              </div>
              {!isCollapsed && (
                <FaChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${isAccountsOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>
            {isAccountsOpen && !isCollapsed && (
              <div className="pl-6 space-y-1 transition-all duration-200 ease-in-out">
                <button
                  onClick={() => navigate('/admin/user-accounts')}
                  className={navLinkClass('/admin/user-accounts')}
                >
                  <FaUsers className="mr-2" /> User Accounts
                </button>
                <button
                  onClick={() => navigate('/admin/guard-accounts')}
                  className={navLinkClass('/admin/guard-accounts')}
                >
                  <FaUserShield className="mr-2" /> Guard Accounts
                </button>
              </div>
            )}
          </div>

          <div>
            <button 
              onClick={() => isCollapsed ? navigate('/admin/facility-requests') : setIsRequestsOpen(!isRequestsOpen)} 
              className={dropdownClass}
              title="Requests"
            >
              <div className="flex items-center">
                <FaClipboardList className="mr-3" />
                {!isCollapsed && 'Requests'}
              </div>
              {!isCollapsed && (
                <FaChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${isRequestsOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>
            {isRequestsOpen && !isCollapsed && (
              <div className="pl-6 space-y-1 transition-all duration-200 ease-in-out">
                <button
                  onClick={() => navigate('/admin/facility-requests')}
                  className={navLinkClass('/admin/facility-requests')}
                >
                  <FaClipboardList className="mr-2" /> Facility Requests
                </button>
                <button
                  onClick={() => navigate('/admin/service-requests')}
                  className={navLinkClass('/admin/service-requests')}
                >
                  <FaClipboardList className="mr-2" /> Service Requests
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => navigate('/admin/lot-status')} 
            className={navLinkClass('/admin/lot-status')}
            title="Lot Status"
          >
            <FaHome className="mr-3" />
            {!isCollapsed && 'Lot Status'}
          </button>

          <button 
            onClick={() => navigate('/admin/visitor-logs')} 
            className={navLinkClass('/admin/visitor-logs')}
            title="Visitor Logs"
          >
            <FaQrcode className="mr-3" />
            {!isCollapsed && 'Visitor Logs'}
          </button>

          <div>
            <button 
              onClick={() => isCollapsed ? navigate('/admin/staff') : setIsStaffOpen(!isStaffOpen)} 
              className={dropdownClass}
              title="Staff"
            >
              <div className="flex items-center">
                <FaClipboardList className="mr-3" />
                {!isCollapsed && 'Staff'}
              </div>
              {!isCollapsed && (
                <FaChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${isStaffOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>
            {isStaffOpen && !isCollapsed && (
              <div className="pl-6 space-y-1 transition-all duration-200 ease-in-out">
                <button
                  onClick={() => navigate('/admin/head-staff-accounts')}
                  className={navLinkClass('/admin/head-staff-accounts')}
                >
                  <FaUserShield className="mr-2" /> Head Staff
                </button>
                <button
                  onClick={() => navigate('/admin/staff')}
                  className={navLinkClass('/admin/staff')}
                >
                  <FaClipboardList className="mr-2" /> Staff Accounts
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => navigate('/admin/announcements')} 
            className={navLinkClass('/admin/announcements')}
            title="Announcements"
          >
            <FaBullhorn className="mr-3" />
            {!isCollapsed && 'Announcements'}
          </button>

          <button 
            onClick={() => navigate('/admin/feedback')} 
            className={navLinkClass('/admin/feedback')}
            title="Feedback"
          >
            <FaComments className="mr-3" />
            {!isCollapsed && 'Feedback'}
          </button>
        </nav>
      </aside>

      <header
        className="fixed top-0 left-0 right-0 h-16 z-30 flex items-center justify-between px-4 transition-all duration-400 ease-in-out shadow-md bg-white"
        style={{ marginLeft: isCollapsed ? '5rem' : '12rem' }}
      >
        <h1 className="font-semibold text-lg text-[#174361]">
          Welcome, Admin
        </h1>

        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 focus:outline-none transform hover:scale-105 transition-transform duration-200"
          >
            <span className="font-medium text-[#174361]">
              Settings
            </span>
            <FaChevronDown
              size={12}
              className={`transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`}
              style={{ color: '#174361' }}
            />
          </button>
          {showSettings && (
            <div
              className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 border transition-all duration-200 ease-in-out ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-[#1a3d57]'
              }`}
            >
              <button
                onClick={() => {
                  toggleDarkMode();
                  setShowSettings(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-[#93c5fd]/20 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-200"
              >
                {darkMode ? (
                  <>
                    <FaSun className="text-yellow-500" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <FaMoon className="text-[#174361]" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => {
                  setShowSettings(false);
                  handleLogout();
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-[#93c5fd]/20 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-200"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowLogoutConfirm(false)}
        >
          <div
            className={`rounded-lg shadow-xl w-full max-w-md p-6 transition-all duration-200 ease-in-out ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-center mb-4">
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-red-900' : 'bg-red-100'
                }`}
              >
                <FaExclamationTriangle
                  className={darkMode ? 'text-red-400' : 'text-red-600'}
                  size={24}
                />
              </div>
            </div>
            <h3 className={`text-lg font-medium text-center mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Confirm Logout
            </h3>
            <p className={`text-sm text-center mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Are you sure you want to log out?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`px-4 py-2 rounded-md transition-colors duration-200 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
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
    </>
  );
};

export default Navbar;
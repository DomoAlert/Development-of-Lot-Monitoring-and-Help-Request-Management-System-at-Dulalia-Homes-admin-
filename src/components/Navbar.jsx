import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import logo from '../assets/images/logo.png';
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
  FaBars,
  FaTimes,
  FaExclamationTriangle
} from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isRequestDropdownOpen, setIsRequestDropdownOpen] = useState(false);
  const [isAccountsDropdownOpen, setIsAccountsDropdownOpen] = useState(false);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { darkMode } = useTheme();

  // Check active route
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Check if the screen is mobile size
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setShowMobileMenu(true);
      } else {
        setShowMobileMenu(false);
      }
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminLastLogin');
    toast.success('Logged out successfully');
    navigate('/login');
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  // Prevent body scroll when logout modal is open
  useEffect(() => {
    if (showLogoutConfirm) {
      document.body.style.overflow = 'hidden';
      
      // Add keyboard listener for ESC key
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setShowLogoutConfirm(false);
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showLogoutConfirm]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsRequestDropdownOpen(false);
      setIsAccountsDropdownOpen(false);
      setIsStaffDropdownOpen(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Stop propagation for dropdown clicks
  const handleDropdownClick = (e, setter) => {
    e.stopPropagation();
    setter(prev => !prev);
  };
  
  const navLinkClass = (path) => `flex items-center py-2 px-3 rounded-lg transition-all duration-200 ${
    isActive(path) ? (darkMode ? 'bg-gray-700 text-white' : 'bg-primary-dark text-white font-medium') : ''
  } ${
    darkMode 
      ? 'hover:bg-gray-700/70 text-gray-300 hover:text-white' 
      : 'hover:bg-primaryLight/20 text-white hover:text-white'
  }`;
  
  const dropdownClass = `flex justify-between items-center py-2 px-3 rounded-lg transition-all duration-200 ${
    darkMode 
      ? 'hover:bg-gray-700/70 text-gray-300 hover:text-white' 
      : 'hover:bg-primaryLight/20 text-white hover:text-white'
  }`;

  return (
    <header className={`${darkMode ? 'bg-gray-900' : 'bg-primary'} fixed top-0 left-0 right-0 z-40 shadow-lg`}>
      <div className="container mx-auto px-4">
        {/* Top section with logo on left, static Welcome Admin text and logout on right */}
        <div className="flex justify-between items-center py-3 w-full">
          {/* Logo and Dulalia Homes text on left */}
          <div className="flex items-center">
            <img src={logo} alt="Logo" className="h-10" />
            <h2 className="text-xl font-bold text-white ml-3">Dulalia Homes</h2>
          </div>
          
          {/* Mobile menu toggle */}
          {isMobile && (
            <button 
              onClick={toggleMobileMenu}
              className={`p-2 rounded-md ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-primary-dark text-white'
              }`}
            >
              <FaBars size={20} />
            </button>
          )}
          
          {/* Welcome Admin + Logout */}
          {(!isMobile || (isMobile && showMobileMenu)) && (
            <div className="flex items-center">
              <span className="text-white font-medium mr-4">
                Welcome Admin!
              </span>
              <div className="pl-4 border-l border-gray-600">
                <button 
                  onClick={handleLogout}
                  className={`flex items-center justify-center p-2 rounded-full
                    ${darkMode ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'} 
                    transition-all duration-200`}
                  title="Logout"
                >
                  <FaSignOutAlt size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation links */}
        <div className={`${(!isMobile || (isMobile && showMobileMenu)) ? 'block' : 'hidden'} pb-3`}>
          <nav>
            <ul className={`${isMobile ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2 items-center'}`}>
              <li>
                <button 
                  onClick={() => navigate('/admin')}
                  className={`${navLinkClass('/admin')}`}
                >
                  <FaHome className="mr-2" size={16} />
                  <span>Dashboard</span>
                </button>
              </li>
              
              {/* Accounts Dropdown */}
              <li className="relative">
                <button 
                  onClick={(e) => handleDropdownClick(e, setIsAccountsDropdownOpen)}
                  className={`${dropdownClass}`}
                >
                  <div className="flex items-center">
                    <FaUsers className="mr-2" size={16} />
                    <span>Accounts</span>
                  </div>
                  <span className={`ml-2 transition-transform duration-200 ${isAccountsDropdownOpen ? 'rotate-180' : ''}`}>
                    <FaChevronDown size={12} />
                  </span>
                </button>
                {isAccountsDropdownOpen && (
                  <ul className={`${isMobile ? 'pl-6 mt-1 space-y-1' : 'absolute mt-1 bg-primary dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden z-50 min-w-[180px]'}`}>
                    <li>
                      <button 
                        onClick={() => navigate('/admin/user-accounts')}
                        className={`w-full text-left ${navLinkClass('/admin/user-accounts')}`}
                      >
                        <FaUsers className="mr-2" size={16} />
                        <span>User Accounts</span>
                      </button>
                    </li>
                    <li>
                      <button 
                        onClick={() => navigate('/admin/guard-accounts')}
                        className={`w-full text-left ${navLinkClass('/admin/guard-accounts')}`}
                      >
                        <FaUserShield className="mr-2" size={16} />
                        <span>Guard Accounts</span>
                      </button>
                    </li>
                  </ul>
                )}
              </li>
              
              {/* Staff Dropdown */}
              <li className="relative">
                <button 
                  onClick={(e) => handleDropdownClick(e, setIsStaffDropdownOpen)}
                  className={`${dropdownClass}`}
                >
                  <div className="flex items-center">
                    <FaClipboardList className="mr-2" size={16} />
                    <span>Staff</span>
                  </div>
                  <span className={`ml-2 transition-transform duration-200 ${isStaffDropdownOpen ? 'rotate-180' : ''}`}>
                    <FaChevronDown size={12} />
                  </span>
                </button>
                {isStaffDropdownOpen && (
                  <ul className={`${isMobile ? 'pl-6 mt-1 space-y-1' : 'absolute mt-1 bg-primary dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden z-50 min-w-[180px]'}`}>
                    <li>
                      <button 
                        onClick={() => navigate('/admin/head-staff-accounts')}
                        className={`w-full text-left ${navLinkClass('/admin/head-staff-accounts')}`}
                      >
                        <FaUserShield className="mr-2" size={16} />
                        <span>Head Staff Accounts</span>
                      </button>
                    </li>
                    <li>
                      <button 
                        onClick={() => navigate('/admin/staff')}
                        className={`w-full text-left ${navLinkClass('/admin/staff')}`}
                      >
                        <FaClipboardList className="mr-2" size={16} />
                        <span>Staff Accounts</span>
                      </button>
                    </li>
                  </ul>
                )}
              </li>
              
              {/* Request Dropdown */}
              <li className="relative">
                <button 
                  onClick={(e) => handleDropdownClick(e, setIsRequestDropdownOpen)}
                  className={`${dropdownClass}`}
                >
                  <div className="flex items-center">
                    <FaClipboardList className="mr-2" size={16} />
                    <span>View Request</span>
                  </div>
                  <span className={`ml-2 transition-transform duration-200 ${isRequestDropdownOpen ? 'rotate-180' : ''}`}>
                    <FaChevronDown size={12} />
                  </span>
                </button>
                {isRequestDropdownOpen && (
                  <ul className={`${isMobile ? 'pl-6 mt-1 space-y-1' : 'absolute mt-1 bg-primary dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden z-50 min-w-[180px]'}`}>
                    <li>
                      <button 
                        onClick={() => navigate('/admin/facility-requests')}
                        className={`w-full text-left ${navLinkClass('/admin/facility-requests')}`}
                      >
                        <FaClipboardList className="mr-2" size={16} />
                        <span>Facility Request</span>
                      </button>
                    </li>
                    <li>
                      <button 
                        onClick={() => navigate('/admin/service-requests')}
                        className={`w-full text-left ${navLinkClass('/admin/service-requests')}`}
                      >
                        <FaClipboardList className="mr-2" size={16} />
                        <span>Service Request</span>
                      </button>
                    </li>
                  </ul>
                )}
              </li>
              
              <li>
                <button 
                  onClick={() => navigate('/admin/announcements')}
                  className={`${navLinkClass('/admin/announcements')}`}
                >
                  <FaBullhorn className="mr-2" size={16} />
                  <span>Announcements</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate('/admin/feedback')}
                  className={`${navLinkClass('/admin/feedback')}`}
                >
                  <FaComments className="mr-2" size={16} />
                  <span>Feedback</span>
                </button>
              </li>
              
              <li>
                <button 
                  onClick={() => navigate('/admin/visitor-logs')}
                  className={`${navLinkClass('/admin/visitor-logs')}`}
                >
                  <FaQrcode className="mr-2" size={16} />
                  <span>Visitor Logs</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate('/admin/lot-status')}
                  className={`${navLinkClass('/admin/lot-status')}`}
                >
                  <FaHome className="mr-2" size={16} />
                  <span>Lot Status</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLogoutConfirm(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                  <FaExclamationTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Confirm Logout
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Are you sure you want to log out? You will need to sign in again to access the admin panel.
                </p>
                
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={cancelLogout}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmLogout}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <FaSignOutAlt className="inline mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;

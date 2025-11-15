import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MdDashboard,
  MdPeople,
  MdAssignment,
  MdAnnouncement,
  MdChat,
  MdLogout,
  MdSecurity,
  MdQrCode,
  MdExpandMore,
  MdClose,
  MdWarning,
} from 'react-icons/md';
import { Tooltip } from 'react-tooltip';
import { toast } from 'react-toastify';
import logo from '../assets/images/logoo.png';

const Navbar = ({ onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);
  const DULALIA_PURPLE = '#04317aff';
  const LIGHT_PURPLE = '#9F7AEA';
  const ORANGE_ACCENT = '#F6AD55';

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
    }
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out hover:bg-[${LIGHT_PURPLE}]/20 ${
      isActive(path)
        ? `bg-[${DULALIA_PURPLE}] text-white shadow-md`
        : `text-white hover:text-[${ORANGE_ACCENT}]`
    }`;

  const dropdownClass = `flex justify-between items-center p-3 rounded-lg cursor-pointer transition-all duration-200 ease-in-out hover:bg-[${LIGHT_PURPLE}]/20 ${
    `text-white hover:text-[${ORANGE_ACCENT}]`
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
        className="fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-400 ease-in-out shadow-lg rounded-r-lg"
        style={{
          backgroundColor: DULALIA_PURPLE,
          width: isCollapsed ? '5rem' : '12rem',
        }}
      >
        <div className="flex items-center justify-between p-4 border-b border-[${LIGHT_PURPLE}]">
          <div
            className="flex items-center space-x-2 cursor-pointer transform hover:scale-105 transition-transform duration-200"
            onClick={toggleCollapse}
            data-tooltip-id="logo-tooltip"
            data-tooltip-content="Toggle Sidebar"
          >
            <div className="p-1 rounded-lg bg-white/10">
              <img src={logo} alt="Dulalia Logo" className="h-10 w-10 object-contain" />
            </div>
            {!isCollapsed && <h2 className="text-white font-bold text-lg">Dulalia Homes Executives</h2>}
          </div>
          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              className="text-white hover:text-[${ORANGE_ACCENT}] transition-colors duration-200"
              data-tooltip-id="collapse-tooltip"
              data-tooltip-content="Collapse Menu"
            >
              <MdClose size={20} />
            </button>
          )}
          <Tooltip id="logo-tooltip" place="right" className="z-50" />
          <Tooltip id="collapse-tooltip" place="right" className="z-50" />
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => navigate('/admin')}
            className={navLinkClass('/admin')}
            data-tooltip-id="dashboard-tooltip"
            data-tooltip-content="Dashboard"
          >
            <MdDashboard className="mr-3 text-xl" />
            {!isCollapsed && 'Dashboard'}
          </button>

          <div>
            <button
              onClick={() => (isCollapsed ? navigate('/admin/user-accounts') : setIsAccountsOpen(!isAccountsOpen))}
              className={dropdownClass}
              data-tooltip-id="accounts-tooltip"
              data-tooltip-content="Accounts"
            >
              <div className="flex items-center">
                <MdPeople className="mr-3 text-xl" />
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
                  className={navLinkClass('/admin/user-accounts')}
                >
                  <MdPeople className="mr-2 text-lg" /> User Accounts
                </button>
                <button
                  onClick={() => navigate('/admin/guard-accounts')}
                  className={navLinkClass('/admin/guard-accounts')}
                >
                  <MdSecurity className="mr-2 text-lg" /> Guard Accounts
                </button>
                <button
                  onClick={() => navigate('/admin/head-staff-accounts')}
                  className={navLinkClass('/admin/head-staff-accounts')}
                >
                  <MdSecurity className="mr-2 text-lg" /> Head Staff Accounts
                </button>
                <button
                  onClick={() => navigate('/admin/staff')}
                  className={navLinkClass('/admin/staff')}
                >
                  <MdAssignment className="mr-2 text-lg" /> Staff Accounts
                </button>
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => (isCollapsed ? navigate('/admin/facility-requests') : setIsRequestsOpen(!isRequestsOpen))}
              className={dropdownClass}
              data-tooltip-id="requests-tooltip"
              data-tooltip-content="Requests"
            >
              <div className="flex items-center">
                <MdAssignment className="mr-3 text-xl" />
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
                  className={navLinkClass('/admin/facility-requests')}
                >
                  <MdAssignment className="mr-2 text-lg" /> Facility Requests
                </button>
                <button
                  onClick={() => navigate('/admin/service-requests')}
                  className={navLinkClass('/admin/service-requests')}
                >
                  <MdAssignment className="mr-2 text-lg" /> Service Requests
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/admin/lot-monitoring')}
            className={navLinkClass('/admin/lot-monitoring')}
            data-tooltip-id="lot-monitoring-tooltip"
            data-tooltip-content="Lot Monitoring"
          >
            <MdDashboard className="mr-3 text-xl" />
            {!isCollapsed && 'Lot Monitoring'}
          </button>

          <button
            onClick={() => navigate('/admin/visitor-logs')}
            className={navLinkClass('/admin/visitor-logs')}
            data-tooltip-id="visitor-logs-tooltip"
            data-tooltip-content="Visitor Logs"
          >
            <MdQrCode className="mr-3 text-xl" />
            {!isCollapsed && 'Visitor Logs'}
          </button>

          <button
            onClick={() => navigate('/admin/announcements')}
            className={navLinkClass('/admin/announcements')}
            data-tooltip-id="announcements-tooltip"
            data-tooltip-content="Announcements"
          >
            <MdAnnouncement className="mr-3 text-xl" />
            {!isCollapsed && 'Announcements'}
          </button>

          <button
            onClick={() => navigate('/admin/feedback')}
            className={navLinkClass('/admin/feedback')}
            data-tooltip-id="feedback-tooltip"
            data-tooltip-content="Feedback"
          >
            <MdChat className="mr-3 text-xl" />
            {!isCollapsed && 'Feedback'}
          </button>
        </nav>
        <Tooltip id="dashboard-tooltip" place="right" className="z-50" />
        <Tooltip id="accounts-tooltip" place="right" className="z-50" />
        <Tooltip id="requests-tooltip" place="right" className="z-50" />
        <Tooltip id="lot-monitoring-tooltip" place="right" className="z-50" />
        <Tooltip id="visitor-logs-tooltip" place="right" className="z-50" />
        <Tooltip id="announcements-tooltip" place="right" className="z-50" />
        <Tooltip id="feedback-tooltip" place="right" className="z-50" />
      </aside>

      <header
        className="fixed top-0 left-0 right-0 h-16 z-30 flex items-center justify-between px-4 transition-all duration-400 ease-in-out shadow-md bg-white"
        style={{ marginLeft: isCollapsed ? '5rem' : '12rem' }}
      >
        <h1 className="font-semibold text-lg text-[#6B46C1]">
          Welcome, Admin
        </h1>

        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 focus:outline-none transform hover:scale-105 transition-transform duration-200"
          >
            <span className="font-medium text-[#6B46C1]">
              Settings
            </span>
            <MdExpandMore
              size={14}
              className={`transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`}
              style={{ color: '#6B46C1' }}
            />
          </button>
          {showSettings && (
            <div
              className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 border bg-white border-[#9F7AEA] transition-all duration-200 ease-in-out"
            >
              <button
                onClick={() => {
                  setShowSettings(false);
                  handleLogout();
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-[#9F7AEA]/20 flex items-center space-x-2 transition-colors duration-200"
              >
                <MdLogout className="text-lg" />
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 transition-all duration-200 ease-in-out"
          >
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-full flex items-center justify-center bg-red-100"
              >
                <MdWarning
                  className="text-red-600"
                  size={24}
                />
              </div>
            </div>
            <h3 className="text-lg font-medium text-center mb-2 text-gray-900">
              Confirm Logout
            </h3>
            <p className="text-sm text-center mb-6 text-gray-500">
              Are you sure you want to log out?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-md transition-colors duration-200 bg-gray-200 hover:bg-gray-300"
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

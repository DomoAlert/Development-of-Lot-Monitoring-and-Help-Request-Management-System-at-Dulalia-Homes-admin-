import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChartBarIcon,
  UserIcon,
  LogoutIcon,
  BriefcaseIcon,
  SupportIcon,
  AnnotationIcon,
  BellIcon,
  ClipboardListIcon,
  ChatIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  HomeIcon
} from '@heroicons/react/outline';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';

const Sidebar = () => {
  const location = useLocation();
  const { theme } = useTheme();
  const { logout } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <li>
        <Link
          to={to}
          className={`flex items-center p-3 mb-1 rounded-lg transition-colors ${
            isActive
              ? 'bg-primary text-white'
              : theme === 'dark'
              ? 'text-white hover:bg-gray-700'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Icon className="w-6 h-6 mr-3" />
          <span className="text-sm font-medium">{label}</span>
        </Link>
      </li>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="fixed z-50 bottom-6 right-6 md:hidden bg-primary text-white p-3 rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
          />
        </svg>
      </button>

      <aside
        className={`fixed top-0 left-0 h-screen w-64 transition-transform transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } shadow-lg z-40`}
      >
        <div className="h-full flex flex-col overflow-y-auto">
          <div className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-gray-700">
            <h2 className={`text-xl font-bold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}>
              Dulalia Admin
            </h2>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-2">
            <ul className="space-y-1">
              <NavItem to="/admin" icon={ChartBarIcon} label="Dashboard" />
              <NavItem to="/admin/user-accounts" icon={UserIcon} label="Homeowner Accounts" />
              <NavItem to="/admin/staff" icon={BriefcaseIcon} label="Staff" />
              <NavItem to="/admin/guard-accounts" icon={ShieldCheckIcon} label="Guard Accounts" />
              <NavItem to="/admin/facility-requests" icon={ClipboardListIcon} label="Facility Requests" />
              <NavItem to="/admin/service-requests" icon={SupportIcon} label="Service Requests" />
              <NavItem to="/admin/announcements" icon={BellIcon} label="Announcements" />
              <NavItem to="/admin/feedback" icon={ChatIcon} label="Feedback" />
              <NavItem to="/admin/visitor-logs" icon={UserGroupIcon} label="Visitor Logs" />
              <NavItem to="/admin/lot-monitoring" icon={HomeIcon} label="Lot Monitoring" />
              <NavItem to="/admin/inventory" icon={AnnotationIcon} label="Inventory" />
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={logout}
              className={`flex items-center p-2 w-full rounded-md ${
                theme === 'dark'
                  ? 'text-white hover:bg-gray-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <LogoutIcon className="w-6 h-6 mr-3" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

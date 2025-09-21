import React, { createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';

// Page title mapping based on routes
const pageTitles = {
  '/admin': 'Dashboard',
  '/admin/user-accounts': 'User Accounts',
  '/admin/guard-accounts': 'Guard Accounts',
  '/admin/staff': 'Staff Management',
  '/admin/facility-requests': 'Facility Requests',
  '/admin/service-requests': 'Service Requests',
  '/admin/announcements': 'Announcements',
  '/admin/feedback': 'Feedback',
  '/admin/visitor-logs': 'Visitor Logs',
  '/admin/lot-status': 'Lot Status',
  '/admin/reports': 'Reports'
};

const PageTitleContext = createContext('');

export const PageTitleProvider = ({ children }) => {
  const location = useLocation();
  
  // Get current page title
  const currentPageTitle = pageTitles[location.pathname] || 'Dulalia Admin';
  
  return (
    <PageTitleContext.Provider value={currentPageTitle}>
      {children}
    </PageTitleContext.Provider>
  );
};

export const usePageTitle = () => useContext(PageTitleContext);

import React, { createContext, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PageTitleContext = createContext();

export const PageTitleProvider = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    // Example: Set document title based on route
    const titles = {
      '/login': 'Dulalia Homes Admin - Login',
      '/admin/dashboard': 'Dulalia Homes Admin - Dashboard',
      // Add other routes as needed
      '/': 'Dulalia Homes Admin'
    };
    document.title = titles[location.pathname] || 'Dulalia Homes Admin';
  }, [location]);

  return (
    <PageTitleContext.Provider value={{}}>
      {children}
    </PageTitleContext.Provider>
  );
};

export const usePageTitle = () => useContext(PageTitleContext); 
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import AdminLayout from './AdminLayout';
import { Card, CardHeader, CardBody } from './AdminUI';

/**
 * Higher-order component to wrap admin pages with common UI elements
 * @param {Object} options - Configuration options
 * @param {String} options.title - Page title
 * @param {React.Component} options.icon - Page icon component
 * @param {Boolean} options.showHeader - Whether to show the page header
 * @param {React.Component} options.headerActions - Additional header actions
 * @returns {Function} - HOC function
 */
const withAdminPage = (options = {}) => {
  const {
    title = '',
    icon = null,
    showHeader = true,
    headerActions = null
  } = options;

  return (Component) => {
    const WrappedComponent = (props) => {
      const { darkMode } = useTheme();
      
      // Set document title
      React.useEffect(() => {
        if (title) {
          document.title = title;
        }
      }, []);

      return (
        <AdminLayout>
          {showHeader && (
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {icon && <span className="mr-3 text-primary dark:text-secondary">{icon}</span>}
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
                </div>
                {headerActions && (
                  <div className="flex items-center space-x-2">
                    {headerActions}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* All content is now full width by default */}
          <Component {...props} />
        </AdminLayout>
      );
    };

    return WrappedComponent;
  };
};

export default withAdminPage;

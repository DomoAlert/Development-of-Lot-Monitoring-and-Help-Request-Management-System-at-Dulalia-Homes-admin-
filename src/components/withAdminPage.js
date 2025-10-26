import React from 'react';
import { useTheme } from '../context/ThemeContext';
import ResponsiveLayout from './ResponsiveLayout';
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
        <ResponsiveLayout>
          {showHeader && (
            <div className="pt-20 px-6 max-w-7xl mx-auto">
              <div className="bg-white bg-white shadow-lg rounded-lg p-6 mb-8 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800 text-black flex items-center">
                      {icon && <span className="mr-3 text-blue-500">{icon}</span>}
                      {title}
                    </h1>
                    <p className="text-gray-600 text-gray-700 mt-2">
                      {title === 'Visitor Logs' && 'Track and manage all visitor entries and access logs'}
                    </p>
                  </div>
                  {headerActions && (
                    <div className="flex items-center space-x-2">
                      {headerActions}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Wrap the component with the same max width container */}
          <div className="px-6 max-w-7xl mx-auto">
            <Component {...props} />
          </div>
        </ResponsiveLayout>
      );
    };

    return WrappedComponent;
  };
};

export default withAdminPage;

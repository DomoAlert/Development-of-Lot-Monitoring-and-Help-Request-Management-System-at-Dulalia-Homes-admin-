# Admin Module UI Template

This template provides the standardized header structure and styling for all admin modules in the Dulalia Homes admin dashboard.

## Required Header Structure

Every admin module should follow this exact structure:

```jsx
import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';

function YourModuleName() {
  // Your state and logic here

  useEffect(() => {
    document.title = "Your Module Title"; // Set the page title
  }, []);

  return (
    <AdminLayout>
      <div className="pt-20 px-6 max-w-7xl mx-auto">
        {/* Header Section - REQUIRED */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-8 border-l-4 border-blue-500">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {/* Your module-specific icon here */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="..." />
            </svg>
            Your Module Title
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Brief description of what this module does</p>
        </div>

        {/* Action Buttons Section */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handleAddNew}
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Item
          </button>
        </div>

        {/* Search Section (Optional) */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Table Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700 border-b border-gray-100 dark:border-gray-600">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="..." />
              </svg>
              Table Title
              <span className="ml-3 px-3 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-gray-100 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-700">
                  <tr>
                    {/* Your table headers here with icons */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <svg className="h-4 w-4 text-blue-500" /* icon props */>
                          {/* Icon path */}
                        </svg>
                        <span>Column Name</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {/* Your table rows here */}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Your modals and other components here */}
      </div>
    </AdminLayout>
  );
}

export default YourModuleName;
```

## Key Elements to Include:

### 1. **Required Wrapper Structure**
```jsx
<AdminLayout>
  <div className="pt-20 px-6 max-w-7xl mx-auto">
    {/* Content here */}
  </div>
</AdminLayout>
```

### 2. **Header Card (Always Required)**
- White/dark background with shadow
- Left blue border (border-l-4 border-blue-500)
- Large title (text-3xl) with icon
- Descriptive subtitle
- Dark mode support

### 3. **Action Buttons Section**
- Blue primary button for main action
- Consistent hover and transition effects
- Proper spacing (mb-6)

### 4. **Table Container**
- Rounded corners with shadow
- Gradient header background
- Proper dark mode support
- Loading states
- Empty states with call-to-action

### 5. **Responsive Design**
- Mobile-first approach
- Proper breakpoints (sm:, md:, lg:)
- Flexible layouts

## Common Icons for Admin Modules:

### User Management
```jsx
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
```

### Staff Management
```jsx
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
```

### Dashboard/Overview
```jsx
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
```

### Settings/Configuration
```jsx
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
```

## Best Practices:

1. **Always set document.title** in useEffect
2. **Use consistent color scheme** (blue as primary)
3. **Include proper dark mode support** for all elements
4. **Add loading and empty states** for better UX
5. **Use semantic HTML** and proper accessibility attributes
6. **Include hover effects and transitions** for interactive elements
7. **Maintain consistent spacing** throughout the module

## Example Usage:

When creating a new admin module, copy this template and:
1. Replace "YourModuleName" with your actual module name
2. Update the page title and descriptions
3. Choose appropriate icons for your module
4. Implement your specific functionality
5. Follow the established patterns for forms, modals, and actions

This ensures consistency across all admin modules and provides a professional, cohesive user interface.
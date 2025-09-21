# Admin UI Styling Updates

This document outlines the changes made to standardize the UI styles across all admin pages.

## Completed Changes

1. **Common Styles File**
   - Created `src/styles/adminStyles.js` with consistent styling for cards, tables, buttons, and other UI elements
   - Defined consistent color schemes based on the project's theme colors from tailwind.config.js

2. **Reusable UI Components**
   - Created `src/components/AdminUI.jsx` with reusable components:
     - Cards (Card, CardHeader, CardBody, CardFooter)
     - Buttons (Button, IconButton)
     - Tables (Table, TableHead, TableBody, TableRow, TableCell)
     - StatCards for dashboard metrics
     - Badges for status indicators
     - Modal for dialogs
     - DataSearch for search inputs

3. **Higher-Order Component for Page Structure**
   - Created `src/components/withAdminPage.jsx` to provide consistent page layout
   - Supports customizable headers, icons, and layouts

4. **Updated Admin Layout**
   - Updated `AdminLayout.jsx` to use the ThemeContext correctly
   - Standardized the theme toggle button styling

5. **Sample Page Implementation**
   - Updated `VisitorLogs.jsx` with the new components and styles as a reference

## Pages to Update

The following pages need to be updated to use the new component system:

1. `Dashboard.jsx`
2. `Announcements.jsx`
3. `FacilityRequests.jsx`
4. `ServiceRequests.jsx`
5. `Feedback.jsx`
6. `GuardAccounts.jsx`
7. `Inventory.jsx`
8. `LotStatus.jsx`
9. `Reports.jsx`
10. `Staff.jsx`
11. `UserAccounts.jsx`

## Implementation Guide

To update a page to use the new component system:

1. **Import Required Components**
   ```jsx
   import { 
     Card, CardHeader, CardBody, Button, Table, TableHead, 
     TableBody, TableRow, TableCell, TableHeaderCell, Badge, 
     Modal, DataSearch, StatCard 
   } from '../../components/AdminUI';
   import withAdminPage from '../../components/withAdminPage';
   ```

2. **Replace DIV containers with Card components**
   ```jsx
   // Before:
   <div className="bg-white rounded shadow p-4">
     <h2 className="text-lg font-bold">Title</h2>
     <div className="mt-4">Content here</div>
   </div>

   // After:
   <Card>
     <CardHeader title="Title" />
     <CardBody>Content here</CardBody>
   </Card>
   ```

3. **Replace HTML tables with Table components**
   ```jsx
   // Before:
   <table className="min-w-full">
     <thead className="bg-gray-50">
       <tr>
         <th>Name</th>
       </tr>
     </thead>
     <tbody>
       <tr>
         <td>John Doe</td>
       </tr>
     </tbody>
   </table>

   // After:
   <Table>
     <TableHead>
       <tr>
         <TableHeaderCell>Name</TableHeaderCell>
       </tr>
     </TableHead>
     <TableBody>
       <TableRow>
         <TableCell>John Doe</TableCell>
       </TableRow>
     </TableBody>
   </Table>
   ```

4. **Replace buttons with Button components**
   ```jsx
   // Before:
   <button
     className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
     onClick={handleClick}
   >
     Submit
   </button>

   // After:
   <Button variant="primary" onClick={handleClick}>
     Submit
   </Button>
   ```

5. **Replace status indicators with Badge components**
   ```jsx
   // Before:
   <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
     Active
   </span>

   // After:
   <Badge variant="success">Active</Badge>
   ```

6. **Wrap the component with withAdminPage HOC**
   ```jsx
   // Before:
   export default MyComponent;

   // After:
   export default withAdminPage({
     title: 'My Page Title',
     icon: <FaIcon size={24} />,
     fullWidth: true // or false depending on the page
   })(MyComponent);
   ```

## Color Scheme Reference

The color scheme is based on the project's theme colors from `tailwind.config.js`:

```js
colors: {
  primary: '#0F3460',      // Dark blue from logo
  primaryLight: '#1D5B8C', // Lighter blue variant
  secondary: '#F7B801',    // Yellow/gold from logo
  secondaryLight: '#FFDC82', // Lighter yellow variant
  accent: '#E94560',       // Optional accent color
  neutral: '#f8fafc',      // Light background
  "neutral-content": '#1A374D', // Text on light background
  base: '#ffffff',         // White background
  "base-content": '#1A374D', // Text on white background
}
```

## Best Practices

1. Use `StatCard` components for metrics on dashboards
2. Use consistent button variants:
   - `primary`: Main actions
   - `secondary`: Alternative actions
   - `accent`: Important call-to-action
   - `danger`: Destructive actions
   - `outline`: Secondary/tertiary actions
3. Use badges for status indicators with appropriate colors
4. Use modals for dialogs, confirmations, and forms
5. Wrap pages with `withAdminPage` to ensure consistent headers and page structure

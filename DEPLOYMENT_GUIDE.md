# Vercel Deployment Troubleshooting Guide for Dulalia Admin Dashboard

This guide documents common deployment issues encountered with the Dulalia Admin Dashboard on Vercel and their solutions.

## Common Deployment Issues

### 1. White Screen After Deployment

**Problem**: Application deployed successfully but shows only a white/blank screen.

**Causes**:
- Client-side routing not properly configured for SPA
- React Router paths not being handled correctly
- Authentication redirect loops
- JavaScript errors preventing app initialization

**Solutions**:

- **Fix routing configuration**:
  ```json
  // vercel.json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```

- **Create a proper `_redirects` file**:
  ```
  # Handle all routes for SPA
  /* /index.html 200
  ```

- **Simplify authentication logic** to avoid redirect loops and state-related issues:
  ```jsx
  // Root redirect component
  const RootRedirect = () => {
    const adminToken = localStorage.getItem('adminToken');
    return adminToken ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/login" replace />;
  };

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    const isAuthenticated = checkAuth();
    return isAuthenticated ? children : <Navigate to="/login" replace />;
  };
  ```

### 2. Build Failure with Routes Configuration

**Problem**: Error message - "If `rewrites`, `redirects`, `headers`, `cleanUrls` or `trailingSlash` are used, then `routes` cannot be present."

**Solution**:
- Remove `routes` if using any of these other configurations
- Choose either `rewrites` or `routes` but not both:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 3. Memory Issues During Build

**Problem**: Build fails with memory-related errors.

**Solution**:
- Increase Node.js memory limit in your vercel.json:
```json
{
  "env": {
    "NODE_OPTIONS": "--max_old_space_size=4096"
  }
}
```

- Add to your package.json build script:
```json
{
  "scripts": {
    "build": "NODE_OPTIONS=--max_old_space_size=4096 react-scripts build"
  }
}
```

### 4. Build Warnings Causing Deployment Failure

**Problem**: ESLint warnings being treated as errors in CI environment.

**Solution**:
- Set CI=false in build command:
```json
{
  "scripts": {
    "build": "CI=false react-scripts build"
  }
}
```

- Or in vercel.json:
```json
{
  "env": {
    "CI": "false"
  }
}
```

## Best Practices for React SPA Deployment on Vercel

### 1. Proper Vercel Configuration

Use a clean, minimal vercel.json:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 2. Environment Variables

Create a `.env` file with:
```
GENERATE_SOURCEMAP=false
CI=false
SKIP_PREFLIGHT_CHECK=true
NODE_OPTIONS=--max_old_space_size=4096
```

### 3. React Router Setup

Ensure your React Router setup properly handles direct URL access:
```jsx
<Router>
  <Routes>
    <Route path="/" element={<RootRedirect />} />
    <Route path="/login" element={<Login />} />
    <Route path="/admin/*" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
</Router>
```

### 4. Error Handling

Add proper error boundaries to catch and display errors:
```jsx
<ErrorBoundary onError={(error) => logError(error, 'Root ErrorBoundary')}>
  <App />
</ErrorBoundary>
```

## Debugging Deployment Issues

1. **Check Vercel Build Logs**:
   - Look for specific error messages
   - Note any warnings that might be treated as errors

2. **Local Testing**:
   - Build locally with `npm run build`
   - Test the build with `npx serve -s build`

3. **Browser Console**:
   - Open developer tools (F12) in browser
   - Check for JavaScript errors in the console tab

4. **Network Requests**:
   - Monitor network requests in developer tools
   - Look for failed API calls or missing resources

## Conclusion

Most Vercel deployment issues with React SPAs can be resolved by:
1. Proper SPA routing configuration
2. Handling authentication logic carefully
3. Setting appropriate environment variables
4. Using consistent configuration format in vercel.json

If problems persist, consider using Vercel's CLI tool for more detailed debugging information.
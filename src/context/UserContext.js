import React, { createContext, useContext, useState, useEffect } from 'react';

// Create a context for user data
const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({
    username: '',
    isLoading: true
  });

  useEffect(() => {
    // Fetch user info from JWT token or localStorage
    const fetchUserInfo = async () => {
      try {
        // Check if we have a token
        const token = localStorage.getItem('adminToken');
        
        if (!token) {
          setUser({ username: '', isLoading: false });
          return;
        }
        
        // Try to decode the token (simplified approach)
        // In a real app, you might want to verify this with your backend
        try {
          // For demo purposes, we'll extract a username from token
          // In production, you should validate the token with your backend
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          setUser({
            username: tokenData.name || 'Admin User',
            isLoading: false
          });
        } catch (error) {
          // Fallback if token parsing fails
          setUser({
            username: 'Admin User',
            isLoading: false
          });
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        setUser({ username: '', isLoading: false });
      }
    };

    fetchUserInfo();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

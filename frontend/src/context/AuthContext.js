import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUnreadCount = async () => {
    try {
      const res = await api.getUnreadCount();
      if (res.data.success) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch (e) {
      console.error('Failed to fetch unread count', e);
    }
  };

  // Load user/token on app boot
  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const response = await api.get('/auth/me');
        if (response.data.success) {
          const userData = response.data.data;
          setUser({ ...userData, token });
          setBookmarks(new Set(userData.bookmarks || []));
          refreshUnreadCount();
        } else {
          await AsyncStorage.removeItem('userToken');
          setUser(null);
        }
      }
    } catch (e) {
      if (e.response?.status === 401) {
        await AsyncStorage.removeItem('userToken');
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Register global auto-logout handler for 401 errors
    api.onUnauthorized(async () => {
      await logout();
    });
    
    loadUser();
  }, []);

  // Login Method
  const login = async (email, password) => {
    try {
      const response = await api.login(email, password);
      // Backend returns { success: true, data: { token, user: {...} } }
      if (response.data.success) {
        const { token, user: userData } = response.data.data;
        await AsyncStorage.setItem('userToken', token);
        setUser(userData);
        setBookmarks(new Set(userData.bookmarks || []));
        refreshUnreadCount();
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  };

  // Register Method
  const register = async (name, email, password) => {
    try {
      const response = await api.register({ name, email, password });
      // Backend returns { success: true, data: { token, user: {...} } }
      if (response.data.success) {
        const { token, user: userData } = response.data.data;
        await AsyncStorage.setItem('userToken', token);
        setUser(userData);
        setBookmarks(new Set(userData.bookmarks || []));
        refreshUnreadCount();
      }
      return response.data;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  };

  const toggleBookmark = async (completionId) => {
    const isBookmarked = bookmarks.has(completionId);
    
    // Optimistic UI update
    const newBookmarks = new Set(bookmarks);
    if (isBookmarked) newBookmarks.delete(completionId);
    else newBookmarks.add(completionId);
    setBookmarks(newBookmarks);

    try {
      if (isBookmarked) {
        await api.removeBookmark(completionId);
      } else {
        await api.addBookmark(completionId);
      }
    } catch (error) {
      setBookmarks(new Set(bookmarks));
      throw error;
    }
  };

  // Logout Method
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setUser(null);
      setBookmarks(new Set());
      setUnreadCount(0);
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      bookmarks, 
      unreadCount, 
      isLoading, 
      login, 
      register, 
      logout, 
      toggleBookmark,
      refreshUnreadCount 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

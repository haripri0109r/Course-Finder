import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { SESSION_ONLY_KEY } from '../constants/onboarding';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUnreadCount = async () => {
    try {
      const res = await api.getUnreadCount();
      if (res.data?.success && typeof res.data.unreadCount === 'number') {
        setUnreadCount(res.data.unreadCount);
      }
    } catch (e) {
      console.error('Failed to fetch unread count', e);
    }
  };

  const refreshUser = async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return null;
    const response = await api.getMe();
    if (response.data?.success) {
      const userData = response.data.data;
      setUser({ ...userData, token });
      setBookmarks(new Set(userData.bookmarks || []));
      await refreshUnreadCount();
      return userData;
    }
    return null;
  };

  const loadUser = async () => {
    try {
      const sessionOnly = await AsyncStorage.getItem(SESSION_ONLY_KEY);
      if (sessionOnly === '1') {
        await AsyncStorage.multiRemove(['userToken', SESSION_ONLY_KEY]);
        setUser(null);
        return;
      }

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
    api.onUnauthorized(async () => {
      await logout();
    });

    loadUser();
  }, []);

  const persistSession = async (token, rememberMe) => {
    await AsyncStorage.setItem('userToken', token);
    if (rememberMe) {
      await AsyncStorage.removeItem(SESSION_ONLY_KEY);
    } else {
      await AsyncStorage.setItem(SESSION_ONLY_KEY, '1');
    }
  };

  const login = async (email, password, rememberMe = true) => {
    try {
      const response = await api.login(email, password);
      if (response.data.success) {
        const { token, user: userData } = response.data.data;
        await persistSession(token, rememberMe);
        setUser({ ...userData, token });
        setBookmarks(new Set(userData.bookmarks || []));
        refreshUnreadCount();
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  };

  const register = async (name, email, password, rememberMe = true) => {
    try {
      const response = await api.register({ name, email, password });
      if (response.data.success) {
        const { token, user: userData } = response.data.data;
        await persistSession(token, rememberMe);
        setUser({ ...userData, token });
        setBookmarks(new Set(userData.bookmarks || []));
        refreshUnreadCount();
      }
      return response.data;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  };

  const updateProfile = async (payload) => {
    const res = await api.updateProfile(payload);
    if (res.data?.success && res.data.data) {
      setUser((prev) => ({ ...prev, ...res.data.data, token: prev?.token }));
    }
    return res.data;
  };

  const toggleBookmark = async (completionId) => {
    const isBookmarked = bookmarks.has(completionId);

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

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', SESSION_ONLY_KEY]);
      setUser(null);
      setBookmarks(new Set());
      setUnreadCount(0);
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        bookmarks,
        unreadCount,
        isLoading,
        login,
        register,
        logout,
        toggleBookmark,
        refreshUnreadCount,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

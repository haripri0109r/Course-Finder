import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../services/api';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext();

const socket = io('https://course-finder-fnxs.onrender.com', {
  transports: ['polling', 'websocket'], // MUST allow polling first
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  autoConnect: false,
});

const getActorId = (actor) => {
  if (!actor) return null;
  return typeof actor === 'object' ? actor._id : actor;
};

const isSameNotification = (a, b) => {
  if (!a || !b) return false;
  return (
    getActorId(a.actorId) === getActorId(b.actorId) &&
    a.type === b.type &&
    (
      (a.postId && b.postId && a.postId === b.postId) ||
      (a.commentId && b.commentId && a.commentId === b.commentId)
    )
  );
};

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const cache = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?._id) return;
    try {
      if (!cache.current) setLoading(true);
      const res = await api.getNotifications();
      const safeData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      
      setNotifications(safeData);
      cache.current = safeData;
      
      const unread = safeData.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user?._id) {
      if (socket.connected) socket.disconnect();
      setNotifications([]);
      setUnreadCount(0);
      cache.current = null;
      return;
    }

    if (!socket.connected && socket.disconnected) {
      socket.connect();
    }

    const handleConnect = () => {
      console.log("🟢 Socket Connected");
      if (user?._id) {
        socket.emit("register", user._id);
      }
    };

    const handleNewNotification = (data) => {
      if (!data || !data.type) return;
      console.log("🔥 GLOBAL RECEIVED:", data);
      setNotifications((prev) => {
        if (prev.some((n) => isSameNotification(n, data))) return prev;
        return [data, ...prev].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      });
    };

    const handleUnreadCount = (count) => {
      setUnreadCount(count);
    };

    const onDisconnect = () => console.log("🔴 Socket Disconnected");
    const onConnectError = (err) => console.log("❌ Socket error:", err.message);

    socket.off('connect', handleConnect);
    socket.off('disconnect', onDisconnect);
    socket.off('connect_error', onConnectError);
    socket.off('new_notification', handleNewNotification);
    socket.off('unread_count', handleUnreadCount);

    socket.on('connect', handleConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('new_notification', handleNewNotification);
    socket.on('unread_count', handleUnreadCount);

    if (socket.connected && user?._id) {
      socket.emit("register", user._id);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('new_notification', handleNewNotification);
      socket.off('unread_count', handleUnreadCount);
    };
  }, [user?._id]);

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.markAllAsRead();
    } catch (err) {
      console.error('Mark all read error:', err);
      fetchNotifications();
    }
  };

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await api.markAsRead(id);
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      markAllAsRead,
      markAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

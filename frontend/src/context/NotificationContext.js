import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Platform, Button, View, AppState } from 'react-native';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications'; // 🔥 FIX 5: SYSTEM NOTIF
import Constants from 'expo-constants';
import { AuthContext } from "./AuthContext"; 
import { showToast } from "../components/Toast";
import socket from '../services/socket'; 
import api from '../services/api';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext); 
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const soundRef = useRef(null);
  const isLoadedRef = useRef(false);
  const lastPlayRef = useRef(0); 
  const appStateRef = useRef(AppState.currentState);
  const isPlayingRef = useRef(false); 

  // --- 🔥 FIX 5: SET SYSTEM NOTIFICATION CHANNEL (ANDROID ONLY) ---
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }
  }, []);

  // --- FETCH NOTIFICATIONS FROM API ---
  const fetchNotifications = useCallback(async () => {
    if (!user?._id) return;
    try {
      setLoading(true);
      const res = await api.getNotifications();
      const data = res.data || [];
      setNotifications(Array.isArray(data) ? data : []);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.log("Fetch notifications error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  // --- INITIAL FETCH ON USER LOGIN ---
  useEffect(() => {
    if (user?._id) {
      fetchNotifications();
      registerForPushNotificationsAsync();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?._id, fetchNotifications]);

  // --- 🔥 FIX 1 & 2: GENERATE EXPO PUSH TOKEN OVER-THE-AIR ---
  const registerForPushNotificationsAsync = async () => {
    let token;
    
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      console.log("DEBUG: Push Permission status:", finalStatus);
      if (finalStatus !== 'granted') {
        console.log("DEBUG: Failed to get push token for push notification!");
        return;
      }

      // Important: Project ID required for EAS build if app.json missing it.
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId
      });
      token = tokenData.data;
      console.log("DEBUG: EXPO PUSH TOKEN ->", token);

      if (user?._id && token) {
        console.log("DEBUG: Sending EXPO TOKEN to backend for user", user._id);
        await api.savePushToken(token);
      }
    } catch (e) {
      console.log("DEBUG: Push Token Generation Error ->", e);
    }
  };

  // --- REGISTER USER TO SOCKET ---
  useEffect(() => {
    if (!user?._id) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("register", user._id);
    console.log("✅ Registered user to socket:", user._id);

  }, [user?._id]);

  // --- SOCKET EVENT LISTENERS ---
  useEffect(() => {
    socket.on("connect", () => console.log("🟢 Socket connected"));
    socket.on("connect_error", (err) => console.log("❌ Socket error:", err.message));
    socket.on("new_notification", (notif) => {
      showToast(`${notif.actorName} ${notif.type}`);
      setNotifications(prev => [notif, ...prev]);
    });
    socket.on("unread_count", (count) => {
      console.log("📊 Unread count from server:", count);
      setUnreadCount(count);
    });
    socket.on("notification_removed", (notifId) => {
      setNotifications(prev => prev.filter(n => n._id !== notifId));
    });

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("new_notification");
      socket.off("unread_count");
      socket.off("notification_removed");
    };
  }, []);

  // --- AUDIO RE-SYNC ON APP ACTIVE ---
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      appStateRef.current = next;

      if (next === "active") {
        try {
          let shouldReload = false;

          if (!soundRef.current) {
            shouldReload = true;
          } else {
            const status = await soundRef.current.getStatusAsync();
            if (!status.isLoaded) {shouldReload = true;}
          }

          if (shouldReload) {
            const { sound } = await Audio.Sound.createAsync(
              require("../../assets/sounds/notification.wav"),
              { shouldPlay: false, volume: 1.0, isLooping: false }
            );

            soundRef.current = sound;
            await sound.setVolumeAsync(1.0);
          }
        } catch (e) {
          console.log("⚠️ reload sound error");
        }
      }
    });

    return () => sub.remove();
  }, []);

  // --- INITIAL AUDIO MOUNTING ---
  useEffect(() => {
    if (isLoadedRef.current) return;

    let isMounted = true;

    const setupAudioAndLoadSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/notification.wav"), 
          { shouldPlay: false, volume: 1.0, isLooping: false }
        );
        
        await sound.setVolumeAsync(1.0);

        if (isMounted) {
          soundRef.current = sound;
          isLoadedRef.current = true;
        }
      } catch (e) {
        console.log("❌ Sound load error:", e);
      }
    };

    setupAudioAndLoadSound();

    return () => {
      isMounted = false;
      if (soundRef.current) {
        try {
          soundRef.current.unloadAsync();
        } catch (e) {
          console.log("⚠️ unload error ignored");
        }
      }
    };
  }, []);

  // --- 🔥 FIX 4: REMOVE FAKE "New activity" ---
  const getMessage = (item) => {
    const actorName = item.actorId?.name || "Someone";
    switch (item.type) {
      case "post_like":
      case "like":
        return `${actorName} liked your post.`;
      case "comment":
        return `${actorName} commented on your post.`;
      case "reply":
        return `${actorName} replied to your comment.`;
      case "follow":
        return `${actorName} started following you.`;
      case "comment_like":
        return `${actorName} liked your comment.`;
      default:
        return null; // ❌ removed fake fallback!
    }
  };

  // --- MAIN NOTIFICATION ACTION HANDLER ---
  const handleNewNotification = async (data) => {
    const msg = getMessage(data);

    // Filter missing/invalid message data from appearing in UI
    if (!msg && data.type !== 'test') {
      console.log('⚠️ Ignored notification due to invalid type mapping:', data.type);
      return;
    }

    setNotifications((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      
      if (data && safePrev.some((n) => {
        const existingId = n._id || n.id;
        const newId = data._id || data.id;
        if (!existingId || !newId) return false;
        return existingId === newId;
      })) {
        return safePrev;
      }
      
      return [data, ...safePrev];
    });

    // 🔥 FIX 3: BADGE COUNT BUMP
    setUnreadCount(prev => prev + 1);

    // 🔥 FIX 6: UI TOAST ACTIVATION
    showToast({
      title: data?.actorId?.name || data?.title || "Course Finder",
      message: msg || data.message || "New activity detected",
    });

    // 🔥 FIX 5: EXPO SYSTEM BELL TRIGGER
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.actorId?.name || "Notification",
          body: msg || data.message,
        },
        trigger: null, // instantly drop the notification banner from iOS/Android OS
      });
    } catch(e) {
      console.log("⚠️ System push notification error:", e.message);
    }

    // Audio Block Guards
    if (appStateRef.current !== "active") return;

    const now = Date.now();
    if (now - lastPlayRef.current < 1000) return;
    lastPlayRef.current = now;

    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    try {
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/notification.wav"),
          { shouldPlay: false }
        );
        soundRef.current = sound;
      }

      const status = await soundRef.current.getStatusAsync();

      if (!status.isLoaded) {
        await soundRef.current.loadAsync(
          require("../../assets/sounds/notification.wav")
        );
      }

      await soundRef.current.replayAsync();

    } catch (e) {
      console.log("❌ Sound error:", e);
    } finally {
      isPlayingRef.current = false;
    }
  };

  const handleSetFetchedNotifications = (fetchedData) => {
    setNotifications(Array.isArray(fetchedData) ? fetchedData : []);
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({...n, isRead: true})));
    setUnreadCount(0);
    try {
      await api.markAllAsRead();
    } catch (err) {
      console.log("Mark all read API error:", err.message);
    }
  };

  const markAsRead = async (id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n._id === id ? {...n, isRead: true} : n);
      setUnreadCount(updated.filter(n => !n.isRead).length);
      return updated;
    });
    try {
      await api.markAsRead(id);
    } catch (err) {
      console.log("Mark read API error:", err.message);
    }
  };

  const TestSoundButton = () => (
    <Button
      title="Test Complete Sequence"
      onPress={async () => {
        handleNewNotification({
          _id: Math.random().toString(),
          type: "test",
          message: "Full notification systems online!",
          title: "System OS Bell",
          actorId: { name: "Test Sequence" }
        });
      }}
    />
  );

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        loading,
        setNotifications: handleSetFetchedNotifications,
        fetchNotifications,
        handleNewNotification, 
        unreadCount, // Exposed so the Badge updates
        setUnreadCount,
        markAllAsRead, 
        markAsRead,
        TestSoundButton 
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);

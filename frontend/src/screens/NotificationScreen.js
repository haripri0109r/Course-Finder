import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import api from '../services/api';
import { timeAgo } from '../utils/formatter';

const NotificationScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const cache = useRef(null);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const isSame = (a, b) => {
    if (a.length !== b.length) return false;
    return a.every((item, i) => item._id === b[i]._id && item.isRead === b[i].isRead);
  };

  const fetchNotifications = async () => {
    try {
      if (!cache.current) setLoading(true);
      
      const res = await api.getNotifications();
      // 🧱 PART 5: FRONTEND SAFETY
      const newData = res.data || [];
      const safeData = Array.isArray(newData) ? newData : (newData.data || []);

      // Zero-Flicker Identity Check
      if (!isSame(notifications, safeData)) {
        setNotifications(safeData);
        cache.current = safeData;
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
      // Fallback to cache on network failure
      if (cache.current) {
        setNotifications(cache.current);
      } else {
        setNotifications([]); // ✅ Prevent crash
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🧱 PART 4: FRONTEND MESSAGE GENERATION
  const getMessage = (n) => {
    const name = n.actorId?.name || "Someone";

    if (n.type === "post_like" || n.type === "like") return `${name} liked your post`;
    if (n.type === "comment") return `${name} commented on your post`;
    if (n.type === "reply") return `${name} replied to your comment`;
    if (n.type === "follow") return `${name} started following you`;

    return "New activity";
  };

  const handleMarkAllRead = async () => {
    // Optimistic UI Update
    const original = [...notifications];
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    try {
      await api.markAllAsRead();
    } catch (err) {
      setNotifications(original);
      console.error('Mark all read error:', err);
    }
  };

  const handlePress = async (item) => {
    // Navigate logic (Inferred from presence of postId/commentId)
    if (item.postId) {
      navigation.navigate("PostDetail", { postId: item.postId });
    }

    // Mark single as read
    if (!item.isRead) {
      setNotifications(prev => prev.map(n => n._id === item._id ? { ...n, isRead: true } : n));
      try {
        await api.markAsRead(item._id);
      } catch (err) {
        console.error('Mark read error:', err);
      }
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
      onPress={() => handlePress(item)}
    >
      <View style={styles.avatarContainer}>
        {item.actorId?.profilePicture ? (
          <Image source={{ uri: item.actorId.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{(item.actorId?.name || 'U')[0].toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={[styles.message, !item.isRead && styles.unreadMessage]}>
          {getMessage(item)}
        </Text>
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.some(n => !n.isRead) && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markReadBtn}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyText}>You're all caught up!</Text>
              <Text style={styles.emptySub}>Notifications about your courses and social activity will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    ...SHADOW.sm,
  },
  headerTitle: { ...FONTS.h2 },
  markReadBtn: { color: COLORS.primary, fontWeight: 'bold' },
  list: { paddingBottom: 100 },
  notificationItem: {
    flexDirection: 'row',
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    alignItems: 'center'
  },
  unreadItem: { backgroundColor: '#F0F7FF' }, // Light blue for unread
  avatarContainer: { marginRight: SPACING.lg },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.white, fontWeight: 'bold', fontSize: 18 },
  content: { flex: 1 },
  message: { ...FONTS.body, fontSize: 15, color: COLORS.textPrimary, lineHeight: 20 },
  unreadMessage: { fontWeight: '600' },
  time: { ...FONTS.small, color: COLORS.textMuted, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginLeft: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 100, padding: 40 },
  emptyEmoji: { fontSize: 50, marginBottom: 20 },
  emptyText: { ...FONTS.h3, marginBottom: 8 },
  emptySub: { ...FONTS.body, color: COLORS.textMuted, textAlign: 'center' }
});

export default NotificationScreen;

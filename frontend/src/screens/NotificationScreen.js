import React, { useState, useContext, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import AnimatedPressable from '../components/AnimatedPressable';
import RetryBox from '../components/RetryBox';
import { timeAgo } from '../utils/format';
import { COLORS, SPACING, FONTS, RADIUS } from '../utils/theme';

const NotificationItem = ({ notification, onPress }) => {
  const isRead = notification.isRead;

  return (
    <AnimatedPressable 
      style={[styles.notificationCard, !isRead && styles.unreadCard]} 
      onPress={() => onPress(notification)}
      scaleTo={0.98}
      haptic="impactLight"
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(notification.sender?.name || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.message, !isRead && styles.unreadMessage]}>
          {notification.message}
        </Text>
        <Text style={styles.time}>
          {timeAgo(notification.createdAt)}
        </Text>
      </View>
      {!isRead && <View style={styles.unreadDot} />}
    </AnimatedPressable>
  );
};

export default function NotificationScreen({ navigation }) {
  const { refreshUnreadCount } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh && notifications.length === 0) setLoading(true);
      const res = await api.getNotifications();
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      setError(err);
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      refreshUnreadCount();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const handleNotificationPress = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.markNotificationRead(notif._id);
        setNotifications(prev => prev.map(n => 
          n._id === notif._id ? { ...n, isRead: true } : n
        ));
        refreshUnreadCount();
      } catch (err) {
        console.error('Failed to mark as read', err);
      }
    }

    if (notif.type === 'follow' && notif.sender?._id) {
      navigation.navigate('UserProfile', { userId: notif.sender._id });
    } else if ((notif.type === 'like' || notif.type === 'comment') && notif.relatedPost) {
      navigation.navigate('CompletionDetail', { completionId: notif.relatedPost._id || notif.relatedPost });
    }
  };

  if (error && notifications.length === 0) {
    return <RetryBox message="Unable to load notifications" error={error} onRetry={() => fetchNotifications(false)} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Activity Feed</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <NotificationItem 
              notification={item} 
              onPress={handleNotificationPress} 
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubtitle}>
                When classmates follow you or like your posts, you'll see them here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    height: 110, paddingTop: 60, flexDirection: 'row', alignItems: 'center', 
    justifyContent: 'space-between', paddingHorizontal: SPACING.lg, 
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight 
  },
  backBtn: { width: 40, alignItems: 'center' },
  backIcon: { fontSize: 24, fontWeight: 'bold' },
  headerTitle: { ...FONTS.h3 },

  list: { paddingVertical: SPACING.md },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  unreadCard: {
    backgroundColor: '#F0F7FF',
    borderColor: '#D0E7FF',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  content: { flex: 1 },
  message: { ...FONTS.body, fontSize: 15, color: COLORS.textPrimary },
  unreadMessage: { fontWeight: '700' },
  time: { ...FONTS.small, color: COLORS.textMuted, marginTop: 4 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    marginLeft: SPACING.sm,
  },

  emptyBox: { alignSelf: 'center', marginTop: 100, alignItems: 'center', paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 16, opacity: 0.3 },
  emptyTitle: { ...FONTS.h3, color: COLORS.textPrimary },
  emptySubtitle: { ...FONTS.caption, textAlign: 'center', marginTop: 8, color: COLORS.textSecondary, fontSize: 15 },
});

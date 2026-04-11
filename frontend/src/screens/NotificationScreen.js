import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { timeAgo } from '../utils/formatter';
import { NotificationContext } from '../context/NotificationContext';
import SafeImage from '../components/SafeImage';

const NotificationScreen = ({ navigation }) => {
  const { 
    notifications, 
    loading, 
    fetchNotifications, 
    markAllAsRead, 
    markAsRead 
  } = useContext(NotificationContext);
  
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const getMessage = (n) => {
    const name = n.actorId?.name || "Someone";

    if (n.type === "post_like" || n.type === "like") return `${name} liked your post`;
    if (n.type === "comment") return `${name} commented on your post`;
    if (n.type === "reply") return `${name} replied to your comment`;
    if (n.type === "follow") return `${name} started following you`;

    return "New activity";
  };

  const handlePress = async (item) => {
    if (item.postId) {
      navigation.navigate("PostDetail", { postId: item.postId });
    }

    if (!item.isRead) {
      await markAsRead(item._id);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
      onPress={() => handlePress(item)}
    >
      <View style={styles.avatarContainer}>
        {item.actorId?.profilePicture ? (
          <SafeImage source={{ uri: item.actorId.profilePicture }} style={styles.avatar} />
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
          <TouchableOpacity onPress={markAllAsRead}>
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
  unreadItem: { backgroundColor: '#F0F7FF' },
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

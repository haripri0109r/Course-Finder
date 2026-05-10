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
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { timeAgo } from '../utils/format';
import { NotificationContext } from '../context/NotificationContext';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import SectionHeader from '../components/SectionHeader';

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

  const getTypeIcon = (type) => {
    switch (type) {
      case "post_like":
      case "like":
      case "comment_like":
        return { icon: 'heart', bg: COLORS.dangerSoft, color: COLORS.danger };
      case "comment":
      case "reply":
        return { icon: 'chatbubble', bg: COLORS.infoSoft, color: COLORS.info };
      case "follow":
        return { icon: 'person', bg: COLORS.successSoft, color: COLORS.success };
      default:
        return { icon: 'notifications', bg: COLORS.accentLight, color: COLORS.accent };
    }
  };

  const getActionText = (item) => {
    switch (item.type) {
      case "post_like":
      case "like":
        return "liked your course log";
      case "comment":
        return "commented on your post";
      case "reply":
        return "replied to your comment";
      case "follow":
        return "started following you";
      case "comment_like":
        return "liked your comment";
      default:
        return "interacted with you";
    }
  };

  const handlePress = async (item) => {
    if (item.postId) {
      navigation.navigate("PostDetail", { postId: item.postId });
    } else if (item.type === 'follow') {
      navigation.navigate("UserProfile", { userId: item.actorId?._id || item.actorId });
    }

    if (!item.isRead) {
      await markAsRead(item._id);
    }
  };

  const renderItem = ({ item }) => {
    const meta = getTypeIcon(item.type);
    
    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrapper}>
          <Avatar 
            name={item.actorName || item.actorId?.name} 
            uri={item.actorId?.profilePicture} 
            size="md" 
          />
          <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={11} color={meta.color} />
          </View>
        </View>

        <View style={styles.textContent}>
          <Text style={styles.messageText} numberOfLines={2}>
            <Text style={styles.actorName}>{item.actorName || item.actorId?.name || "Someone"} </Text>
            <Text style={styles.actionText}>{getActionText(item)}</Text>
          </Text>
          <Text style={styles.timestamp}>{timeAgo(item.createdAt)}</Text>
        </View>

        {!item.isRead && <View style={styles.unreadIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.some(n => !n.isRead) && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
          }
          ListEmptyComponent={
            <EmptyState 
              icon="○"
              title="Nothing here yet"
              subtitle="Social updates and achievements will appear here."
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { 
    ...FONTS.h1, 
    fontSize: 26, 
    color: COLORS.textPrimary 
  },
  markAllText: { 
    ...FONTS.captionBold,
    color: COLORS.accent, 
    textTransform: 'none',
    fontWeight: '700' 
  },
  listContent: { 
    paddingBottom: 100,
    paddingTop: SPACING.md,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unreadItem: {
    backgroundColor: '#F3F7FF',
    borderColor: '#BFDBFE',
  },
  avatarWrapper: { 
    position: 'relative' 
  },
  typeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
    ...SHADOW.xs,
  },
  textContent: { 
    flex: 1, 
    marginLeft: SPACING.lg 
  },
  messageText: { 
    lineHeight: 20,
  },
  actorName: { 
    ...FONTS.bodyBold, 
    fontSize: 14, 
    color: COLORS.textPrimary 
  },
  actionText: { 
    ...FONTS.body, 
    fontSize: 14, 
    color: COLORS.textSecondary 
  },
  timestamp: { 
    ...FONTS.tiny, 
    color: COLORS.textMuted, 
    marginTop: 4, 
    textTransform: 'none' 
  },
  unreadIndicator: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: COLORS.accent, 
    marginLeft: SPACING.md 
  },
  loaderBox: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
});

export default NotificationScreen;

import React, { useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
import { timeAgo } from '../utils/format';
import { NotificationContext } from '../context/NotificationContext';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';

function createStyles(colors, isDark) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.md,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      ...SHADOW.xs,
    },
    headerTitle: {
      ...FONTS.h2,
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    markAllText: {
      ...FONTS.captionBold,
      color: colors.accent,
      textTransform: 'none',
    },
    listContent: {
      paddingBottom: SPACING.md,
      paddingTop: SPACING.md,
    },
    notificationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      backgroundColor: colors.surface,
      marginHorizontal: SPACING.md,
      marginBottom: SPACING.sm,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOW.xs,
    },
    unreadItem: {
      backgroundColor: isDark ? 'rgba(96,165,250,0.12)' : '#F3F7FF',
      borderColor: isDark ? 'rgba(96,165,250,0.35)' : '#BFDBFE',
    },
    avatarWrapper: {
      position: 'relative',
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
      borderColor: colors.surface,
      ...SHADOW.xs,
    },
    textContent: {
      flex: 1,
      marginLeft: SPACING.lg,
    },
    messageText: {
      lineHeight: 20,
    },
    actorName: {
      ...FONTS.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    actionText: {
      ...FONTS.body,
      fontSize: 14,
      color: colors.textSecondary,
    },
    timestamp: {
      ...FONTS.tiny,
      color: colors.textMuted,
      marginTop: 4,
      textTransform: 'none',
    },
    unreadIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
      marginLeft: SPACING.md,
    },
    loaderBox: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}

const NotificationScreen = ({ navigation }) => {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const {
    notifications,
    loading,
    fetchNotifications,
    markAllAsRead,
    markAsRead,
  } = useContext(NotificationContext);

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'post_like':
      case 'like':
      case 'comment_like':
        return { icon: 'heart', bg: colors.dangerSoft, color: colors.danger };
      case 'comment':
      case 'reply':
        return { icon: 'chatbubble', bg: colors.infoSoft, color: colors.info };
      case 'follow':
        return { icon: 'person', bg: colors.successSoft, color: colors.success };
      default:
        return { icon: 'notifications', bg: colors.accentLight, color: colors.accent };
    }
  };

  const getActionText = (item) => {
    switch (item.type) {
      case 'post_like':
      case 'like':
        return 'liked your course log';
      case 'comment':
        return 'commented on your post';
      case 'reply':
        return 'replied to your comment';
      case 'follow':
        return 'started following you';
      case 'comment_like':
        return 'liked your comment';
      default:
        return 'interacted with you';
    }
  };

  const handlePress = async (item) => {
    if (item.postId) {
      navigation.navigate('PostDetail', { postId: item.postId });
    } else if (item.type === 'follow') {
      navigation.navigate('UserProfile', {
        userId: item.actorId?._id || item.actorId,
      });
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
        activeOpacity={0.75}
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
            <Text style={styles.actorName}>
              {item.actorName || item.actorId?.name || 'Someone'}{' '}
            </Text>
            <Text style={styles.actionText}>{getActionText(item)}</Text>
          </Text>
          <Text style={styles.timestamp}>{timeAgo(item.createdAt)}</Text>
        </View>

        {!item.isRead ? <View style={styles.unreadIndicator} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.some((n) => !n.isRead) ? (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="You’re all caught up"
              subtitle="Reminders, milestones, and activity will appear in this inbox."
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default NotificationScreen;

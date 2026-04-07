import React, { useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, RefreshControl, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import SkeletonCard from '../components/SkeletonCard';
import RetryBox from '../components/RetryBox';
import AnimatedPressable from '../components/AnimatedPressable';
import CourseImage from '../components/CourseImage';
import { showToast } from '../components/Toast';
import { prefetchImages } from '../utils/prefetch';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';

export default function ProfileScreen({ route, navigation }) {
  const { logout, user: currentUser } = useContext(AuthContext);
  const targetUserId = route?.params?.userId;
  const isOwnProfile = !targetUserId || targetUserId === currentUser._id;

  const [displayUser, setDisplayUser] = useState(isOwnProfile ? currentUser : null);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfileData = async (isRefresh = false, signal = null) => {
    try {
      setError(null);
      if (!isRefresh && completed.length === 0) setLoading(true);
      const startTime = Date.now();
      
      const idToFetch = targetUserId || currentUser._id;
      
      const [userRes, courseRes] = await Promise.all([
        isOwnProfile ? api.get('/api/v1/auth/me', { signal }) : api.getUserProfile(idToFetch, { signal }),
        api.get(isOwnProfile ? '/api/v1/completed/me' : `/api/v1/completed/user/${idToFetch}`, { signal })
      ]);

      if (userRes.data.success) setDisplayUser(userRes.data.data);
      
      if (courseRes.data.success) {
        const flatData = courseRes.data.data;
        setCompleted(flatData);
        prefetchImages(flatData);
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      setError(err);
      showToast('Error loading profile content', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { 
    const controller = new AbortController();
    fetchProfileData(false, controller.signal); 
    return () => controller.abort();
  }, [targetUserId]));
  
  const onRefresh = () => { setRefreshing(true); fetchProfileData(true); };

  const handleFollow = async () => {
    if (isOwnProfile || !displayUser) return;
    const isFollowing = displayUser.followers.some(f => 
      (typeof f === 'string' ? f : f._id) === currentUser._id
    );

    // Optimistic Update
    const updatedFollowers = isFollowing
      ? displayUser.followers.filter(f => (typeof f === 'string' ? f : f._id) !== currentUser._id)
      : [...displayUser.followers, currentUser._id];
    
    setDisplayUser({ ...displayUser, followers: updatedFollowers });

    try {
      if (isFollowing) await api.unfollowUser(displayUser._id);
      else await api.followUser(displayUser._id);
    } catch (err) {
      setDisplayUser(displayUser);
      showToast('Follow action failed', 'error');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout', 
      'Ready to take a break from learning?', 
      [
        { text: 'Stay Logged In', style: 'cancel' },
        { text: 'Yes, Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const totalCourses = completed.length;
  // Standardized formatter property access
  const avgRating = totalCourses > 0
    ? (completed.reduce((s, c) => s + (c.rating || 0), 0) / totalCourses).toFixed(1)
    : '0.0';

  const isFollowing = displayUser?.followers?.some(f => 
    (typeof f === 'string' ? f : f._id) === currentUser._id
  );

  const ProfileHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(displayUser?.name || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.profileName}>{displayUser?.name || 'Learner'}</Text>
        {displayUser?.bio ? <Text style={styles.bioText}>{displayUser.bio}</Text> : null}

        <View style={styles.socialStatsRow}>
          <View style={styles.socialStat}>
            <Text style={styles.socialVal}>{displayUser?.followers?.length || 0}</Text>
            <Text style={styles.socialLabel}>Followers</Text>
          </View>
          <View style={styles.socialStat}>
            <Text style={styles.socialVal}>{displayUser?.following?.length || 0}</Text>
            <Text style={styles.socialLabel}>Following</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{totalCourses}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{avgRating}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>
      </View>

      {isOwnProfile ? (
        <AnimatedPressable 
          style={styles.logoutBtn} 
          onPress={handleLogout}
        >
          <Text style={styles.logoutBtnText}>Logout Account</Text>
        </AnimatedPressable>
      ) : (
        <AnimatedPressable 
          style={[styles.followBtn, isFollowing && styles.unfollowBtn]} 
          onPress={handleFollow}
        >
          <Text style={[styles.followBtnText, isFollowing && styles.unfollowBtnText]}>
            {isFollowing ? 'Unfollow' : 'Follow Learner'}
          </Text>
        </AnimatedPressable>
      )}

      {totalCourses > 0 && (
        <Text style={styles.sectionTitle}>
          {isOwnProfile ? 'Your' : (displayUser?.name || 'User') + "'s"} Journey
        </Text>
      )}
    </View>
  );

  const renderItem = ({ item }) => {
    if (loading) return <SkeletonCard />;
    
    // v1 Flat structure access
    return (
      <AnimatedPressable 
        style={styles.historyCard}
        onPress={() => {
          navigation.navigate('CompletionDetail', { id: item.id });
        }}
      >
        <View style={[styles.historyAccent, { backgroundColor: COLORS.secondary }]} />
        <View style={styles.historyImgContainer}>
          <CourseImage uri={item.image} style={styles.historyThumb} />
        </View>
        <View style={styles.historyContent}>
          <Text style={styles.historyTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.historyPlatform}>{item.platform}</Text>
          <Text style={styles.historyRating}>
            {item.rating ? '⭐'.repeat(Math.round(item.rating)) : 'No rating'}
          </Text>
          {item.review ? (
            <View style={styles.reviewBubble}>
              <Text style={styles.reviewText}>"{item.review}"</Text>
            </View>
          ) : null}
        </View>
      </AnimatedPressable>
    );
  };

  if (error && completed.length === 0) {
    return <RetryBox message="Error loading profile" error={error} onRetry={() => fetchProfileData(false)} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={loading ? [1, 2, 3] : completed}
        keyExtractor={(item, index) => loading ? `skel-${index}` : item._id}
        renderItem={renderItem}
        ListHeaderComponent={<ProfileHeader />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.primary} 
            colors={[COLORS.primary]} 
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🎯</Text>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySubtitle}>Log your first course to start your journey!</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl },
  headerContainer: { paddingTop: 60 },

  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    ...SHADOW.md,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.lg,
  },
  avatarText: { color: COLORS.white, fontSize: 34, fontWeight: '900' },
  profileName: { ...FONTS.h2, marginBottom: SPACING.xs },
  bioText: { ...FONTS.caption, fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: SPACING.md, textAlign: 'center', paddingHorizontal: SPACING.xl },

  socialStatsRow: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.background, 
    borderRadius: RADIUS.md, 
    paddingVertical: SPACING.md, 
    paddingHorizontal: SPACING.xxl,
    marginBottom: SPACING.xl,
    width: '100%',
    justifyContent: 'space-around'
  },
  socialStat: { alignItems: 'center' },
  socialVal: { ...FONTS.h3, color: COLORS.textPrimary },
  socialLabel: { ...FONTS.small, color: COLORS.textMuted },

  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'center' },
  statBlock: { alignItems: 'center', flex: 1 },
  statValue: { ...FONTS.h2, color: COLORS.primary },
  statLabel: { ...FONTS.small, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.borderLight, marginHorizontal: SPACING.lg },

  logoutBtn: {
    backgroundColor: COLORS.dangerLight,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoutBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 16 },

  followBtn: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  followBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  unfollowBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  unfollowBtnText: { color: COLORS.primary },

  sectionTitle: { ...FONTS.h3, marginBottom: SPACING.lg },

  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  historyAccent: { width: 5 },
  historyImgContainer: { width: 80, height: '100%', backgroundColor: COLORS.borderLight },
  historyThumb: { width: 80, height: 80 },
  historyContent: { flex: 1, padding: SPACING.lg },
  historyTitle: { ...FONTS.bodyBold, marginBottom: SPACING.xs },
  historyPlatform: { ...FONTS.small, color: COLORS.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm },
  historyRating: { ...FONTS.caption, marginBottom: SPACING.sm },
  reviewBubble: { backgroundColor: COLORS.borderLight, padding: SPACING.md, borderRadius: RADIUS.sm, marginTop: SPACING.xs },
  reviewText: { ...FONTS.caption, fontStyle: 'italic', lineHeight: 20 },

  emptyBox: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 60, marginBottom: SPACING.md, opacity: 0.5 },
  emptyTitle: { ...FONTS.h3, marginBottom: SPACING.xs },
  emptySubtitle: { ...FONTS.caption, fontSize: 15, textAlign: 'center' },
});

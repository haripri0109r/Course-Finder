import React, { useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, RefreshControl, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import SkeletonCard from '../components/SkeletonCard';
import RetryBox from '../components/RetryBox';
import CourseImage from '../components/CourseImage';
import Avatar from '../components/Avatar';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import { showToast } from '../components/Toast';
import { timeAgo } from '../utils/format';
import { prefetchImages } from '../utils/prefetch';
import { COLORS, SPACING, FONTS, RADIUS } from '../utils/theme';

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
      
      const idToFetch = targetUserId || currentUser._id;
      const [userRes, courseRes] = await Promise.all([
        isOwnProfile ? api.get('/auth/me', { signal }) : api.getUserProfile(idToFetch, { signal }),
        api.get(isOwnProfile ? '/completed/me' : `/completed/user/${idToFetch}`, { signal })
      ]);

      if (userRes.data.success) setDisplayUser(userRes.data.data);
      if (courseRes.data.success) {
        setCompleted(courseRes.data.data);
        prefetchImages(courseRes.data.data);
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError(err);
      }
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

    const updatedFollowers = isFollowing
      ? displayUser.followers.filter(f => (typeof f === 'string' ? f : f._id) !== currentUser._id)
      : [...displayUser.followers, currentUser._id];
    
    setDisplayUser({ ...displayUser, followers: updatedFollowers });

    try {
      if (isFollowing) await api.unfollowUser(displayUser._id);
      else await api.followUser(displayUser._id);
    } catch (err) {
      setDisplayUser(displayUser);
      showToast({ message: 'Action failed', type: 'error' });
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Ready to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const isFollowing = displayUser?.followers?.some(f => 
    (typeof f === 'string' ? f : f._id) === currentUser._id
  );

  const ProfileHeader = () => (
    <View style={styles.header}>
      <View style={styles.heroSection}>
        <View style={styles.topRow}>
          <Text style={styles.headerTitle}>Profile</Text>
          {isOwnProfile && (
            <TouchableOpacity style={styles.iconAction} onPress={handleLogout} activeOpacity={0.75}>
              <Ionicons name="log-out-outline" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.profileIdentity}>
          <Avatar 
            name={displayUser?.name} 
            uri={displayUser?.profilePicture} 
            size="lg"
          />
          <View style={styles.identityMeta}>
            <Text style={styles.name}>{displayUser?.name || 'Learner'}</Text>
            <Text style={styles.bio} numberOfLines={2}>{displayUser?.bio || 'Consistent learner building practical skills and sharing progress.'}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {isOwnProfile ? (
            <PrimaryButton title="Edit Profile" onPress={() => {}} variant="secondary" size="sm" style={styles.headerBtn} />
          ) : (
            <PrimaryButton 
              title={isFollowing ? 'Following' : 'Follow'} 
              onPress={handleFollow} 
              variant={isFollowing ? 'outline' : 'primary'} 
              size="sm" 
              style={styles.headerBtn} 
            />
          )}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{displayUser?.followers?.length || 0}</Text>
          <Text style={styles.statDesc}>Followers</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{completed.length}</Text>
          <Text style={styles.statDesc}>Course Logs</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{displayUser?.following?.length || 0}</Text>
          <Text style={styles.statDesc}>Following</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaItem}>Top learner status</Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.metaItem}>10 day streak</Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.metaItem}>Expert curator</Text>
      </View>

      <View style={styles.timelineHeader}>
        <SectionHeader title="Activity feed" />
      </View>
    </View>
  );

  const renderTimelineItem = ({ item }) => (
    <TouchableOpacity 
      activeOpacity={0.9}
      style={styles.timelineItem}
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
    >
      <View style={styles.timelineMarker}>
        <View style={styles.timelinePoint} />
        <View style={styles.timelineLine} />
      </View>
      
      <View style={styles.timelineCard}>
        <CourseImage uri={item.image} style={styles.timelineThumb} />
        <View style={styles.timelineInfo}>
          <View style={styles.timelineTopRow}>
            <Text style={styles.timelinePlatform}>{item.platform}</Text>
            <Text style={styles.timelineDate}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.timelineTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.timelineReview} numberOfLines={2}>{item.review || "Completed this course log."}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (error && completed.length === 0) {
    return <RetryBox message="Error loading profile" error={error} onRetry={onRefresh} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={loading ? [1, 2, 3] : completed}
        keyExtractor={(item, index) => loading ? `skel-${index}` : item.id}
        renderItem={loading ? () => <View style={{ paddingHorizontal: SPACING.xl }}><SkeletonCard variant="compact" /></View> : renderTimelineItem}
        ListHeaderComponent={<ProfileHeader />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
        ListEmptyComponent={
          !loading && (
            <EmptyState 
              icon="○"
              title="Empty Journey"
              subtitle="Start logging your courses to build your timeline."
              actionTitle="Add Course"
              onAction={() => navigation.navigate('Add')}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  list: { 
    paddingBottom: 100 
  },
  header: { 
    backgroundColor: COLORS.surface, 
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  heroSection: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerTitle: {
    ...FONTS.h2,
    color: COLORS.textPrimary,
  },
  iconAction: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  identityMeta: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  name: { 
    ...FONTS.h3,
    color: COLORS.textPrimary 
  },
  bio: { 
    ...FONTS.small,
    marginTop: 2,
    color: COLORS.textSecondary,
  },
  actionRow: { 
    marginTop: SPACING.md,
    alignItems: 'flex-start',
  },
  headerBtn: { 
    minWidth: 120,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statBox: { 
    flex: 1, 
    alignItems: 'center' 
  },
  statNumber: { 
    ...FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.textPrimary 
  },
  statDesc: { 
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 2, 
    textTransform: 'none' 
  },
  statSep: { 
    width: 1, 
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  metaRow: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  metaDot: {
    marginHorizontal: 6,
    color: COLORS.textMuted,
  },
  timelineHeader: { 
    paddingHorizontal: SPACING.xl, 
    marginTop: SPACING.md,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
  },
  timelineMarker: {
    alignItems: 'center',
    marginRight: SPACING.md,
    width: 20,
  },
  timelinePoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
    marginTop: 20,
    zIndex: 2,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  timelineLine: {
    position: 'absolute',
    top: 28,
    bottom: -20,
    width: 2,
    backgroundColor: COLORS.border,
  },
  timelineCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  timelineThumb: { 
    width: 52, 
    height: 52, 
    borderRadius: RADIUS.sm 
  },
  timelineInfo: { 
    flex: 1, 
    marginLeft: SPACING.md 
  },
  timelineTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  timelinePlatform: { 
    ...FONTS.small,
    color: COLORS.accent, 
  },
  timelineDate: {
    ...FONTS.small,
    color: COLORS.textMuted,
    textTransform: 'none',
  },
  timelineTitle: { 
    ...FONTS.bodyBold, 
    fontSize: 14, 
    color: COLORS.textPrimary 
  },
  timelineReview: { 
    ...FONTS.small,
    color: COLORS.textSecondary, 
    marginTop: 2,
  },
});

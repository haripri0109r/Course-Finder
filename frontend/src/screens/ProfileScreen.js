import React, { useContext, useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import api from '../services/api';
import SkeletonCard from '../components/SkeletonCard';
import RetryBox from '../components/RetryBox';
import CourseImage from '../components/CourseImage';
import Avatar from '../components/Avatar';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import StatsCard from '../components/StatsCard';
import { showToast } from '../components/Toast';
import { timeAgo } from '../utils/format';
import { prefetchImages } from '../utils/prefetch';
import { on as onEvent } from '../utils/eventBus';
import { SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    list: {
      paddingBottom: 112,
    },
    header: {
      backgroundColor: colors.surface,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: SPACING.md,
      ...SHADOW.xs,
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
      color: colors.textPrimary,
      fontWeight: '800',
    },
    iconRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconAction: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSubtle,
    },
    headline: {
      ...FONTS.small,
      color: colors.textSecondary,
      marginTop: SPACING.sm,
      lineHeight: 20,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: SPACING.sm,
    },
    locationText: {
      ...FONTS.small,
      color: colors.textMuted,
      marginLeft: 4,
    },
    profileIdentity: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: SPACING.md,
    },
    identityMeta: {
      marginLeft: SPACING.md,
      flex: 1,
    },
    name: {
      ...FONTS.h3,
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    bio: {
      ...FONTS.small,
      marginTop: 4,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    actionRow: {
      marginTop: SPACING.md,
      alignItems: 'flex-start',
    },
    headerBtn: {
      minWidth: 140,
    },
    statsContainer: {
      flexDirection: 'row',
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.md,
      borderRadius: RADIUS.lg,
      paddingVertical: SPACING.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSubtle,
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
    },
    statNumber: {
      ...FONTS.bodyBold,
      fontSize: 17,
      color: colors.textPrimary,
    },
    statDesc: {
      ...FONTS.small,
      color: colors.textSecondary,
      marginTop: 2,
      textTransform: 'none',
    },
    statSep: {
      width: 1,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.md,
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
      color: colors.textSecondary,
    },
    metaDot: {
      marginHorizontal: 6,
      color: colors.textMuted,
    },
    achievementSection: {
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.lg,
    },
    achievementScroll: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: SPACING.sm,
    },
    achievementChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      marginRight: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    achievementText: {
      ...FONTS.small,
      fontWeight: '600',
      marginLeft: 6,
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
      marginTop: 20,
      zIndex: 2,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    timelineLine: {
      position: 'absolute',
      top: 28,
      bottom: -20,
      width: 2,
      backgroundColor: colors.border,
    },
    timelineCard: {
      flex: 1,
      flexDirection: 'row',
      borderRadius: RADIUS.md,
      padding: SPACING.sm,
      marginBottom: SPACING.md,
      borderWidth: 1,
      alignItems: 'center',
      ...SHADOW.xs,
    },
    timelineThumb: {
      width: 52,
      height: 52,
      borderRadius: RADIUS.sm,
    },
    timelineInfo: {
      flex: 1,
      marginLeft: SPACING.md,
    },
    timelineTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    timelinePlatform: {
      ...FONTS.small,
      fontWeight: '700',
    },
    timelineDate: {
      ...FONTS.small,
      color: colors.textMuted,
      textTransform: 'none',
    },
    timelineTitle: {
      ...FONTS.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    timelineReview: {
      ...FONTS.small,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
}

export default function ProfileScreen({ route, navigation }) {
  const { user: currentUser } = useContext(AuthContext);
  const { colors, isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const targetUserId = route?.params?.userId;
  const isOwnProfile = !targetUserId || targetUserId === currentUser._id;

  const [displayUser, setDisplayUser] = useState(isOwnProfile ? currentUser : null);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Keep profile timeline + stats in sync when a completion is deleted elsewhere.
    const unsubscribe = onEvent('completionDeleted', ({ id }) => {
      if (!id) return;
      setCompleted((prev) => prev.filter((c) => String(c?.id || c?._id) !== String(id)));
    });
    return unsubscribe;
  }, []);

  const fetchProfileData = async (isRefresh = false, signal = null) => {
    try {
      setError(null);
      if (!isRefresh && completed.length === 0) setLoading(true);

      const idToFetch = targetUserId || currentUser._id;
      const [userRes, courseRes] = await Promise.all([
        isOwnProfile ? api.get('/auth/me', { signal }) : api.getUserProfile(idToFetch, { signal }),
        api.get(isOwnProfile ? '/completed/me' : `/completed/user/${idToFetch}`, { signal }),
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

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      fetchProfileData(false, controller.signal);
      return () => controller.abort();
    }, [targetUserId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfileData(true);
  };

  const handleFollow = async () => {
    if (isOwnProfile || !displayUser) return;
    const isFollowing = displayUser.followers.some(
      (f) => (typeof f === 'string' ? f : f._id) === currentUser._id
    );

    const updatedFollowers = isFollowing
      ? displayUser.followers.filter(
          (f) => (typeof f === 'string' ? f : f._id) !== currentUser._id
        )
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

  const isFollowing = displayUser?.followers?.some(
    (f) => (typeof f === 'string' ? f : f._id) === currentUser._id
  );

  const certificatesEarned = completed.filter(
    (c) => c.certificateUrl || (typeof c.certificate === 'string' && c.certificate)
  ).length;
  const platformsUsed = new Set(completed.map((c) => c.platform).filter(Boolean)).size;
  const learningHoursEstimate = Math.min(completed.length * 12, 999);

  const achievements = [
    {
      id: 'cert1',
      title: 'First certificate',
      icon: 'ribbon-outline',
      unlocked: certificatesEarned >= 1,
    },
    {
      id: 'c10',
      title: '10 courses logged',
      icon: 'library-outline',
      unlocked: completed.length >= 10,
    },
    {
      id: 'hrs',
      title: '50h learning (est.)',
      icon: 'time-outline',
      unlocked: learningHoursEstimate >= 50,
    },
    {
      id: 'streak',
      title: 'Streak milestone',
      icon: 'flame-outline',
      unlocked: completed.length >= 5,
    },
  ];

  const ProfileHeader = () => (
    <View style={styles.header}>
      <View style={styles.heroSection}>
        <View style={styles.topRow}>
          <Text style={styles.headerTitle}>Profile</Text>
          {isOwnProfile ? (
            <View style={styles.iconRow}>
              <TouchableOpacity
                style={[styles.iconAction, { marginRight: 8 }]}
                onPress={toggleTheme}
                accessibilityLabel="Toggle dark mode"
              >
                <Ionicons
                  name={isDark ? 'sunny-outline' : 'moon-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconAction}
                onPress={() => navigation.navigate('Settings')}
                accessibilityLabel="Open settings"
              >
                <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <Text style={styles.headline}>
          Showcase certifications, streaks, and the platforms where you ship skills.
        </Text>

        <View style={styles.profileIdentity}>
          <Avatar name={displayUser?.name} uri={displayUser?.profilePicture} size="lg" />
          <View style={styles.identityMeta}>
            <Text style={styles.name}>{displayUser?.name || 'Learner'}</Text>
            <Text style={styles.bio} numberOfLines={3}>
              {displayUser?.bio ||
                'Building a public record of courses, certificates, and craft — like LinkedIn for learning wins.'}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={styles.locationText}>Global · Remote-first learner</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          {isOwnProfile ? (
            <PrimaryButton
              title="Edit profile"
              onPress={() => navigation.navigate('ProfileEdit')}
              variant="secondary"
              size="sm"
              style={styles.headerBtn}
            />
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
          <Text style={styles.statDesc}>Courses</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{displayUser?.following?.length || 0}</Text>
          <Text style={styles.statDesc}>Following</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatsCard
          icon="checkmark-done-outline"
          label="Completed logs"
          value={String(completed.length)}
          colors={colors}
          style={{ width: '48%' }}
        />
        <StatsCard
          icon="ribbon-outline"
          label="Certificates"
          value={String(certificatesEarned)}
          colors={colors}
          style={{ width: '48%' }}
        />
        <StatsCard
          icon="time-outline"
          label="Learning hours (est.)"
          value={`${learningHoursEstimate}h`}
          colors={colors}
          style={{ width: '48%' }}
        />
        <StatsCard
          icon="layers-outline"
          label="Platforms used"
          value={String(platformsUsed)}
          colors={colors}
          style={{ width: '48%' }}
        />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaItem}>Learning streak · 12 days (demo)</Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.metaItem}>Top learner badge</Text>
      </View>

      <View style={styles.achievementSection}>
        <SectionHeader title="Achievements" subtitle="Unlock milestones as you log proof of learning" />
        <View style={styles.achievementScroll}>
          {achievements.map((a) => (
            <View
              key={a.id}
              style={[
                styles.achievementChip,
                {
                  borderColor: a.unlocked ? colors.success : colors.border,
                  backgroundColor: a.unlocked ? colors.successSoft : colors.surfaceSubtle,
                  opacity: a.unlocked ? 1 : 0.55,
                },
              ]}
            >
              <Ionicons
                name={a.icon}
                size={14}
                color={a.unlocked ? colors.success : colors.textMuted}
              />
              <Text
                style={[
                  styles.achievementText,
                  { color: a.unlocked ? colors.success : colors.textMuted },
                ]}
              >
                {a.title}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.timelineHeader}>
        <SectionHeader title="Activity" subtitle="Your published learning logs" />
      </View>
    </View>
  );

  const renderTimelineItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.timelineItem}
      onPress={() =>
        navigation.navigate('PostDetail', { postId: item.id || item._id })
      }
    >
      <View style={styles.timelineMarker}>
        <View style={[styles.timelinePoint, { backgroundColor: colors.accent }]} />
        <View style={styles.timelineLine} />
      </View>

      <View
        style={[
          styles.timelineCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <CourseImage uri={item.image} style={styles.timelineThumb} />
        <View style={styles.timelineInfo}>
          <View style={styles.timelineTopRow}>
            <Text style={[styles.timelinePlatform, { color: colors.accent }]}>
              {item.platform}
            </Text>
            <Text style={styles.timelineDate}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.timelineTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.timelineReview} numberOfLines={2}>
            {item.review || 'Shared a course completion.'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (error && completed.length === 0) {
    return <RetryBox message="Error loading profile" error={error} onRetry={onRefresh} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <FlatList
        data={loading ? [1, 2, 3] : completed}
        keyExtractor={(item, index) => (loading ? `skel-${index}` : String(item.id || item._id))}
        renderItem={
          loading
            ? () => (
                <View style={{ paddingHorizontal: SPACING.xl }}>
                  <SkeletonCard variant="compact" />
                </View>
              )
            : renderTimelineItem
        }
        ListHeaderComponent={<ProfileHeader />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          !loading && (
            <EmptyState
              title="Start your learning story"
              subtitle="Log a course completion to populate your professional timeline."
              actionTitle="Add course"
              onAction={() => navigation.navigate('Add')}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

import React, { useState, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { AuthContext } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import api from '../services/api';
import CourseCard from '../components/CourseCard';
import SkeletonCard from '../components/SkeletonCard';
import Avatar from '../components/Avatar';
import SectionHeader from '../components/SectionHeader';
import CourseImage from '../components/CourseImage';
import EmptyState from '../components/EmptyState';
import RetryBox from '../components/RetryBox';
import ProgressRing from '../components/ProgressRing';
import GlassCard from '../components/GlassCard';
import { prefetchImages } from '../utils/prefetch';
import { on as onEvent } from '../utils/eventBus';
import { SPACING, FONTS, RADIUS, SHADOW, createShadows } from '../utils/theme';
import { triggerHaptic } from '../utils/haptics';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const shadows = useMemo(() => createShadows(colors), [colors]);
  const s = useMemo(() => createStyles(colors, isDark, shadows), [colors, isDark, shadows]);
  const { user: currentUser, bookmarks, toggleBookmark } = useContext(AuthContext);
  const [cursor, setCursor] = useState(null);
  const [posts, setPosts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const fetchingRef = useRef(false);
  const abortRef = useRef(null);

  const postKey = useCallback((item) => item?.id || item?._id, []);

  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (fetchingRef.current) return;
    if (!isRefresh && cursor === null && posts.length > 0) return;

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const targetCursor = isRefresh ? null : cursor;
      const res = await api.getRecentActivity(targetCursor);
      const newPosts = res.data?.posts || [];
      const nextCursor = res.data?.nextCursor || null;

      setPosts((prev) => {
        if (isRefresh) return newPosts;
        const existingIds = new Set(prev.map((p) => p._id || p.id));
        const filtered = newPosts.filter((p) => !existingIds.has(p._id || p.id));
        return [...prev, ...filtered];
      });

      setCursor(nextCursor);
      prefetchImages(newPosts);
    } catch (err) {
      if (err?.name !== 'CanceledError') {
        setError(err?.message || 'Failed to load feed');
        console.log('Feed fetch error:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      fetchingRef.current = false;
    }
  }, [cursor, posts.length]);

  useEffect(() => {
    fetchPosts(true);
    const syncTrending = async () => {
      try {
        const trendRes = await api.getTrending();
        if (trendRes?.data?.success) setTrending(trendRes.data.data);
      } catch (e) {
        console.log('Trending sync failed', e);
      }
    };
    syncTrending();
  }, []);

  useEffect(() => {
    const unsubscribe = onEvent('completionDeleted', ({ id }) => {
      if (!id) return;
      setPosts((prev) => prev.filter((p) => (p?._id || p?.id) !== id));
      setTrending((prev) => prev.filter((t) => (t?._id || t?.id) !== id));
    });
    return unsubscribe;
  }, []);

  const onRefresh = () => {
    triggerHaptic('impactLight');
    setRefreshing(true);
    fetchPosts(true);
  };

  const handleLike = async (item) => {
    triggerHaptic('impactLight');
    const id = postKey(item);
    const isLiked = item.isLikedByMe;
    setPosts((prev) =>
      prev.map((a) =>
        (a._id || a.id) === (item._id || item.id)
          ? {
              ...a,
              isLikedByMe: !isLiked,
              likesCount: isLiked ? a.likesCount - 1 : a.likesCount + 1,
            }
          : a
      )
    );

    try {
      if (isLiked) await api.unlikeCompletion(id);
      else await api.likeCompletion(id);
    } catch (err) {
      // rollback optional
    }
  };

  const firstName = (currentUser?.name || 'Learner').split(' ')[0];

  // ─── Hero Section ──────────────────────────────────────────────
  const Header = useMemo(() => () => (
    <View style={s.header}>
      {/* Nav Bar */}
      <Animated.View entering={FadeInDown.duration(300)} style={s.navBar}>
        <View style={s.userSection}>
          <Avatar name={currentUser?.name} size="md" />
          <View style={s.greetingWrap}>
            <Text style={s.greeting}>{getGreeting()},</Text>
            <Text style={s.userName}>{firstName}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={s.notifBtn}
          onPress={() => navigation.navigate('Inbox')}
          activeOpacity={0.75}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          <View style={s.notifDot} />
        </TouchableOpacity>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View entering={FadeInDown.delay(80).duration(300)}>
        <TouchableOpacity
          style={s.searchBar}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.85}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <Text style={s.searchText}>Search courses, skills, people...</Text>
          <View style={s.searchShortcut}>
            <Ionicons name="mic-outline" size={14} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Learning Progress Card */}
      <Animated.View entering={FadeInDown.delay(160).duration(300)} style={s.progressSection}>
        <GlassCard glow>
          <View style={s.progressRow}>
            <View style={s.progressMeta}>
              <Text style={s.progressEyebrow}>THIS WEEK</Text>
              <Text style={s.progressTitle}>Keep the momentum</Text>
              <Text style={s.progressSub}>Log courses to build your streak</Text>
            </View>
            <ProgressRing progress={40} size={56} strokeWidth={4} showLabel />
          </View>
        </GlassCard>
      </Animated.View>

      {/* Hero Featured Course */}
      {trending.length > 0 && (
        <Animated.View entering={FadeInDown.delay(240).duration(300)} style={s.heroSection}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={s.heroCard}
            onPress={() =>
              navigation.navigate('PostDetail', {
                postId: trending[0].id || trending[0]._id,
              })
            }
          >
            <CourseImage uri={trending[0].image} style={s.heroImage} />
            <View style={s.heroOverlay} />
            <View style={s.heroContent}>
              <View style={s.heroBadge}>
                <Ionicons name="trending-up" size={12} color={colors.white} />
                <Text style={s.heroBadgeText}>TRENDING</Text>
              </View>
              <Text style={s.heroTitle} numberOfLines={2}>
                {trending[0].title}
              </Text>
              <View style={s.heroMeta}>
                <Text style={s.heroPlatform}>{trending[0].platform}</Text>
                {trending[0].duration && (
                  <>
                    <View style={s.heroDot} />
                    <Text style={s.heroDuration}>{trending[0].duration}</Text>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Trending Horizontal Strip */}
      {trending.length > 1 && (
        <Animated.View entering={FadeInDown.delay(320).duration(300)} style={s.moduleSection}>
          <SectionHeader
            title="Trending now"
            subtitle="Popular in your network"
            actionLabel="See all"
            onAction={() => navigation.navigate('Search')}
          />
          <FlatList
            horizontal
            data={trending.slice(1, 7)}
            keyExtractor={(item, index) => `trend-${item?.id || item?._id || index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.trendingList}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInUp.delay(380 + Math.min(index * 60, 240)).duration(250)}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={s.trendItem}
                  onPress={() =>
                    navigation.navigate('PostDetail', {
                      postId: item.id || item._id,
                    })
                  }
                >
                  <CourseImage uri={item.image} style={s.trendImage} />
                  <View style={s.trendContent}>
                    <Text style={s.trendPlatform}>{item.platform}</Text>
                    <Text style={s.trendTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.duration && (
                      <Text style={s.trendMeta}>{item.duration}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}
          />
        </Animated.View>
      )}

      {/* Feed Section Header */}
      <Animated.View entering={FadeInDown.delay(400).duration(300)} style={s.feedHeader}>
        <SectionHeader title="Feed" subtitle="From your network" />
      </Animated.View>
    </View>
  ), [s, colors, currentUser, trending, navigation, firstName]);

  // ─── Feed Item ─────────────────────────────────────────────────
  const renderFeedItem = useCallback(
    ({ item, index }) => (
      <Animated.View
        entering={FadeInUp.delay(Math.min(index * 50, 200)).duration(250).springify().damping(18)}
        layout={Layout.springify().damping(18)}
        style={s.feedCardWrap}
      >
        <CourseCard
          item={item}
          onBookmark={() => { triggerHaptic('impactMedium'); toggleBookmark(postKey(item)); }}
          onLike={() => handleLike(item)}
          isBookmarked={bookmarks.has(postKey(item))}
          onDeleted={(deletedId) => {
            setPosts((prev) => prev.filter((p) => (p?._id || p?.id) !== deletedId));
            setTrending((prev) => prev.filter((t) => (t?._id || t?.id) !== deletedId));
          }}
        />
      </Animated.View>
    ),
    [bookmarks, colors]
  );

  const renderSkeleton = useCallback(
    ({ index }) => (
      <View style={s.feedCardWrap}>
        <SkeletonCard />
      </View>
    ),
    [colors]
  );

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <FlatList
        data={loading && posts.length === 0 ? [1, 2, 3] : posts}
        keyExtractor={(item, index) =>
          loading && posts.length === 0
            ? `skel-${index}`
            : String(item?._id || item?.id || index)
        }
        renderItem={loading && posts.length === 0 ? renderSkeleton : renderFeedItem}
        ListHeaderComponent={<Header />}
        contentContainerStyle={[s.listContent, { paddingBottom: Math.max(insets.bottom, 12) + 68 + 24 }]}
        showsVerticalScrollIndicator={false}
        onEndReached={() => fetchPosts()}
        onEndReachedThreshold={0.5}
        removeClippedSubviews
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          !loading && error ? (
            <RetryBox
              message="Couldn't load your feed"
              error={error}
              onRetry={() => fetchPosts(true)}
            />
          ) : !loading ? (
            <EmptyState
              title="Your feed is quiet"
              subtitle="When people you follow share courses and certificates, they'll appear here."
              actionTitle="Explore"
              onAction={() => navigation.navigate('Search')}
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function createStyles(colors, isDark, shadows) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      // paddingBottom applied inline to account for floating tab bar + safe area
    },
    header: {
      backgroundColor: colors.background,
      paddingTop: SPACING.md,
    },

    // ─── Nav Bar ───
    navBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
    },
    userSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    greetingWrap: {
      marginLeft: SPACING.md,
    },
    greeting: {
      ...FONTS.small,
      color: colors.textMuted,
    },
    userName: {
      ...FONTS.h2,
      color: colors.textPrimary,
      marginTop: 1,
    },
    notifBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    notifDot: {
      position: 'absolute',
      top: 12,
      right: 14,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.danger,
    },

    // ─── Search Bar ───
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      height: 48,
      borderRadius: RADIUS.lg,
      paddingHorizontal: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: SPACING.xl,
      marginTop: SPACING.sm,
    },
    searchText: {
      ...FONTS.body,
      color: colors.textMuted,
      fontSize: 14,
      flex: 1,
      marginLeft: SPACING.sm,
    },
    searchShortcut: {
      width: 28,
      height: 28,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.surfaceSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ─── Progress Card ───
    progressSection: {
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.lg,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressMeta: {
      flex: 1,
      paddingRight: SPACING.lg,
    },
    progressEyebrow: {
      ...FONTS.tiny,
      color: colors.accent,
      marginBottom: 6,
    },
    progressTitle: {
      ...FONTS.h3,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    progressSub: {
      ...FONTS.small,
      color: colors.textSecondary,
    },

    // ─── Hero Featured Course ───
    heroSection: {
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.xl,
    },
    heroCard: {
      borderRadius: RADIUS.xl,
      overflow: 'hidden',
      height: 200,
      ...SHADOW.lg,
    },
    heroImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    heroContent: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      padding: SPACING.lg,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: RADIUS.full,
      marginBottom: SPACING.sm,
      gap: 4,
    },
    heroBadgeText: {
      ...FONTS.tiny,
      color: colors.white,
      fontSize: 10,
    },
    heroTitle: {
      ...FONTS.h2,
      color: '#FFFFFF',
      marginBottom: 6,
    },
    heroMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    heroPlatform: {
      ...FONTS.small,
      color: 'rgba(255,255,255,0.8)',
    },
    heroDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.5)',
      marginHorizontal: 8,
    },
    heroDuration: {
      ...FONTS.small,
      color: 'rgba(255,255,255,0.8)',
    },

    // ─── Trending Section ───
    moduleSection: {
      marginTop: SPACING.xl,
      paddingHorizontal: SPACING.xl,
    },
    trendingList: {
      paddingBottom: SPACING.sm,
    },
    trendItem: {
      width: 200,
      borderRadius: RADIUS.lg,
      marginRight: SPACING.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    trendImage: {
      width: '100%',
      height: 100,
      resizeMode: 'cover',
    },
    trendContent: {
      padding: SPACING.md,
    },
    trendPlatform: {
      ...FONTS.tiny,
      color: colors.accent,
      marginBottom: 4,
    },
    trendTitle: {
      ...FONTS.captionBold,
      color: colors.textPrimary,
      lineHeight: 18,
    },
    trendMeta: {
      ...FONTS.small,
      color: colors.textMuted,
      marginTop: 6,
    },

    // ─── Feed Section ───
    feedHeader: {
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    feedCardWrap: {
      paddingHorizontal: SPACING.xl,
      marginBottom: SPACING.md,
    },
  });
}

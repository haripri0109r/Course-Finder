import React, { useState, useContext, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import api from '../services/api';
import CourseCard from '../components/CourseCard';
import SkeletonCard from '../components/SkeletonCard';
import Avatar from '../components/Avatar';
import SectionHeader from '../components/SectionHeader';
import CourseImage from '../components/CourseImage';
import EmptyState from '../components/EmptyState';
import { prefetchImages } from '../utils/prefetch';
import { on as onEvent } from '../utils/eventBus';
import { SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      paddingBottom: 120,
    },
    header: {
      backgroundColor: colors.background,
      paddingBottom: SPACING.sm,
      marginBottom: SPACING.md,
    },
    navBar: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.sm,
    },
    userSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    appTitle: {
      ...FONTS.bodyBold,
      fontSize: 17,
      marginLeft: SPACING.sm,
      color: colors.textPrimary,
    },
    appEyebrow: {
      ...FONTS.tiny,
      color: colors.textMuted,
      marginLeft: SPACING.sm,
      marginTop: 2,
      letterSpacing: 1.2,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      height: 44,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: SPACING.xl,
      ...SHADOW.sm,
    },
    searchIcon: {
      marginRight: SPACING.sm,
      fontSize: 18,
      color: colors.textSecondary,
    },
    searchText: {
      ...FONTS.body,
      color: colors.textSecondary,
      fontSize: 14,
    },
    moduleSection: {
      marginTop: SPACING.md,
      paddingHorizontal: SPACING.xl,
    },
    continueRow: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.lg,
      backgroundColor: colors.surface,
      padding: SPACING.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    continueMeta: {
      flex: 1,
      paddingRight: SPACING.sm,
    },
    continueEyebrow: {
      ...FONTS.tiny,
      color: colors.accent,
      marginBottom: 4,
    },
    continueTitle: {
      ...FONTS.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    continueSub: {
      ...FONTS.small,
      color: colors.textSecondary,
      marginTop: 4,
    },
    playBtn: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSubtle,
    },
    trendingList: {
      paddingBottom: SPACING.xs,
    },
    trendItem: {
      width: 216,
      borderRadius: RADIUS.lg,
      marginRight: SPACING.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      paddingBottom: SPACING.sm,
    },
    trendImage: {
      width: '100%',
      height: 112,
      resizeMode: 'cover',
    },
    trendTitle: {
      ...FONTS.captionBold,
      color: colors.textPrimary,
      fontSize: 13,
      marginTop: SPACING.sm,
      marginHorizontal: SPACING.sm,
    },
    trendSub: {
      ...FONTS.small,
      color: colors.textSecondary,
      marginTop: 4,
      marginHorizontal: SPACING.sm,
    },
    feedHeader: {
      paddingHorizontal: SPACING.xl,
      marginTop: SPACING.sm,
    },
  });
}

export default function HomeScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user: currentUser, bookmarks, toggleBookmark } = useContext(AuthContext);
  const [cursor, setCursor] = useState(null);
  const [posts, setPosts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const postKey = (item) => item?.id || item?._id;

  const fetchPosts = async (isRefresh = false) => {
    try {
      if (!isRefresh && cursor === null && posts.length > 0) return;
      if (loading) return;

      setLoading(true);
      const targetCursor = isRefresh ? '' : cursor || '';
      const res = await api.get(`/posts/feed?cursor=${targetCursor}`);
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
    } catch (error) {
      console.log('Feed fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
    // Keep feed in sync when a completion is deleted elsewhere (e.g., detail screen).
    const unsubscribe = onEvent('completionDeleted', ({ id }) => {
      if (!id) return;
      setPosts((prev) => prev.filter((p) => (p?._id || p?.id) !== id));
      setTrending((prev) => prev.filter((t) => (t?._id || t?.id) !== id));
    });
    return unsubscribe;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(true);
  };

  const handleLike = async (item) => {
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

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.navBar}>
        <View style={styles.userSection}>
          <Avatar name={currentUser?.name} size="sm" />
          <View>
            <Text style={styles.appTitle}>Course Finder</Text>
            <Text style={styles.appEyebrow}>LEARNING NETWORK</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.navigate('Search')}
        activeOpacity={0.85}
      >
        <Ionicons name="search-outline" style={styles.searchIcon} />
        <Text style={styles.searchText}>Search courses, skills, authors</Text>
      </TouchableOpacity>

      <View style={styles.moduleSection}>
        <SectionHeader
          title="Continue learning"
          subtitle="Pick up momentum"
          actionLabel="Saved"
          onAction={() => navigation.navigate('Saved')}
        />
        <View style={styles.continueRow}>
          <View style={styles.continueMeta}>
            <Text style={styles.continueEyebrow}>IN PROGRESS</Text>
            <Text style={styles.continueTitle}>Your next milestone</Text>
            <Text style={styles.continueSub}>
              Resume where you left off or explore recommendations.
            </Text>
          </View>
          <TouchableOpacity style={styles.playBtn} activeOpacity={0.75}>
            <Ionicons name="play" size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {trending.length > 0 && (
        <View style={styles.moduleSection}>
          <SectionHeader
            title="Recommended for you"
            actionLabel="Explore"
            onAction={() => navigation.navigate('Search')}
          />
          <FlatList
            horizontal
            data={trending}
            keyExtractor={(item, index) =>
              `trend-${item?.id || item?._id || index}`
            }
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingList}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.trendItem}
                onPress={() =>
                  navigation.navigate('PostDetail', {
                    postId: item.id || item._id,
                  })
                }
              >
                <CourseImage uri={item.image} style={styles.trendImage} />
                <Text style={styles.trendTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.trendSub}>
                  {item.platform} · {item.duration || 'Course'}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.feedHeader}>
        <SectionHeader title="Feed" subtitle="Achievements from your network" />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <FlatList
        data={loading && posts.length === 0 ? [1, 2, 3] : posts}
        keyExtractor={(item, index) =>
          loading && posts.length === 0
            ? `skel-${index}`
            : String(item?._id || item?.id || index)
        }
        renderItem={({ item }) =>
          loading && posts.length === 0 ? (
            <View style={{ paddingHorizontal: SPACING.xl }}>
              <SkeletonCard />
            </View>
          ) : (
            <View style={{ paddingHorizontal: SPACING.xl }}>
              <CourseCard
                item={item}
                onBookmark={() => toggleBookmark(postKey(item))}
                onLike={() => handleLike(item)}
                isBookmarked={bookmarks.has(postKey(item))}
                onDeleted={(deletedId) => {
                  setPosts((prev) => prev.filter((p) => (p?._id || p?.id) !== deletedId));
                  setTrending((prev) => prev.filter((t) => (t?._id || t?.id) !== deletedId));
                }}
              />
            </View>
          )
        }
        ListHeaderComponent={<Header />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={() => fetchPosts()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          !loading && (
            <EmptyState
              title="Your feed is quiet"
              subtitle="When people you follow share courses and certificates, they’ll appear here."
              actionTitle="Explore"
              onAction={() => navigation.navigate('Search')}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

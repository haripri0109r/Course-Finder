import React, { useState, useContext, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import CourseCard from '../components/CourseCard';
import SkeletonCard from '../components/SkeletonCard';
import Avatar from '../components/Avatar';
import SectionHeader from '../components/SectionHeader';
import CourseImage from '../components/CourseImage';
import EmptyState from '../components/EmptyState';
import { prefetchImages } from '../utils/prefetch';
import { COLORS, SPACING, FONTS, RADIUS } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const { user: currentUser, bookmarks, toggleBookmark } = useContext(AuthContext);
  const [cursor, setCursor] = useState(null);
  const [posts, setPosts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async (isRefresh = false) => {
    try {
      if (!isRefresh && cursor === null && posts.length > 0) return;
      if (loading) return;
      
      setLoading(true);
      const targetCursor = isRefresh ? "" : (cursor || "");
      const res = await api.get(`/posts/feed?cursor=${targetCursor}`);
      const newPosts = res.data?.posts || [];
      const nextCursor = res.data?.nextCursor || null;

      setPosts(prev => {
        if (isRefresh) return newPosts;
        const existingIds = new Set(prev.map(p => p._id));
        const filtered = newPosts.filter(p => !existingIds.has(p._id));
        return [...prev, ...filtered];
      });

      setCursor(nextCursor);
      prefetchImages(newPosts);
    } catch (error) {
      console.log("Feed fetch error:", error);
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
        console.log("Trending sync failed", e);
      }
    };
    syncTrending();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(true);
  };

  const handleLike = async (item) => {
    const isLiked = item.isLikedByMe;
    setPosts(prev => prev.map(a => 
      a._id === item._id 
        ? { ...a, isLikedByMe: !isLiked, likesCount: isLiked ? a.likesCount - 1 : a.likesCount + 1 }
        : a
    ));

    try {
      if (isLiked) await api.unlikeCompletion(item.id);
      else await api.likeCompletion(item.id);
    } catch (err) {
      // Rollback logic could go here
    }
  };

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.navBar}>
        <View style={styles.userSection}>
          <Avatar name={currentUser?.name} size="sm" />
          <Text style={styles.appTitle}>Course Finder</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn} onPress={() => navigation.navigate('Inbox')}>
          <Ionicons name="notifications-outline" size={18} color={COLORS.textPrimary} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Search')} activeOpacity={0.85}>
        <Ionicons name="search-outline" style={styles.searchIcon} />
        <Text style={styles.searchText}>Search courses, skills, authors</Text>
      </TouchableOpacity>

      <View style={styles.moduleSection}>
        <SectionHeader title="Continue learning" actionLabel="Open" onAction={() => navigation.navigate('Saved')} />
        <View style={styles.continueRow}>
          <View style={styles.continueMeta}>
            <Text style={styles.continueTitle}>Frontend Architecture Fundamentals</Text>
            <Text style={styles.continueSub}>45 min remaining · 7/12 lessons</Text>
          </View>
          <TouchableOpacity style={styles.playBtn} activeOpacity={0.75}>
            <Ionicons name="play" size={14} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {trending.length > 0 && (
        <View style={styles.moduleSection}>
          <SectionHeader title="Recommended courses" actionLabel="See all" onAction={() => navigation.navigate('Search')} />
          <FlatList
            horizontal
            data={trending}
            keyExtractor={(item, index) => `trend-${item?.id || item?._id || index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingList}
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.9} style={styles.trendItem} onPress={() => navigation.navigate('PostDetail', { postId: item.id })}>
                <CourseImage uri={item.image} style={styles.trendImage} />
                <Text style={styles.trendTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.trendSub}>{item.platform} · {item.duration || 'Course'}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.feedHeader}>
        <SectionHeader title="Community feed" />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={(loading && posts.length === 0) ? [1, 2, 3] : posts}
        keyExtractor={(item, index) => (loading && posts.length === 0) ? `skel-${index}` : (item?._id || item?.id || index).toString()}
        renderItem={({ item }) => 
          (loading && posts.length === 0) ? (
            <View style={{ paddingHorizontal: SPACING.xl }}>
              <SkeletonCard />
            </View>
          ) : (
            <View style={{ paddingHorizontal: SPACING.xl }}>
              <CourseCard
                item={item}
                onBookmark={() => toggleBookmark(item.id)}
                onLike={() => handleLike(item)}
                isBookmarked={bookmarks.has(item.id)}
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
        ListEmptyComponent={
          !loading && (
            <EmptyState 
              icon="○"
              title="Your feed is quiet"
              subtitle="Follow more learners to see their progress here."
              actionTitle="Explore"
              onAction={() => navigation.navigate('Search')}
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
  listContent: { 
    paddingBottom: 84,
  },
  header: { 
    backgroundColor: COLORS.background,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.md,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  userSection: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  appTitle: {
    ...FONTS.bodyBold,
    fontSize: 16,
    marginLeft: SPACING.sm,
    color: COLORS.textPrimary,
  },
  notificationBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
    borderWidth: 1,
    borderColor: COLORS.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    height: 42,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { 
    marginRight: SPACING.md, 
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  searchText: { 
    ...FONTS.body, 
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  moduleSection: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  continueRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  continueMeta: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  continueTitle: {
    ...FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  continueSub: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  trendingList: { 
    paddingBottom: SPACING.xs, 
  },
  trendItem: {
    width: 210,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    paddingBottom: SPACING.sm,
  },
  trendImage: { 
    width: '100%', 
    height: 108,
    resizeMode: 'cover',
  },
  trendTitle: { 
    ...FONTS.captionBold,
    color: COLORS.textPrimary, 
    fontSize: 13,
    marginTop: SPACING.sm,
    marginHorizontal: SPACING.sm,
  },
  trendSub: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginHorizontal: SPACING.sm,
  },
  feedHeader: { 
    paddingHorizontal: SPACING.xl, 
    marginTop: SPACING.sm,
  },
});

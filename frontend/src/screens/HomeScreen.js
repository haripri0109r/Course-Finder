import React, { useState, useCallback, useContext, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import CourseCard from '../components/CourseCard';
import SkeletonCard from '../components/SkeletonCard';
import RetryBox from '../components/RetryBox';
import AnimatedPressable from '../components/AnimatedPressable';
import { showToast } from '../components/Toast';
import CourseImage from '../components/CourseImage';
import { prefetchImages } from '../utils/prefetch';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const { user: currentUser, bookmarks, toggleBookmark } = useContext(AuthContext);
  const [recommended, setRecommended] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [posts, setPosts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchPosts = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const res = await api.get("/posts/feed", {
        params: {
          cursor,
          limit: 10
        }
      });

      console.log("Feed API Response:", res.data);

      const newPosts = res.data?.posts || [];

      if (!Array.isArray(newPosts)) {
        console.error("Invalid posts format");
        return;
      }

      setPosts(prev => [...prev, ...newPosts]);
      setCursor(res.data?.nextCursor || null);
      
      // Prefetch images for smoother scrolling
      prefetchImages(newPosts);

    } catch (error) {
      console.log("Feed fetch error:", error);
      setError(error);
      showToast('Could not sync latest activity', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🚀 Cursors are now handled via loadMore -> fetchData(false)

  useEffect(() => {
    fetchPosts();
    
    // Periodically sync trending completions independently
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

  const onRefresh = async () => {
    setRefreshing(true);
    setCursor(null);
    setPosts([]); 
    await fetchPosts();
    setRefreshing(false);
  };

  const handleLike = async (item) => {
    const isLiked = item.isLikedByMe;
    
    // Optimistic UI update
    setPosts(prev => prev.map(a => 
      a.id === item.id 
        ? { ...a, isLikedByMe: !isLiked, likesCount: isLiked ? a.likesCount - 1 : a.likesCount + 1 }
        : a
    ));

    try {
      if (isLiked) await api.unlikeCompletion(item.id);
      else await api.likeCompletion(item.id);
    } catch (err) {
      // Revert if silent refresh or error handling is needed
      fetchPosts(true); 
      showToast('Interaction failed', 'error');
    }
  };

  const Header = () => (
    <View style={styles.headerBlock}>
      <Text style={styles.greeting}>Good day 👋</Text>
      <Text style={styles.headline}>Learning Feed</Text>
      
      {trending.length > 0 && (
        <>
          <View style={styles.trendHeader}>
            <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
            <View style={styles.trendLive} />
          </View>
          <FlatList
            horizontal
            data={trending}
            keyExtractor={item => `trend-${item.id}`}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <AnimatedPressable 
                style={styles.trendCard} 
                onPress={() => navigation.navigate('CompletionDetail', { id: item.id })}
                scaleTo={0.95}
              >
                <CourseImage uri={item.image} style={styles.trendThumb} />
                <View style={styles.trendOverlay}>
                  <Text style={styles.trendTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.trendMeta}>{item.viewsCount} views</Text>
                </View>
              </AnimatedPressable>
            )}
            contentContainerStyle={styles.horizontalList}
          />
        </>
      )}

      <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Community Activity</Text>
    </View>
  );

  const Footer = () => {
    if (!loading || (loading && posts.length === 0)) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={COLORS.primary} size="small" />
      </View>
    );
  };

  if (error && posts.length === 0) {
    return <RetryBox message="Unable to load your feed" error={error} onRetry={() => fetchPosts(true)} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={loading && posts.length === 0 ? [1, 2, 3] : posts}
        keyExtractor={(item) => (loading && posts.length === 0) ? `skel-${Math.random()}` : item._id}
        renderItem={({ item }) => 
          loading ? (
            <SkeletonCard />
          ) : (
            <CourseCard
              item={item}
              onBookmark={() => toggleBookmark(item.id)}
              onLike={() => handleLike(item)}
              isBookmarked={bookmarks.has(item.id)}
            />
          )
        }
        ListHeaderComponent={<Header />}
        ListFooterComponent={<Footer />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={fetchPosts}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.primary} 
            colors={[COLORS.primary]} 
          />
        }
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListEmptyComponent={
          !loading && posts.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>📬</Text>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySubtitle}>Follow users to see their learning journey!</Text>
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
  headerBlock: { paddingTop: 60, marginBottom: SPACING.lg },
  greeting: { ...FONTS.caption, fontSize: 16, marginBottom: SPACING.xs },
  headline: { ...FONTS.h1, marginBottom: SPACING.xl },
  sectionTitle: { ...FONTS.h3, marginBottom: SPACING.md },
  horizontalList: { paddingRight: SPACING.xl, marginBottom: SPACING.md },
  trendHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  trendLive: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger, marginLeft: 8 },
  trendCard: {
    width: 240,
    height: 140,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.md,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  trendThumb: { width: '100%', height: '100%' },
  trendOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  trendTitle: { color: COLORS.white, ...FONTS.bodyBold, fontSize: 14 },
  trendMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
  footerLoader: { paddingVertical: SPACING.xxl, alignItems: 'center' },
  emptyBox: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 60, marginBottom: SPACING.md, opacity: 0.5 },
  emptyTitle: { ...FONTS.h3, marginBottom: SPACING.xs },
  emptySubtitle: { ...FONTS.caption, fontSize: 15, textAlign: 'center' },
});

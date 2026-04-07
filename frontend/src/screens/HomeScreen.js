import React, { useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import CourseCard from '../components/CourseCard';
import SkeletonCard from '../components/SkeletonCard';
import RetryBox from '../components/RetryBox';
import AnimatedPressable from '../components/AnimatedPressable';
import { showToast } from '../components/Toast';
import { prefetchImages } from '../utils/prefetch';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const { user: currentUser, bookmarks, toggleBookmark } = useContext(AuthContext);
  const [recommended, setRecommended] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (isRefresh = false, signal) => {
    try {
      setError(null);
      if (!isRefresh && activity.length === 0) setLoading(true);
      const startTime = Date.now();
      
      const [recRes, actRes] = await Promise.all([
        api.get('/courses/recommended', { signal }),
        api.getRecentActivity(1) // Page 1 for freshness
      ]);

      if (recRes.data.success) setRecommended(recRes.data.courses);
      
      if (actRes.data.success) {
        const flatData = actRes.data.data;
        setActivity(flatData);
        // Optimize UX: Prefetch images in background
        prefetchImages(flatData);
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));

    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      setError(err);
      showToast('Could not sync latest activity', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      fetchData(false, controller.signal);
      return () => controller.abort();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleLike = async (item) => {
    const isLiked = item.isLikedByMe;
    
    // Optimistic UI update
    setActivity(prev => prev.map(a => 
      a.id === item.id 
        ? { ...a, isLikedByMe: !isLiked, likesCount: isLiked ? a.likesCount - 1 : a.likesCount + 1 }
        : a
    ));

    try {
      if (isLiked) await api.unlikeCompletion(item.id);
      else await api.likeCompletion(item.id);
    } catch (err) {
      // Revert if silent refresh or error handling is needed
      fetchData(true); 
      showToast('Interaction failed', 'error');
    }
  };

  const Header = () => (
    <View style={styles.headerBlock}>
      <Text style={styles.greeting}>Good day 👋</Text>
      <Text style={styles.headline}>Learning Feed</Text>
      
      <Text style={styles.sectionTitle}>Pick a New Course</Text>
      <FlatList
        horizontal
        data={recommended}
        keyExtractor={item => item._id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <AnimatedPressable 
            style={styles.recCard} 
            onPress={() => navigation.navigate('CourseDetail', { courseId: item._id })}
            scaleTo={0.95}
          >
            <CourseCard
              item={item}
            />
          </AnimatedPressable>
        )}
        contentContainerStyle={styles.horizontalList}
      />

      <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Community Activity</Text>
    </View>
  );

  if (error && activity.length === 0) {
    return <RetryBox message="Unable to load your feed" error={error} onRetry={() => fetchData(false)} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={loading ? [1, 2, 3] : activity}
        keyExtractor={(item, index) => loading ? `skel-${index}` : item.id}
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
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
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
          !loading && (
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
  recCard: {
    backgroundColor: COLORS.card,
    width: 200,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.md,
    ...SHADOW.sm,
    borderTopWidth: 4,
    borderTopColor: COLORS.secondary,
  },
  recTitle: { ...FONTS.bodyBold, fontSize: 15, marginBottom: 4 },
  recPlatform: { ...FONTS.small, color: COLORS.primary, fontWeight: '700', textTransform: 'uppercase' },
  emptyBox: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 60, marginBottom: SPACING.md, opacity: 0.5 },
  emptyTitle: { ...FONTS.h3, marginBottom: SPACING.xs },
  emptySubtitle: { ...FONTS.caption, fontSize: 15, textAlign: 'center' },
});

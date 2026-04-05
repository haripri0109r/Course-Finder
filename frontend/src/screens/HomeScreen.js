import React, { useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import CourseCard from '../components/CourseCard';
import SkeletonCard from '../components/SkeletonCard';
import RetryBox from '../components/RetryBox';
import AnimatedPressable from '../components/AnimatedPressable';
import { showToast } from '../components/Toast';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const { user: currentUser, bookmarks, toggleBookmark } = useContext(AuthContext);
  const [recommended, setRecommended] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh && activity.length === 0) setLoading(true);
      
      const [recRes, actRes] = await Promise.all([
        api.get('/api/courses/recommended'),
        api.getRecentActivity()
      ]);

      if (recRes.data.success) setRecommended(recRes.data.courses);
      if (actRes.data.success) setActivity(actRes.data.data);
    } catch (err) {
      setError(err);
      showToast('Could not sync latest activity', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleLike = async (item) => {
    const isLiked = item.likes.includes(currentUser._id);
    const updatedActivity = activity.map(a => {
      if (a._id === item._id) {
        const newLikes = isLiked 
          ? a.likes.filter(id => id !== currentUser._id)
          : [...a.likes, currentUser._id];
        return { ...a, likes: newLikes };
      }
      return a;
    });
    setActivity(updatedActivity);

    try {
      if (isLiked) await api.unlikeCompletion(item._id);
      else await api.likeCompletion(item._id);
    } catch (err) {
      setActivity(activity);
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
            <Text style={styles.recTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.recPlatform}>{item.platform}</Text>
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
        keyExtractor={(item, index) => loading ? `skel-${index}` : item._id}
        renderItem={({ item }) => 
          loading ? (
            <SkeletonCard />
          ) : (
            <CourseCard
              title={item.course.title}
              platform={item.course.platform}
              rating={item.rating}
              authorName={item.user.name}
              reviewSnippet={item.review}
              likesCount={item.likes.length}
              commentsCount={0} 
              isLiked={item.likes.includes(currentUser._id)}
              isBookmarked={bookmarks.has(item._id)}
              createdAt={item.createdAt}
              onBookmark={() => toggleBookmark(item._id)}
              onLike={() => handleLike(item)}
              onPress={() => navigation.navigate('CompletionDetail', { completionId: item._id })}
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

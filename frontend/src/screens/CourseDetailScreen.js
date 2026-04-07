import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Linking, 
  RefreshControl 
} from 'react-native';
import api from '../services/api';
import { showToast } from '../components/Toast';
import AnimatedPressable from '../components/AnimatedPressable';
import SkeletonDetail from '../components/SkeletonDetail';
import RetryBox from '../components/RetryBox';
import { timeAgo } from '../utils/format';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';

export default function CourseDetailScreen({ route, navigation }) {
  const { courseId } = route.params;
  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchCourseDetails = async (isRefresh = false) => {
    try {
      setError(null);
      if (!isRefresh && !course) setLoading(true);
      
      const [courseRes, reviewsRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get(`/courses/${courseId}/reviews`)
      ]);

      if (courseRes.data.success) setCourse(courseRes.data.data);
      if (reviewsRes.data.success) setReviews(reviewsRes.data.data);
    } catch (err) {
      setError(err);
      showToast('Failed to sync course details', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCourseDetails(true);
  };

  const openUrl = async () => {
    if (!course?.url) return;
    const supported = await Linking.canOpenURL(course.url);
    if (supported) {
      await Linking.openURL(course.url);
    } else {
      showToast('Cannot open this URL', 'error');
    }
  };

  if (loading) return <SkeletonDetail />;
  if (error && !course) return <RetryBox message="Error loading course" error={error} onRetry={() => fetchCourseDetails(false)} />;
  if (!course) return null;

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.backIcon}>←</Text>
        </AnimatedPressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{course.platform}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <Text style={styles.title}>{course.title}</Text>
        
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: COLORS.primary + '15' }]}>
            <Text style={[styles.badgeText, { color: COLORS.primary }]}>{course.platform}</Text>
          </View>
          {course.level && (
            <View style={[styles.badge, { backgroundColor: COLORS.secondary + '15' }]}>
              <Text style={[styles.badgeText, { color: COLORS.secondary }]}>{course.level}</Text>
            </View>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statVal}>{course.averageRating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statVal}>{course.totalCompletions || 0}</Text>
            <Text style={styles.statLabel}>Learners</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statIcon}>📄</Text>
            <Text style={styles.statVal}>{course.totalRatings || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        <AnimatedPressable style={styles.mainBtn} onPress={openUrl} haptic="impactHeavy">
          <Text style={styles.mainBtnText}>Visit Course Website</Text>
        </AnimatedPressable>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>Learner Community Reviews</Text>
          {reviews.length > 0 ? (
            reviews.map((rev) => (
              <View key={rev._id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerAvatar}>
                    <Text style={styles.avatarText}>{(rev.user?.name || 'U').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.reviewerRow}>
                      <Text style={styles.reviewerName}>{rev.user?.name || 'Classmate'}</Text>
                      <Text style={styles.reviewTime}>{timeAgo(rev.createdAt)}</Text>
                    </View>
                    <Text style={styles.reviewStars}>{'⭐'.repeat(Math.round(rev.rating || 0))}</Text>
                  </View>
                </View>
                <Text style={styles.reviewText}>{rev.review}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyReviews}>
              <Text style={styles.noReviews}>No community reviews yet. Be the first to share your experience!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    height: 110, paddingTop: 60, flexDirection: 'row', alignItems: 'center', 
    justifyContent: 'space-between', paddingHorizontal: SPACING.lg, backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, ...SHADOW.sm 
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: COLORS.textPrimary, fontWeight: 'bold' },
  headerTitle: { ...FONTS.h3, flex: 1, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 13, color: COLORS.textSecondary },

  scrollContent: { padding: SPACING.xl, paddingBottom: 60 },
  title: { ...FONTS.h1, fontSize: 26, marginBottom: SPACING.lg, lineHeight: 34 },
  
  badgeRow: { flexDirection: 'row', marginBottom: SPACING.xxl },
  badge: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.pill, marginRight: SPACING.sm },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xxl },
  statBox: { flex: 1, backgroundColor: COLORS.white, padding: SPACING.lg, borderRadius: RADIUS.lg, alignItems: 'center', marginHorizontal: 4, ...SHADOW.sm },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statVal: { ...FONTS.h2, fontSize: 18, color: COLORS.primary, fontWeight: '800' },
  statLabel: { ...FONTS.small, color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase', marginTop: 2 },

  mainBtn: { backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: RADIUS.lg, alignItems: 'center', marginBottom: SPACING.xxxl, ...SHADOW.md },
  mainBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '800' },

  reviewsSection: { paddingTop: SPACING.lg },
  sectionTitle: { ...FONTS.h3, marginBottom: SPACING.xl, fontSize: 18 },
  reviewCard: { backgroundColor: COLORS.white, padding: SPACING.lg, borderRadius: RADIUS.lg, marginBottom: SPACING.lg, ...SHADOW.sm, borderLeftWidth: 4, borderLeftColor: COLORS.secondary },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.borderLight, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  avatarText: { fontWeight: '800', color: COLORS.primary, fontSize: 16 },
  reviewerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 },
  reviewerName: { fontWeight: '800', fontSize: 15, color: COLORS.textPrimary },
  reviewTime: { ...FONTS.small, color: COLORS.textMuted, fontSize: 10 },
  reviewStars: { fontSize: 12, marginTop: 2 },
  reviewText: { ...FONTS.body, color: COLORS.textSecondary, lineHeight: 22, marginTop: 4 },
  emptyReviews: { paddingVertical: 40, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, alignItems: 'center', paddingHorizontal: SPACING.xl },
  noReviews: { ...FONTS.caption, textAlign: 'center', color: COLORS.textMuted, lineHeight: 20 },
});

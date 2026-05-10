import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Linking, 
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import api from '../services/api';
import { showToast } from '../components/Toast';
import AnimatedPressable from '../components/AnimatedPressable';
import SkeletonDetail from '../components/SkeletonDetail';
import RetryBox from '../components/RetryBox';
import Avatar from '../components/Avatar';
import PrimaryButton from '../components/PrimaryButton';
import SectionHeader from '../components/SectionHeader';
import Chip from '../components/Chip';
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
      showToast({ message: 'Failed to sync course details', type: 'error' });
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
    try {
      await Linking.openURL(course.url);
    } catch (err) {
      showToast({ message: 'Cannot open link', type: 'error' });
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (error && !course) return <RetryBox message="Error loading course" error={error} onRetry={() => fetchCourseDetails(false)} />;
  if (!course) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </AnimatedPressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{course.platform}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <Text style={styles.title}>{course.title}</Text>
        
        <View style={styles.chipRow}>
          <Chip label={course.platform} selected variant="soft" />
          {course.level && <Chip label={course.level} variant="outline" />}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statVal}>{course.averageRating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>👥</Text>
            <Text style={styles.statVal}>{course.totalCompletions || 0}</Text>
            <Text style={styles.statLabel}>Learners</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>✍️</Text>
            <Text style={styles.statVal}>{course.totalRatings || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        <PrimaryButton 
          title="Visit Official Website" 
          onPress={openUrl} 
          fullWidth 
          icon="🌐"
          style={styles.ctaBtn}
        />

        <View style={styles.divider} />

        {/* Reviews Section */}
        <SectionHeader title="Community Reviews" icon="💬" style={styles.sectionHeader} />
        
        {reviews.length > 0 ? (
          reviews.map((rev) => (
            <View key={rev._id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Avatar name={rev.user?.name} size="sm" />
                <View style={styles.reviewerInfo}>
                  <View style={styles.reviewerTop}>
                    <Text style={styles.reviewerName}>{rev.user?.name || 'Classmate'}</Text>
                    <Text style={styles.reviewTime}>{timeAgo(rev.createdAt)}</Text>
                  </View>
                  <Text style={styles.reviewStars}>{'⭐'.repeat(Math.round(rev.rating || 0))}</Text>
                </View>
              </View>
              <View style={styles.reviewBody}>
                <Text style={styles.reviewText}>{rev.review}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyReviews}>
            <Text style={styles.noReviews}>No community reviews yet. Be the first to share your experience!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: COLORS.textPrimary, fontWeight: 'bold' },
  headerTitle: { ...FONTS.tiny, letterSpacing: 1, color: COLORS.textSecondary },

  scrollContent: { padding: SPACING.xl, paddingBottom: 60 },
  title: { ...FONTS.h1, fontSize: 24, marginBottom: SPACING.lg },
  
  chipRow: { flexDirection: 'row', marginBottom: SPACING.xxl },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xxl },
  statCard: { 
    flex: 1, 
    backgroundColor: COLORS.background, 
    padding: SPACING.md, 
    borderRadius: RADIUS.lg, 
    alignItems: 'center', 
    marginHorizontal: 4,
    ...SHADOW.xs,
  },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statVal: { ...FONTS.h3, color: COLORS.primary },
  statLabel: { ...FONTS.tiny, color: COLORS.textMuted, marginTop: 2 },

  ctaBtn: { marginBottom: SPACING.xxxl },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginBottom: SPACING.xxl },
  sectionHeader: { marginBottom: SPACING.xl },
  
  reviewCard: { 
    backgroundColor: COLORS.background, 
    padding: SPACING.lg, 
    borderRadius: RADIUS.lg, 
    marginBottom: SPACING.lg,
    ...SHADOW.xs,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  reviewerInfo: { flex: 1, marginLeft: SPACING.md },
  reviewerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewerName: { ...FONTS.bodyBold, fontSize: 14 },
  reviewTime: { ...FONTS.tiny, color: COLORS.textMuted },
  reviewStars: { fontSize: 10, marginTop: 2 },
  reviewBody: { backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADIUS.md },
  reviewText: { ...FONTS.body, fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  
  emptyReviews: { paddingVertical: 40, alignItems: 'center' },
  noReviews: { ...FONTS.caption, textAlign: 'center', color: COLORS.textMuted },
});

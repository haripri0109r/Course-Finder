import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import { SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

export default function CourseDetailScreen({ route, navigation }) {
  const { colors, isDark } = useAppTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
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

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  if (error && !course) return <RetryBox message="Error loading course" error={error} onRetry={() => fetchCourseDetails(false)} />;
  if (!course) return null;

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={s.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </AnimatedPressable>
        <Text style={s.headerTitle} numberOfLines={1}>{course.platform}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        <Text style={s.title}>{course.title}</Text>

        <View style={s.chipRow}>
          <Chip label={course.platform} selected variant="soft" />
          {course.level && <Chip label={course.level} variant="outline" />}
        </View>

        {/* Stats Grid */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Ionicons name="star" size={20} color={colors.warning || '#FBBF24'} />
            <Text style={s.statVal}>{course.averageRating?.toFixed(1) || '0.0'}</Text>
            <Text style={s.statLabel}>Rating</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="people" size={20} color={colors.accent} />
            <Text style={s.statVal}>{course.totalCompletions || 0}</Text>
            <Text style={s.statLabel}>Learners</Text>
          </View>
          <View style={s.statCard}>
            <Ionicons name="create-outline" size={20} color={colors.info || '#3B82F6'} />
            <Text style={s.statVal}>{course.totalRatings || 0}</Text>
            <Text style={s.statLabel}>Reviews</Text>
          </View>
        </View>

        <PrimaryButton
          title="Visit Official Website"
          onPress={openUrl}
          fullWidth
          icon="globe-outline"
          style={s.ctaBtn}
        />

        <View style={s.divider} />

        {/* Reviews Section */}
        <SectionHeader title="Community Reviews" icon="chatbubble-ellipses-outline" style={s.sectionHeader} />

        {reviews.length > 0 ? (
          reviews.map((rev) => (
            <View key={rev._id} style={s.reviewCard}>
              <View style={s.reviewHeader}>
                <Avatar name={rev.user?.name} size="sm" />
                <View style={s.reviewerInfo}>
                  <View style={s.reviewerTop}>
                    <Text style={s.reviewerName}>{rev.user?.name || 'Classmate'}</Text>
                    <Text style={s.reviewTime}>{timeAgo(rev.createdAt)}</Text>
                  </View>
                  <View style={s.starsRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < Math.round(rev.rating || 0) ? 'star' : 'star-outline'}
                        size={12}
                        color={colors.warning || '#FBBF24'}
                        style={{ marginRight: 2 }}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <View style={s.reviewBody}>
                <Text style={s.reviewText}>{rev.review}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={s.emptyReviews}>
            <Text style={s.noReviews}>No community reviews yet. Be the first to share your experience!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { ...FONTS.tiny, letterSpacing: 1, color: colors.textSecondary },

    scrollContent: { padding: SPACING.xl, paddingBottom: 60 },
    title: { ...FONTS.h1, fontSize: 24, color: colors.textPrimary, marginBottom: SPACING.lg },

    chipRow: { flexDirection: 'row', marginBottom: SPACING.xxl },

    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xxl },
    statCard: {
      flex: 1,
      backgroundColor: colors.background,
      padding: SPACING.md,
      borderRadius: RADIUS.lg,
      alignItems: 'center',
      marginHorizontal: 4,
      gap: 4,
      ...SHADOW.xs,
    },
    statVal: { ...FONTS.h3, color: colors.textPrimary },
    statLabel: { ...FONTS.tiny, color: colors.textMuted, marginTop: 2 },

    ctaBtn: { marginBottom: SPACING.xxxl },
    divider: { height: 1, backgroundColor: colors.borderLight, marginBottom: SPACING.xxl },
    sectionHeader: { marginBottom: SPACING.xl },

    reviewCard: {
      backgroundColor: colors.background,
      padding: SPACING.lg,
      borderRadius: RADIUS.lg,
      marginBottom: SPACING.lg,
      ...SHADOW.xs,
    },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
    reviewerInfo: { flex: 1, marginLeft: SPACING.md },
    reviewerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reviewerName: { ...FONTS.bodyBold, fontSize: 14, color: colors.textPrimary },
    reviewTime: { ...FONTS.tiny, color: colors.textMuted },
    starsRow: { flexDirection: 'row', marginTop: 2 },
    reviewBody: { backgroundColor: colors.surface, padding: SPACING.md, borderRadius: RADIUS.md },
    reviewText: { ...FONTS.body, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

    emptyReviews: { paddingVertical: 40, alignItems: 'center' },
    noReviews: { ...FONTS.caption, textAlign: 'center', color: colors.textMuted },
  });
}

import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS, RADIUS, SHADOW, SPACING, FONTS } from '../utils/theme';
import { timeAgo } from '../utils/format';
import { showToast } from './Toast';
import AnimatedPressable from './AnimatedPressable';
import CourseImage from './CourseImage';
import PrimaryButton from './PrimaryButton';
import api from '../services/api';
import { useNavigation } from '@react-navigation/native';

/**
 * PRODUCTION-GRADE CourseCard
 * Consumes flattened v1 API structure.
 * Media handling is delegated to the resilient <CourseImage /> component.
 */
const CourseCard = memo(({ 
  item = {},
  onLike,
  onBookmark,
  isBookmarked
}) => {
  const navigation = useNavigation();
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const handlePress = () => {
    console.log("COURSE ITEM VIEW:", item.id);

    if (!item?.url) {
      console.warn("No URL found");
      return;
    }

    // Trigger View Tracking (Async, non-blocking)
    api.incrementViewCount(item.id).catch(() => {});

    navigation.navigate("CourseViewer", {
      url: item.url,
      title: item.title,
      id: item.id,
    });
  };

  const platformColor = {
    Udemy: '#A435F0',
    Coursera: '#0056D2',
    YouTube: '#FF0000',
    Other: COLORS.textMuted,
  };

  const handleLike = async () => {
    if (isLikeLoading) return;
    setIsLikeLoading(true);
    try {
      await onLike?.();
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleBookmark = async () => {
    if (isBookmarkLoading) return;
    setIsBookmarkLoading(true);
    try {
      await onBookmark?.();
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  const isPdfCert = item?.certificateUrl && (item.certificateUrl.endsWith('.pdf') || item.certificateUrl.includes('/raw/'));

  return (
    <AnimatedPressable
      style={styles.card}
      onPress={handlePress}
      scaleTo={0.98}
      haptic="impactLight"
    >
      <View style={[styles.accent, { backgroundColor: platformColor[item?.platform] || COLORS.primary }]} />

      <View style={styles.cardInner}>
        <View style={styles.imageContainer}>
          <CourseImage uri={item?.image} style={styles.thumbnail} />
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            {item?.authorName && (
              <Text style={styles.authorTag}>Logged by <Text style={styles.authorName}>{item.authorName}</Text></Text>
            )}
            {item?.createdAt && <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>}
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{item?.title}</Text>
            <AnimatedPressable 
              style={[styles.bookmarkBtn, isBookmarked && styles.bookmarkBtnActive]} 
              onPress={handleBookmark}
              disabled={isBookmarkLoading}
              scaleTo={0.8}
              haptic="impactMedium"
            >
              <Text style={{ fontSize: 18 }}>{isBookmarked ? '🔖' : '🔖'}</Text>
              {!isBookmarked && <View style={styles.bookmarkOverlay} />}
            </AnimatedPressable>
          </View>

          <View style={styles.platformBadge}>
            <Text style={[styles.platformText, { color: platformColor[item?.platform] || COLORS.primary }]}>
              {item?.platform}
            </Text>
          </View>

          {item?.reviewSnippet && (
            <Text style={styles.reviewSnippet} numberOfLines={2}>"{item.reviewSnippet}"</Text>
          )}

          {/* Learning Post Features */}
          {item?.description && (
            <View style={styles.descriptionContainer}>
              <Text 
                style={styles.description} 
                numberOfLines={isDescriptionExpanded ? undefined : 3}
              >
                {item.description}
              </Text>
              {item.description.length > 100 && (
                <TouchableOpacity onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                  <Text style={styles.seeMoreText}>
                    {isDescriptionExpanded ? 'Show less' : 'See more...'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {item?.learnings && item.learnings.length > 0 && (
            <View style={styles.learningsContainer}>
              <Text style={styles.learningsHeader}>💡 What I learned:</Text>
              {item.learnings.map((learning, index) => (
                <View key={index} style={styles.learningItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.learningText}>{learning}</Text>
                </View>
              ))}
            </View>
          )}

          {item?.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.map((tag, index) => (
                <Text key={index} style={styles.tagText}>#{tag}</Text>
              ))}
            </View>
          )}

          {item?.certificateUrl ? (
            <TouchableOpacity 
              style={styles.certificateBtn} 
              onPress={() => {
                api.post('/completed/analytics/cert-view', { url: item.certificateUrl }).catch(() => {});
                
                Linking.openURL(item.certificateUrl).catch(() => {
                  showToast('Unable to open certificate link', 'error');
                });
              }}
            >
              <Text style={styles.certificateText}>
                {isPdfCert ? '📄 View Certificate [PDF]' : '🖼️ View Certificate [Image]'}
              </Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statEmoji}>⭐</Text>
              <Text style={styles.statValue}>{item?.rating ? item.rating.toFixed(1) : '0.0'}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <AnimatedPressable 
              onPress={handleLike} 
              disabled={isLikeLoading}
              style={styles.stat}
              scaleTo={0.85}
              haptic="impactMedium"
            >
              <Text style={styles.statEmoji}>{item?.isLiked ? '❤️' : '🤍'}</Text>
              <Text style={styles.statValue}>{item?.likesCount}</Text>
            </AnimatedPressable>

            <View style={styles.divider} />
            
            <View style={styles.stat}>
              <Text style={styles.statEmoji}>💬</Text>
              <Text style={styles.statValue}>{item?.commentsCount || 0}</Text>
            </View>
            
            {item?.duration && item.duration !== 'N/A' && (
              <>
                <View style={styles.divider} />
                <View style={styles.stat}>
                  <Text style={styles.statEmoji}>⌛</Text>
                  <Text style={styles.statValue}>{item.duration}</Text>
                </View>
              </>
            )}
          </View>

          <PrimaryButton 
            title="View Course" 
            onPress={handlePress}
            disabled={!item?.url}
            variant="outline"
            style={styles.viewBtn}
            textStyle={{ fontSize: 12 }}
          />
        </View>
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    ...SHADOW.md,
  },
  accent: {
    width: 6,
  },
  cardInner: {
    flex: 1,
    flexDirection: 'column',
  },
  imageContainer: {
    width: '100%',
    height: 150,
  },
  thumbnail: {
    width: '100%',
    height: 150,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorTag: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  authorName: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  timeText: {
    ...FONTS.small,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  title: {
    ...FONTS.bodyBold,
    fontSize: 17,
    lineHeight: 23,
    flex: 1,
    marginRight: SPACING.md,
  },
  bookmarkBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: `${COLORS.background}80`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookmarkBtnActive: {
    backgroundColor: `${COLORS.secondary}20`,
  },
  bookmarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 8,
  },
  platformBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
    marginBottom: SPACING.md,
  },
  platformText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reviewSnippet: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  certificateBtn: {
    backgroundColor: `${COLORS.primary}15`,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  certificateText: {
    color: COLORS.primary,
    ...FONTS.caption,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  statValue: {
    ...FONTS.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  viewBtn: {
    marginTop: SPACING.lg,
    paddingVertical: 8,
    minHeight: 36,
  },
  
  // Learning Post Styles
  descriptionContainer: {
    marginBottom: SPACING.md,
  },
  description: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  seeMoreText: {
    ...FONTS.small,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: 4,
  },
  learningsContainer: {
    backgroundColor: `${COLORS.background}50`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },
  learningsHeader: {
    ...FONTS.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  learningItem: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bullet: {
    color: COLORS.secondary,
    marginRight: 6,
    fontWeight: 'bold',
  },
  learningText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  tagText: {
    ...FONTS.small,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 10,
    fontSize: 12,
  },
});

export default CourseCard;

import React, { memo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SHADOW, SPACING, FONTS } from '../utils/theme';
import { timeAgo } from '../utils/format';
import AnimatedPressable from './AnimatedPressable';

const CourseCard = memo(({ 
  title, 
  platform, 
  rating, 
  authorName,
  reviewSnippet,
  likesCount,
  commentsCount,
  isLiked,
  isBookmarked,
  onLike,
  onBookmark,
  onPress,
  createdAt
}) => {
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);

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

  return (
    <AnimatedPressable
      style={styles.card}
      onPress={onPress}
      scaleTo={0.98}
      haptic="impactLight"
    >
      {/* Platform Accent Strip */}
      <View style={[styles.accent, { backgroundColor: platformColor[platform] || COLORS.primary }]} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          {authorName && (
            <Text style={styles.authorTag}>Logged by <Text style={styles.authorName}>{authorName}</Text></Text>
          )}
          {createdAt && <Text style={styles.timeText}>{timeAgo(createdAt)}</Text>}
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
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
          <Text style={[styles.platformText, { color: platformColor[platform] || COLORS.primary }]}>
            {platform}
          </Text>
        </View>

        {reviewSnippet && (
          <Text style={styles.reviewSnippet} numberOfLines={2}>"{reviewSnippet}"</Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statValue}>{rating ? rating.toFixed(1) : '0.0'}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <AnimatedPressable 
            onPress={handleLike} 
            disabled={isLikeLoading}
            style={styles.stat}
            scaleTo={0.85}
            haptic="impactMedium"
          >
            <Text style={styles.statEmoji}>{isLiked ? '❤️' : '🤍'}</Text>
            <Text style={styles.statValue}>{likesCount}</Text>
          </AnimatedPressable>

          <View style={styles.divider} />
          
          <View style={styles.stat}>
            <Text style={styles.statEmoji}>💬</Text>
            <Text style={styles.statValue}>{commentsCount || 0}</Text>
          </View>
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
});

export default CourseCard;

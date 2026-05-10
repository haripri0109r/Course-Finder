import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONTS, RADIUS } from '../utils/theme';
import Avatar from './Avatar';
import { timeAgo } from '../utils/format';
import CourseImage from './CourseImage';

/**
 * Premium Course Card — Coursera + Airbnb aesthetic
 */
const CourseCard = ({ item, onBookmark, onLike, isBookmarked }) => {
  const navigation = useNavigation();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this course I found on CourseFinder: ${item.title} - ${item.url}`,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  const navigateToDetail = () => {
    navigation.navigate('PostDetail', { postId: item.id || item._id });
  };

  const navigateToUser = () => {
    navigation.navigate('UserProfile', { userId: item.userId?._id || item.userId });
  };

  const platformColor = COLORS.platforms[item.platform] || COLORS.accent;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity onPress={navigateToUser} style={styles.authorRow}>
          <Avatar 
            name={item.authorName || item.userId?.name} 
            uri={item.userId?.profilePicture} 
            size="sm" 
          />
          <View style={styles.authorMeta}>
            <Text style={styles.authorName}>{item.authorName || item.userId?.name || 'Learner'}</Text>
            <Text style={styles.timeAgo}>{timeAgo(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreIconBtn} activeOpacity={0.75}>
          <Ionicons name="ellipsis-horizontal" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={navigateToDetail}>
        <View style={styles.mediaContainer}>
          <CourseImage uri={item.image} style={styles.image} />
          <View style={styles.platformBadge}>
            <View style={[styles.dot, { backgroundColor: platformColor }]} />
            <Text style={styles.platformName}>{item.platform}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={COLORS.warning} />
            <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '0.0'}</Text>
            <View style={styles.metaDivider} />
            <Text style={styles.durationText}>{item.duration || 'Short Course'}</Text>
          </View>

          {item.review && (
            <Text style={styles.reviewQuote} numberOfLines={2}>{item.review}</Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.footer}>
        <View style={styles.statsRow}>
          <Text style={styles.engagementText}>
            <Text style={styles.statBold}>{item.likesCount || 0}</Text> likes  •  <Text style={styles.statBold}>{item.commentsCount || 0}</Text> comments
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.actionGrid}>
          <TouchableOpacity onPress={onLike} style={styles.actionItem}>
            <Ionicons
              name={item.isLikedByMe ? 'heart' : 'heart-outline'}
              size={16}
              color={item.isLikedByMe ? COLORS.accent : COLORS.textSecondary}
            />
            <Text style={[styles.actionLabel, item.isLikedByMe && styles.activeLabel]}>Like</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={navigateToDetail} style={styles.actionItem}>
            <Ionicons name="chatbubble-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.actionLabel}>Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} style={styles.actionItem}>
            <Ionicons name="share-social-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onBookmark} style={styles.actionItem}>
            <Ionicons
              name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={isBookmarked ? COLORS.accent : COLORS.textSecondary}
            />
            <Text style={[styles.actionLabel, isBookmarked && styles.activeLabel]}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorMeta: {
    marginLeft: SPACING.sm,
  },
  authorName: {
    ...FONTS.captionBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  timeAgo: {
    ...FONTS.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  moreIconBtn: {
    padding: SPACING.xs,
  },
  moreText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.surfaceSubtle,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  platformBadge: {
    position: 'absolute',
    right: SPACING.sm,
    top: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  platformName: {
    ...FONTS.small,
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  body: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  title: {
    ...FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    ...FONTS.small,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 4,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textMuted,
    marginHorizontal: 8,
  },
  durationText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  reviewQuote: {
    ...FONTS.small,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginTop: 6,
  },
  footer: {
    paddingBottom: 2,
  },
  statsRow: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 6,
  },
  engagementText: {
    ...FONTS.small,
    color: COLORS.textSecondary,
  },
  statBold: {
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  actionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  actionLabel: {
    ...FONTS.small,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeLabel: {
    color: COLORS.accent,
  },
});

export default CourseCard;

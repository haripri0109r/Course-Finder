import React, { useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Pressable,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import Avatar from './Avatar';
import { timeAgo } from '../utils/format';
import CourseImage from './CourseImage';
import { showToast } from './Toast';
import api from '../services/api';
import { emit } from '../utils/eventBus';

function ProgressBar({ progress, colors }) {
  const pct = Math.min(100, Math.max(0, progress));
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSubtle }]}>
      <View
        style={[
          styles.progressFill,
          { width: `${pct}%`, backgroundColor: colors.accent },
        ]}
      />
    </View>
  );
}

/**
 * LinkedIn-style learning feed card — premium, social, professional.
 * Optional fields (progress, certificate, tags) render when present on `item`.
 */
const CourseCard = ({
  item,
  onBookmark = () => {},
  onLike = () => {},
  isBookmarked = false,
  onDeleted = () => {},
}) => {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const { user: currentUser } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const postId = item.id || item._id;
  const isOwn =
    currentUser &&
    (item.userId === currentUser._id ||
      item.userId?._id === currentUser._id);

  const category =
    (Array.isArray(item.tags) && item.tags[0]) ||
    item.category ||
    item.skill ||
    null;

  const hasCertificate = !!(
    item.certificateUrl ||
    item.certificate ||
    item.hasCertificate
  );

  const progressRaw =
    typeof item.progressPercent === 'number'
      ? item.progressPercent
      : typeof item.progress === 'number'
        ? item.progress
        : item.completed === true || item.completionStatus === 'completed'
          ? 100
          : null;

  const showProgress = progressRaw !== null && progressRaw !== undefined;

  const platformColor =
    colors.platforms[item.platform] || colors.accent;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Course achievement on Course Finder: ${item.title}${item.url ? ` — ${item.url}` : ''}`,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  const navigateToDetail = () => {
    navigation.navigate('PostDetail', { postId });
  };

  const navigateToUser = () => {
    navigation.navigate('UserProfile', {
      userId: item.userId?._id || item.userId,
    });
  };

  const isValidHttpUrl = (value = '') => /^https?:\/\//i.test(String(value || '').trim());

  const openCourse = async () => {
    const courseUrl = String(item?.url || '').trim();
    if (!isValidHttpUrl(courseUrl)) {
      showToast({ message: 'Invalid course URL', type: 'error' });
      return;
    }
    try {
      const supported = await Linking.canOpenURL(courseUrl);
      if (!supported) {
        showToast({ message: 'Cannot open this URL on your device', type: 'error' });
        return;
      }
      await Linking.openURL(courseUrl);
    } catch {
      showToast({ message: 'Failed to open the course link', type: 'error' });
    }
  };

  const viewCertificate = () => {
    if (hasCertificate) {
      navigateToDetail();
      return;
    }
    showToast({
      message: 'Certificate not attached to this post',
      type: 'info',
    });
  };

  const onRepost = () => {
    showToast({
      message: 'Reposts will help your network discover wins — coming soon.',
      type: 'info',
    });
  };

  const onEdit = () => {
    showToast({ message: 'Edit coming soon.', type: 'info' });
  };

  const handleDelete = async () => {
    if (!postId || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.deleteCompletion(postId);
      showToast({ message: 'Course removed', type: 'success' });
      emit('completionDeleted', { id: postId });
      onDeleted(postId);
    } catch (e) {
      showToast({
        message: e?.response?.data?.message || 'Could not delete this course',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete course log?', 'This will remove the post from your profile and feed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: handleDelete },
    ]);
  };

  const ActionSheet = useMemo(() => {
    return (
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setMenuOpen(false)}
        />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {isOwn ? (
            <>
              <SheetAction
                label="Edit"
                icon="create-outline"
                onPress={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                colors={colors}
              />
              <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />
            </>
          ) : null}

          <SheetAction
            label="Share"
            icon="share-social-outline"
            onPress={() => {
              setMenuOpen(false);
              handleShare();
            }}
            colors={colors}
          />

          {isOwn ? (
            <>
              <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />
              <SheetAction
                label={isDeleting ? 'Deleting…' : 'Delete'}
                icon="trash-outline"
                destructive
                disabled={isDeleting}
                onPress={() => {
                  setMenuOpen(false);
                  confirmDelete();
                }}
                colors={colors}
              />
            </>
          ) : null}

          <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />
          <SheetAction
            label="Cancel"
            icon="close"
            onPress={() => setMenuOpen(false)}
            colors={colors}
          />
        </View>
      </Modal>
    );
  }, [menuOpen, colors, isOwn, isDeleting, postId]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.97 },
        SHADOW.sm,
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={navigateToUser} style={styles.authorRow}>
          <Avatar
            name={item.authorName || item.userId?.name}
            uri={item.userId?.profilePicture}
            size="sm"
          />
          <View style={styles.authorMeta}>
            <Text style={[styles.authorName, { color: colors.textPrimary }]}>
              {item.authorName || item.userId?.name || 'Learner'}
            </Text>
            <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>
              {timeAgo(item.createdAt)}
              {item.platform ? ` · ${item.platform}` : ''}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moreIconBtn}
          hitSlop={12}
          onPress={() => setMenuOpen(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.92} onPress={navigateToDetail}>
        <View style={[styles.mediaContainer, { backgroundColor: colors.surfaceSubtle }]}>
          <CourseImage uri={item.image} style={styles.image} />
          <View style={[styles.platformBadge, { backgroundColor: colors.surface }]}>
            <View style={[styles.dot, { backgroundColor: platformColor }]} />
            <Text style={[styles.platformName, { color: colors.textPrimary }]}>
              {item.platform}
            </Text>
          </View>
          {category ? (
            <View style={[styles.categoryPill, { backgroundColor: colors.accentLight }]}>
              <Text style={[styles.categoryText, { color: colors.accent }]}>
                {category}
              </Text>
            </View>
          ) : null}
          {hasCertificate ? (
            <View style={[styles.certBadge, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="ribbon" size={12} color={colors.success} />
              <Text style={[styles.certBadgeText, { color: colors.success, marginLeft: 4 }]}>
                Certified
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>

          {showProgress ? (
            <View style={styles.progressBlock}>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                  Progress
                </Text>
                <Text style={[styles.progressPct, { color: colors.accent }]}>
                  {Math.round(progressRaw)}%
                </Text>
              </View>
              <ProgressBar progress={progressRaw} colors={colors} />
            </View>
          ) : null}

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={colors.warning} />
            <Text style={[styles.ratingText, { color: colors.textPrimary }]}>
              {item.rating?.toFixed(1) || '—'}
            </Text>
            <View style={[styles.metaDivider, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.durationText, { color: colors.textSecondary }]}>
              {item.duration || 'Course'}
            </Text>
          </View>

          {item.review ? (
            <Text
              style={[styles.reviewQuote, { color: colors.textSecondary }]}
              numberOfLines={3}
            >
              {item.review}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.statsRow}>
        <Text style={[styles.engagementText, { color: colors.textSecondary }]}>
          <Text style={[styles.statBold, { color: colors.textPrimary }]}>
            {item.likesCount || 0}
          </Text>{' '}
          reactions ·{' '}
          <Text style={[styles.statBold, { color: colors.textPrimary }]}>
            {item.commentsCount || 0}
          </Text>{' '}
          comments
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.actionGrid}>
        <TouchableOpacity onPress={onLike} style={[styles.actionItem, { flex: 1 }]}>
          <Ionicons
            name={item.isLikedByMe ? 'heart' : 'heart-outline'}
            size={18}
            color={item.isLikedByMe ? colors.accent : colors.textSecondary}
          />
          <Text
            style={[
              styles.actionLabel,
              { color: colors.textSecondary },
              item.isLikedByMe && { color: colors.accent },
            ]}
          >
            Like
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={navigateToDetail} style={[styles.actionItem, { flex: 1 }]}>
          <Ionicons name="chatbubble-outline" size={17} color={colors.textSecondary} />
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onRepost} style={[styles.actionItem, { flex: 1 }]}>
          <Ionicons name="repeat-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Repost</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleShare} style={[styles.actionItem, { flex: 1 }]}>
          <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onBookmark} style={[styles.actionItem, { flex: 1 }]}>
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={isBookmarked ? colors.accent : colors.textSecondary}
          />
          <Text
            style={[
              styles.actionLabel,
              { color: colors.textSecondary },
              isBookmarked && { color: colors.accent },
            ]}
          >
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.secondaryActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={openCourse}>
          <Ionicons name="open-outline" size={16} color={colors.accent} />
          <Text style={[styles.secondaryLabel, { color: colors.accent, marginLeft: 6 }]}>Open course</Text>
        </TouchableOpacity>
        <View style={[styles.secondarySep, { backgroundColor: colors.border }]} />
        <TouchableOpacity style={styles.secondaryBtn} onPress={viewCertificate}>
          <Ionicons name="document-text-outline" size={16} color={colors.accent} />
          <Text style={[styles.secondaryLabel, { color: colors.accent, marginLeft: 6 }]}>Certificate</Text>
        </TouchableOpacity>
      </View>

      {ActionSheet}
    </Pressable>
  );
};

function SheetAction({ label, icon, onPress, colors, destructive = false, disabled = false }) {
  const textColor = destructive ? colors.danger : colors.textPrimary;
  const iconColor = destructive ? colors.danger : colors.textSecondary;
  return (
    <TouchableOpacity
      style={[styles.sheetItem, disabled && { opacity: 0.6 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={18} color={iconColor} />
      <Text style={[styles.sheetLabel, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
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
    flex: 1,
  },
  authorMeta: {
    marginLeft: SPACING.sm,
  },
  authorName: {
    ...FONTS.captionBold,
    fontSize: 14,
  },
  timeAgo: {
    ...FONTS.small,
    marginTop: 2,
  },
  moreIconBtn: {
    padding: SPACING.xs,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: SPACING.xl,
    right: SPACING.xl,
    bottom: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  sheetLabel: {
    ...FONTS.bodyBold,
    fontSize: 14,
    marginLeft: 10,
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'transparent',
    ...SHADOW.xs,
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
    fontWeight: '600',
  },
  categoryPill: {
    position: 'absolute',
    left: SPACING.sm,
    top: SPACING.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  categoryText: {
    ...FONTS.small,
    fontSize: 11,
    fontWeight: '700',
  },
  certBadge: {
    position: 'absolute',
    left: SPACING.sm,
    bottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  certBadgeText: {
    ...FONTS.small,
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  title: {
    ...FONTS.bodyBold,
    fontSize: 16,
    lineHeight: 22,
  },
  progressBlock: {
    marginTop: SPACING.sm,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    ...FONTS.small,
    fontWeight: '600',
  },
  progressPct: {
    ...FONTS.small,
    fontWeight: '700',
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingText: {
    ...FONTS.small,
    fontWeight: '600',
    marginLeft: 4,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 8,
  },
  durationText: {
    ...FONTS.small,
  },
  reviewQuote: {
    ...FONTS.small,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: SPACING.md,
  },
  statsRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  engagementText: {
    ...FONTS.small,
  },
  statBold: {
    fontWeight: '700',
  },
  actionGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minWidth: 52,
  },
  actionLabel: {
    ...FONTS.small,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: SPACING.sm,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  secondarySep: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  secondaryLabel: {
    ...FONTS.captionBold,
    fontSize: 12,
  },
});

export default CourseCard;

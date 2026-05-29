import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

export default function CoursePreview({ title, image, platform, duration }) {
  const { colors } = useAppTheme();
  if (!title && !image && !platform) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {image ? (
        <Image source={{ uri: image }} style={[styles.image, { backgroundColor: colors.border }]} />
      ) : (
        <View style={[styles.placeholderImage, { backgroundColor: colors.background }]}>
          <Text style={[styles.placeholderText, { color: colors.textMuted }]}>No Image</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={[styles.platform, { color: colors.primary }]}>{platform || 'Select Platform'}</Text>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
          {title || 'Course Title Preview...'}
        </Text>

        {duration && duration !== 'N/A' && (
          <View style={styles.durationRow}>
            <Text style={styles.durationEmoji}>⌛</Text>
            <Text style={[styles.durationText, { color: colors.textSecondary }]}>{duration}</Text>
          </View>
        )}
      </View>

      <View style={[styles.previewBadge, { backgroundColor: colors.secondary }]}>
        <Text style={styles.previewBadgeText}>LIVE PREVIEW</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    marginLeft: SPACING.xs,
    ...SHADOW.md,
    borderWidth: 1,
  },
  image: {
    height: 140,
    width: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...FONTS.small,
  },
  content: {
    padding: SPACING.lg,
  },
  platform: {
    ...FONTS.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    ...FONTS.bodyBold,
    lineHeight: 22,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  durationEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  durationText: {
    ...FONTS.small,
    fontWeight: '700',
  },
  previewBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    ...SHADOW.sm,
  },
  previewBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

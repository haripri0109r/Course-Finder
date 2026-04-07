import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, SPACING, FONTS, RADIUS, SHADOW } from '../utils/theme';

export default function CoursePreview({ title, image, platform, duration }) {
  // Edge Case Protection: Don't render empty card
  if (!title && !image && !platform) return null;

  return (
    <View style={styles.card}>
      {image ? (
        <Image source={{ uri: image }} style={styles.image} />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>No Image 🖼️</Text>
        </View>
      )}
      
      <View style={styles.content}>
        <Text style={styles.platform}>{platform || 'Select Platform'}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {title || 'Course Title Preview...'}
        </Text>
        
        {duration && duration !== 'N/A' && (
          <View style={styles.durationRow}>
            <Text style={styles.durationEmoji}>⌛</Text>
            <Text style={styles.durationText}>{duration}</Text>
          </View>
        )}
      </View>
      
      {/* Visual Badge for "Preview" */}
      <View style={styles.previewBadge}>
        <Text style={styles.previewBadgeText}>LIVE PREVIEW</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    marginLeft: SPACING.xs,
    ...SHADOW.md,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  image: {
    height: 140,
    width: '100%',
    resizeMode: 'cover',
    backgroundColor: COLORS.border,
  },
  placeholderImage: {
    height: 140,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...FONTS.small,
    color: COLORS.textMuted,
  },
  content: {
    padding: SPACING.lg,
  },
  platform: {
    ...FONTS.caption,
    color: COLORS.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    ...FONTS.bodyBold,
    color: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  previewBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.secondary,
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

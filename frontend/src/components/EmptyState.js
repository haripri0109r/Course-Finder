import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONTS, RADIUS } from '../utils/theme';
import PrimaryButton from './PrimaryButton';

/**
 * Premium empty state — used when a list/section has no content
 */
export default function EmptyState({
  icon = '○',
  title = 'Nothing here yet',
  subtitle,
  actionTitle,
  onAction,
  compact = false,
}) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={styles.emojiContainer}>
        <Text style={styles.emoji}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionTitle && onAction && (
        <PrimaryButton
          title={actionTitle}
          onPress={onAction}
          variant="secondary"
          size="sm"
          style={styles.actionBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: SPACING['3xl'],
  },
  compact: {
    paddingVertical: 40,
  },
  emojiContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emoji: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  title: {
    ...FONTS.h3,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  actionBtn: {
    marginTop: SPACING.xl,
  },
});

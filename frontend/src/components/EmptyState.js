import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, FONTS, RADIUS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
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
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={[styles.artRow, { borderColor: colors.border }]}>
        <View style={[styles.artCircle, { backgroundColor: colors.accentLight }]} />
        <View style={[styles.artBar, { backgroundColor: colors.surfaceSubtle }]} />
        <View style={[styles.artSquare, { borderColor: colors.border }]} />
      </View>
      {icon ? (
        <View
          style={[
            styles.emojiContainer,
            { backgroundColor: colors.surfaceSubtle },
          ]}
        >
          <Text style={[styles.emoji, { color: colors.textSecondary }]}>
            {icon}
          </Text>
        </View>
      ) : null}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
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
    paddingVertical: 56,
    paddingHorizontal: SPACING['3xl'],
  },
  compact: {
    paddingVertical: 36,
  },
  artRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    maxWidth: 220,
  },
  artCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 5,
  },
  artBar: {
    width: 56,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  artSquare: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    marginHorizontal: 5,
  },
  emojiContainer: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emoji: {
    fontSize: 22,
  },
  title: {
    ...FONTS.h3,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...FONTS.body,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  actionBtn: {
    marginTop: SPACING.xl,
  },
});

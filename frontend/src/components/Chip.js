import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RADIUS, SPACING, FONTS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

/**
 * Tag/Filter chip — used for categories, tags, filters
 * Variants: filled | outline | soft
 */
export default function Chip({
  label,
  onPress,
  selected = false,
  variant = 'soft',
  icon,
  style,
  disabled = false,
}) {
  const { colors } = useAppTheme();
  const isInteractive = !!onPress;

  const bgStyle = selected
    ? { backgroundColor: colors.accent }
    : variant === 'outline'
      ? {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        }
      : { backgroundColor: colors.surfaceSubtle };

  const textColor = selected
    ? colors.white
    : variant === 'outline'
      ? colors.textSecondary
      : colors.textPrimary;

  return (
    <TouchableOpacity
      style={[styles.base, bgStyle, disabled && styles.disabled, style]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!isInteractive || disabled}
    >
      {icon ? (
        <Text style={[styles.icon, { color: textColor }]}>{icon}</Text>
      ) : null}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  icon: {
    fontSize: 14,
    marginRight: 4,
  },
  label: {
    ...FONTS.captionBold,
    fontSize: 12,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

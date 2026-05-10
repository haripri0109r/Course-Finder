import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS } from '../utils/theme';

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
  const isInteractive = !!onPress;

  const chipStyle = selected
    ? styles.selected
    : variant === 'outline'
    ? styles.outline
    : styles.soft;

  const textColor = selected
    ? COLORS.textInverse
    : variant === 'outline'
    ? COLORS.textSecondary
    : COLORS.primary;

  return (
    <TouchableOpacity
      style={[styles.base, chipStyle, disabled && styles.disabled, style]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!isInteractive || disabled}
    >
      {icon && <Text style={[styles.icon, { color: textColor }]}>{icon}</Text>}
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
  soft: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selected: {
    backgroundColor: COLORS.accent,
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

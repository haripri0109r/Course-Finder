import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/theme';

/**
 * Small status badge (notification count, status dot, etc.)
 * Variants: primary | success | danger | warning | muted
 */
export default function Badge({
  count,
  label,
  title,
  icon,
  color,
  variant = 'primary',
  size = 'md',
  dot = false,
  style,
}) {
  const variantColors = {
    primary: { bg: COLORS.accent, text: COLORS.textInverse },
    success: { bg: COLORS.success, text: COLORS.textInverse },
    danger:  { bg: COLORS.danger,  text: COLORS.textInverse },
    warning: { bg: COLORS.warning, text: COLORS.textInverse },
    muted: { bg: COLORS.borderLight, text: COLORS.textSecondary },
    soft: { bg: COLORS.surfaceSubtle, text: COLORS.textPrimary },
  };

  const v = color
    ? { bg: color, text: COLORS.textInverse }
    : (variantColors[variant] || variantColors.primary);

  if (dot) {
    return (
      <View style={[styles.dot, { backgroundColor: v.bg }, style]} />
    );
  }

  const baseText = title || label;
  const displayText = count !== undefined
    ? (count > 99 ? '99+' : String(count))
    : baseText;

  return (
    <View style={[
      styles.badge,
      size === 'sm' && styles.badgeSm,
      { backgroundColor: v.bg },
      style,
    ]}>
      <Text style={[
        styles.text,
        size === 'sm' && styles.textSm,
        { color: v.text },
      ]}>
        {icon ? `${icon} ${displayText}` : displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  textSm: {
    fontSize: 9,
    fontWeight: '800',
  },
});

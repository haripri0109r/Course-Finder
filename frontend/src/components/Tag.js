import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS } from '../utils/theme';

export default function Tag({ label, active = false, onPress, style }) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.base, active ? styles.active : styles.inactive, style]}
    >
      <Text style={[styles.label, active ? styles.activeLabel : styles.inactiveLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  active: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  inactive: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  label: {
    ...FONTS.captionBold,
  },
  activeLabel: {
    color: COLORS.white,
  },
  inactiveLabel: {
    color: COLORS.textSecondary,
  },
});

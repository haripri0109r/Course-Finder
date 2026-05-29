import React, { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RADIUS, SPACING, FONTS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

export default function Tag({ label, active = false, onPress, style }) {
  const { colors } = useAppTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={!onPress}
      style={[s.base, active ? s.active : s.inactive, style]}
    >
      <Text style={[s.label, active ? s.activeLabel : s.inactiveLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    base: {
      borderRadius: RADIUS.full,
      borderWidth: 1,
      paddingHorizontal: SPACING.md,
      paddingVertical: 6,
    },
    active: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    inactive: {
      backgroundColor: c.surface,
      borderColor: c.border,
    },
    label: {
      ...FONTS.captionBold,
    },
    activeLabel: {
      color: c.white,
    },
    inactiveLabel: {
      color: c.textSecondary,
    },
  });
}

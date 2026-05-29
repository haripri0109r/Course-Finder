import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

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
  const { colors } = useAppTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  const variantColors = {
    primary: { bg: colors.accent, text: colors.textInverse },
    success: { bg: colors.success, text: colors.textInverse },
    danger:  { bg: colors.danger,  text: colors.textInverse },
    warning: { bg: colors.warning, text: colors.textInverse },
    muted: { bg: colors.borderLight, text: colors.textSecondary },
    soft: { bg: colors.surfaceSubtle, text: colors.textPrimary },
  };

  const v = color
    ? { bg: color, text: colors.textInverse }
    : (variantColors[variant] || variantColors.primary);

  if (dot) {
    return (
      <View style={[s.dot, { backgroundColor: v.bg }, style]} />
    );
  }

  const baseText = title || label;
  const displayText = count !== undefined
    ? (count > 99 ? '99+' : String(count))
    : baseText;

  return (
    <View style={[
      s.badge,
      size === 'sm' && s.badgeSm,
      { backgroundColor: v.bg },
      style,
    ]}>
      <Text style={[
        s.text,
        size === 'sm' && s.textSm,
        { color: v.text },
      ]}>
        {icon ? `${icon} ${displayText}` : displayText}
      </Text>
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
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
}

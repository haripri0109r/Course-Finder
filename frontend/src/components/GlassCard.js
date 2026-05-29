import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RADIUS, SPACING, SHADOW } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

/**
 * GlassCard — semi-transparent card with border glow.
 * Use for floating elements, modals, or emphasis cards.
 * In dark mode: uses surface with border glow instead of transparency.
 */
export default function GlassCard({
  children,
  style,
  padded = true,
  intensity = 'medium', // 'light' | 'medium' | 'strong'
  glow = false,
}) {
  const { colors, isDark } = useAppTheme();

  const opacityMap = { light: 0.5, medium: 0.7, strong: 0.85 };
  const bgOpacity = opacityMap[intensity] || 0.7;

  const bgColor = isDark
    ? colors.surfaceCard
    : `rgba(255, 255, 255, ${bgOpacity})`;

  const borderColor = glow
    ? colors.accent
    : isDark
    ? colors.borderMedium
    : `rgba(255, 255, 255, 0.3)`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: glow ? 1.5 : 1,
        },
        glow && {
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 6,
        },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  padded: {
    padding: SPACING.lg,
  },
});

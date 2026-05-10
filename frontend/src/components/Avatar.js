import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, LAYOUT } from '../utils/theme';

/**
 * Premium Avatar component with fallback initials
 * Sizes: xs | sm | md | lg | xl | xxl
 */
export default function Avatar({
  uri,
  name = '',
  size = 'md',
  style,
  borderColor,
  showBorder = false,
}) {
  const fallbackSizes = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64, xxl: 80 };
  const dim = LAYOUT.avatarSizes?.[size] || fallbackSizes[size] || fallbackSizes.md;
  const fontSize = dim * 0.38;
  const safeName = typeof name === 'string' ? name : '';
  const initial = (safeName || 'U').charAt(0).toUpperCase();

  const borderStyle = showBorder
    ? { borderWidth: 2, borderColor: borderColor || COLORS.primary }
    : {};

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: dim, height: dim, borderRadius: dim / 2 },
          borderStyle,
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: dim, height: dim, borderRadius: dim / 2 },
        borderStyle,
        style,
      ]}
    >
      <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: COLORS.borderLight,
  },
  placeholder: {
    backgroundColor: COLORS.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

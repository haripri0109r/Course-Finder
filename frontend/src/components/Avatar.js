import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LAYOUT } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

export default function Avatar({
  uri,
  name = '',
  size = 'md',
  style,
  borderColor,
  showBorder = false,
}) {
  const { colors } = useAppTheme();
  const dim = LAYOUT.avatarSizes?.[size] || 40;
  const fontSize = dim * 0.38;
  const safeName = typeof name === 'string' ? name : '';
  const initial = (safeName || 'U').charAt(0).toUpperCase();

  const borderStyle = showBorder
    ? { borderWidth: 2, borderColor: borderColor || colors.primary }
    : {};

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: colors.borderLight },
          borderStyle,
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: colors.surfaceSubtle, justifyContent: 'center', alignItems: 'center' },
        borderStyle,
        style,
      ]}
    >
      <Text style={[{ fontWeight: '600', color: colors.textSecondary, fontSize }]}>{initial}</Text>
    </View>
  );
}

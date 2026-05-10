import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOW } from '../utils/theme';

export default function Card({ children, style, padded = true, elevated = false }) {
  return (
    <View style={[styles.card, padded && styles.padded, elevated && styles.elevated, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
  },
  padded: {
    padding: SPACING.md,
  },
  elevated: {
    ...SHADOW.xs,
  },
});

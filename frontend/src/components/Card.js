import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { RADIUS, SPACING, SHADOW } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

export default function Card({ children, style, padded = true, elevated = false }) {
  const { colors } = useAppTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[s.card, padded && s.padded, elevated && s.elevated, style]}>
      {children}
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: RADIUS.lg,
    },
    padded: {
      padding: SPACING.md,
    },
    elevated: {
      ...SHADOW.xs,
    },
  });
}

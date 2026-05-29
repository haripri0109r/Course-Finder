import React, { useMemo } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { FONTS, SPACING } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

export default function Loader({ message, size = 'large', style }) {
  const { colors } = useAppTheme();
  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[s.container, style]}>
      <ActivityIndicator size={size} color={colors.accent} />
      {message && <Text style={s.message}>{message}</Text>}
    </View>
  );
}

function createStyles(c) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: SPACING.xxxl,
    },
    message: {
      ...FONTS.caption,
      color: c.textMuted,
      marginTop: SPACING.md,
    },
  });
}

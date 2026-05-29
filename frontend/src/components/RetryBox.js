import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, FONTS, RADIUS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
import PrimaryButton from './PrimaryButton';

export default function RetryBox({ message, onRetry, error }) {
  const { colors } = useAppTheme();
  const s = styles(colors);

  return (
    <View style={s.container}>
      <View style={s.iconContainer}>
        <Text style={s.icon}>!</Text>
      </View>

      <Text style={s.message}>{message || 'Something went wrong'}</Text>

      {error && (
        <View style={s.errorContainer}>
          <Text style={s.errorText}>{error.message || String(error)}</Text>
        </View>
      )}

      <PrimaryButton
        title="Try Again"
        onPress={onRetry}
        variant="secondary"
        size="md"
        style={s.button}
        icon="↻"
      />
    </View>
  );
}

const styles = (colors) => StyleSheet.create({
  container: {
    padding: SPACING['5xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    backgroundColor: colors.background,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    backgroundColor: colors.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  icon: {
    fontSize: 28,
    color: colors.danger,
    fontWeight: '700',
  },
  message: {
    ...FONTS.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  errorContainer: {
    backgroundColor: colors.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING['3xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    width: '100%',
  },
  errorText: {
    ...FONTS.tiny,
    color: colors.danger,
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    minWidth: 160,
  },
});

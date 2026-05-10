import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONTS, RADIUS } from '../utils/theme';
import PrimaryButton from './PrimaryButton';

/**
 * Premium error state with retry action
 */
export default function RetryBox({ message, onRetry, error }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>!</Text>
      </View>
      
      <Text style={styles.message}>{message || 'Something went wrong'}</Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error.message || String(error)}</Text>
        </View>
      )}
      
      <PrimaryButton
        title="Try Again"
        onPress={onRetry}
        variant="secondary"
        size="md"
        style={styles.button}
        icon="↻"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING['5xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    backgroundColor: COLORS.background,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  icon: {
    fontSize: 28,
    color: COLORS.danger,
    fontWeight: '700',
  },
  message: {
    ...FONTS.h3,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  errorContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING['3xl'],
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    width: '100%',
  },
  errorText: {
    ...FONTS.tiny,
    color: COLORS.danger,
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    minWidth: 160,
  },
});

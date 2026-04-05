import React from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS } from '../utils/theme';

export default function InputField({ label, error, containerStyle, ...rest }) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <TextInput
          style={[styles.input, rest.multiline && styles.textArea]}
          placeholderTextColor={COLORS.textMuted}
          {...rest}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...FONTS.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  inputWrapper: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  input: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
    paddingTop: SPACING.md,
  },
  errorText: {
    ...FONTS.small,
    color: COLORS.danger,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
  },
});

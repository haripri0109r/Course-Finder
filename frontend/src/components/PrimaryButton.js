import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SHADOW, SPACING } from '../utils/theme';

export default function PrimaryButton({ 
  title, 
  onPress, 
  loading = false, 
  variant = 'primary',  // 'primary' | 'secondary' | 'outline' | 'danger'
  style,
  textStyle,
  disabled = false,
}) {
  const bg = {
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    outline: 'transparent',
    danger: COLORS.danger,
  };

  const text = {
    primary: COLORS.white,
    secondary: COLORS.white,
    outline: COLORS.primary,
    danger: COLORS.white,
  };

  const isDisabled = loading || disabled;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { backgroundColor: bg[variant] },
        variant === 'outline' && styles.outline,
        variant === 'primary' && SHADOW.lg,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={text[variant]} size="small" />
      ) : (
        <Text style={[styles.text, { color: text[variant] }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  outline: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  text: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.55,
  },
});

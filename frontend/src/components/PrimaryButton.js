import React, { useRef } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View, Animated } from 'react-native';
import { COLORS, RADIUS, SHADOW, SPACING, FONTS } from '../utils/theme';

/**
 * Product-grade button system with subtle micro-interactions.
 * Variants: primary | secondary | outline | ghost | danger
 * Sizes:    lg | md | sm
 */
export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  size = 'lg',
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  disabled = false,
  fullWidth = false,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isDisabled = loading || disabled;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const variantStyles = {
    primary: { bg: COLORS.accent, text: COLORS.white, border: COLORS.accent },
    secondary: { bg: COLORS.surface, text: COLORS.textPrimary, border: COLORS.border },
    outline: { bg: 'transparent', text: COLORS.textPrimary, border: COLORS.borderMedium },
    ghost: { bg: 'transparent', text: COLORS.textSecondary, border: 'transparent' },
    danger: { bg: COLORS.danger, text: COLORS.white, border: COLORS.danger },
  };

  const sizeStyles = {
    lg: { height: 48, px: 20, fontSize: 15, radius: RADIUS.lg },
    md: { height: 42, px: 16, fontSize: 14, radius: RADIUS.md },
    sm: { height: 36, px: 12, fontSize: 13, radius: RADIUS.sm },
  };

  const v = variantStyles[variant] || variantStyles.primary;
  const s = sizeStyles[size] || sizeStyles.lg;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: '100%' }]}>
      <TouchableOpacity
        style={[
          styles.base,
          {
            backgroundColor: v.bg,
            height: s.height,
            paddingHorizontal: s.px,
            borderRadius: s.radius,
            borderColor: v.border,
            borderWidth: variant === 'ghost' ? 0 : 1,
          },
          variant === 'primary' && SHADOW.xs,
          isDisabled && styles.disabled,
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        disabled={isDisabled}
      >
        {loading ? (
          <ActivityIndicator color={v.text} size="small" />
        ) : (
          <View style={styles.contentRow}>
            {icon && iconPosition === 'left' && (
              <Text style={[styles.icon, { color: v.text }]}>{icon}</Text>
            )}
            <Text style={[
              styles.btnText,
              { color: v.text, fontSize: s.fontSize },
              textStyle,
            ]}>
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <Text style={[styles.icon, styles.iconRight, { color: v.text }]}>{icon}</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnText: {
    ...FONTS.bodyBold,
    letterSpacing: 0.1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  iconRight: {
    marginRight: 0,
    marginLeft: SPACING.sm,
  },
  disabled: {
    opacity: 0.5,
  },
});

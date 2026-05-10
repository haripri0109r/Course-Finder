import React, { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, Platform, Animated } from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS } from '../utils/theme';

export default function InputField({
  label,
  error,
  containerStyle,
  icon,
  suffix,
  onSuffixPress,
  ...rest
}) {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? COLORS.danger : COLORS.border, COLORS.accent],
  });

  const bgColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.background, COLORS.surface],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[
          styles.label, 
          isFocused && styles.labelFocused,
          !!error && styles.labelError
        ]}>
          {label}
        </Text>
      )}
      
      <Animated.View
        style={[
          styles.inputWrapper,
          { borderColor, backgroundColor: bgColor },
          error && styles.errorWrapper,
        ]}
      >
        {icon && <Text style={styles.icon}>{icon}</Text>}
        
        <TextInput
          style={[
            styles.input,
            rest.multiline && styles.textArea,
          ]}
          placeholderTextColor={COLORS.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
        
        {suffix && (
          <TouchableOpacity
            onPress={onSuffixPress}
            style={styles.suffixBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.suffixText}>{suffix}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xl,
    width: '100%',
  },
  label: {
    ...FONTS.captionBold,
    marginBottom: SPACING.xs,
    color: COLORS.textSecondary,
    textTransform: 'none',
    letterSpacing: 0.1,
  },
  labelFocused: {
    color: COLORS.accent,
  },
  labelError: {
    color: COLORS.danger,
  },
  inputWrapper: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    minHeight: 48,
  },
  errorWrapper: {
    borderColor: COLORS.danger,
  },
  icon: {
    fontSize: 16,
    marginRight: SPACING.md,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    minHeight: 44,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: SPACING.md,
  },
  suffixBtn: {
    padding: SPACING.sm,
  },
  suffixText: {
    fontSize: 18,
    opacity: 0.6,
  },
  errorText: {
    ...FONTS.small,
    color: COLORS.danger,
    marginTop: 6,
  },
});

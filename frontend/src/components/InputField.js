import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { RADIUS, SPACING, FONTS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

export default function InputField({
  label,
  error,
  containerStyle,
  icon,
  suffix,
  onSuffixPress,
  ...rest
}) {
  const { colors } = useAppTheme();
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
    outputRange: [error ? colors.danger : colors.border, colors.accent],
  });

  const bgColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.background, colors.surface],
  });

  const labelStyle = useMemo(() => {
    if (error) return { color: colors.danger };
    if (isFocused) return { color: colors.accent };
    return { color: colors.textSecondary };
  }, [error, isFocused, colors]);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}

      <Animated.View
        style={[
          styles.inputWrapper,
          { borderColor, backgroundColor: bgColor },
          error && { borderColor: colors.danger },
        ]}
      >
        {icon ? <Text style={[styles.icon, { color: colors.textMuted }]}>{icon}</Text> : null}

        <TextInput
          style={[styles.input, { color: colors.textPrimary }, rest.multiline && styles.textArea]}
          placeholderTextColor={colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />

        {suffix ? (
          <TouchableOpacity onPress={onSuffixPress} style={styles.suffixBtn} activeOpacity={0.7}>
            <Text style={[styles.suffixText, { color: colors.textSecondary }]}>{suffix}</Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      ) : null}
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
    textTransform: 'none',
    letterSpacing: 0.1,
  },
  inputWrapper: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    minHeight: 48,
  },
  icon: {
    fontSize: 16,
    marginRight: SPACING.md,
    opacity: 0.85,
  },
  input: {
    flex: 1,
    ...FONTS.body,
    fontSize: 14,
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
    opacity: 0.85,
  },
  errorText: {
    ...FONTS.small,
    marginTop: 6,
  },
});

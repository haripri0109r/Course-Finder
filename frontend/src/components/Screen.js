import React from 'react';
import { View, StyleSheet, StatusBar, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

/**
 * Screen — consistent safe area + status bar + keyboard dismissal wrapper.
 * Use this instead of raw SafeAreaView for all screens.
 *
 * Props:
 *   children
 *   style           — extra style for the inner content
 *   barStyle        — 'light-content' | 'dark-content' (auto-detected if omitted)
 *   noScroll        — if true, skip the KeyboardAvoidingView wrapper
 *   dismissKeyboard — dismiss keyboard on tap outside (default true for form screens)
 *   padded          — add horizontal padding (default false)
 *   unsafe          — skip safe area edges (for modal screens that handle their own)
 *   edges           — which edges to apply safe area to (default: ['top'])
 */
export default function Screen({
  children,
  style,
  barStyle,
  noScroll = false,
  dismissKeyboard = false,
  padded = false,
  unsafe = false,
  edges = ['top'],
  footer,
}) {
  const { colors, isDark } = useAppTheme();
  const resolvedBarStyle = barStyle || (isDark ? 'light-content' : 'dark-content');

  const content = (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <StatusBar
        barStyle={resolvedBarStyle}
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />
      {children}
      {footer}
    </View>
  );

  if (unsafe) {
    return content;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={edges}
    >
      {dismissKeyboard ? (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          {content}
        </TouchableWithoutFeedback>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

/**
 * ScreenInset — gives you the raw inset values for manual positioning.
 * Use when you need fine-grained control.
 */
export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  return {
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
    // Pre-computed padding for common layouts
    headerPadding: Math.max(insets.top, 12),
    bottomTabPadding: Math.max(insets.bottom, 12) + 68 + 16,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

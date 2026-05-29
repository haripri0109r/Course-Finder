import React from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  View,
} from 'react-native';
import { SPACING } from '../utils/theme';

/**
 * KeyboardAwareForm — wraps form content in a keyboard-aware scroll view.
 * Use for all form screens (Login, Register, ProfileEdit, AddCourse steps).
 *
 * Props:
 *   children
 *   style            — extra style for the ScrollView content
 *   contentContainerStyle — override content container
 *   showsVerticalScrollIndicator — default false
 *   keyboardShouldPersistTaps — default 'handled'
 *   bounces          — scroll bounce (default true)
 *   centered         — center content vertically (for auth screens)
 */
export default function KeyboardAwareForm({
  children,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  keyboardShouldPersistTaps = 'handled',
  bounces = true,
  centered = false,
}) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          style={[styles.flex, style]}
          contentContainerStyle={[
            styles.content,
            centered && styles.centered,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          bounces={bounces}
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING['4xl'],
  },
  centered: {
    justifyContent: 'center',
  },
});

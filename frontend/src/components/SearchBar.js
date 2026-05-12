import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONTS, RADIUS } from '../utils/theme';

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search…',
  onSubmit,
  colors,
  rightButton,
  style,
}) {
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
      <TextInput
        style={[styles.input, { color: colors.textPrimary }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
      />
      {rightButton}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    minHeight: 44,
  },
  input: {
    flex: 1,
    marginLeft: SPACING.sm,
    ...FONTS.body,
    fontSize: 14,
    paddingVertical: 8,
  },
});

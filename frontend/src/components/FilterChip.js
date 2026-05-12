import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SPACING, FONTS, RADIUS } from '../utils/theme';

export default function FilterChip({
  label,
  selected,
  onPress,
  colors,
  style,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.surfaceSubtle,
          borderColor: selected ? colors.accent : colors.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: selected ? colors.white : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  text: {
    ...FONTS.captionBold,
    fontSize: 12,
  },
});

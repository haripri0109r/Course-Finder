import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SPACING, FONTS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

/**
 * Section header with optional right-side action link
 */
export default function SectionHeader({
  title,
  subtitle,
  icon,
  actionLabel,
  onAction,
  style,
}) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        {icon ? (
          <Text style={[styles.icon, { color: colors.textSecondary }]}>{icon}</Text>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.action, { color: colors.accent }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: SPACING.sm,
  },
  icon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  title: {
    ...FONTS.h3,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    ...FONTS.small,
    marginTop: 4,
  },
  action: {
    ...FONTS.captionBold,
  },
});

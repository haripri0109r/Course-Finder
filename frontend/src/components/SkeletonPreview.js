import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { RADIUS, SPACING, SHADOW } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

export default function SkeletonPreview() {
  const { colors } = useAppTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const boneColor = colors.shimmer;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <Animated.View style={[styles.shimmer, { backgroundColor: boneColor, opacity }]} />
      <View style={styles.content}>
        <Animated.View style={[styles.titleLine, { backgroundColor: boneColor, opacity }]} />
        <Animated.View style={[styles.smallLine, { backgroundColor: boneColor, opacity }]} />
        <View style={styles.footer}>
          <Animated.View style={[styles.chip, { backgroundColor: boneColor, opacity }]} />
          <Animated.View style={[styles.chip, { backgroundColor: boneColor, opacity }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    marginLeft: SPACING.xs,
    ...SHADOW.md,
    borderWidth: 1,
  },
  shimmer: {
    height: 140,
  },
  content: {
    padding: SPACING.lg,
  },
  titleLine: {
    height: 20,
    borderRadius: RADIUS.sm,
    width: '80%',
    marginBottom: SPACING.md,
  },
  smallLine: {
    height: 14,
    borderRadius: RADIUS.sm,
    width: '40%',
    marginBottom: SPACING.lg,
  },
  footer: {
    flexDirection: 'row',
  },
  chip: {
    height: 24,
    width: 60,
    borderRadius: RADIUS.pill,
    marginRight: SPACING.md,
  },
});

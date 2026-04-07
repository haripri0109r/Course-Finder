import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOW } from '../utils/theme';

export default function SkeletonPreview() {
  const animatedValue = new Animated.Value(0);

  React.useEffect(() => {
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
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.shimmer, { opacity }]} />
      <View style={styles.content}>
        <Animated.View style={[styles.titleLine, { opacity }]} />
        <Animated.View style={[styles.smallLine, { opacity }]} />
        <View style={styles.footer}>
          <Animated.View style={[styles.chip, { opacity }]} />
          <Animated.View style={[styles.chip, { opacity }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    marginLeft: SPACING.xs,
    ...SHADOW.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  shimmer: {
    height: 140,
    backgroundColor: COLORS.border,
  },
  content: {
    padding: SPACING.lg,
  },
  titleLine: {
    height: 20,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
    width: '80%',
    marginBottom: SPACING.md,
  },
  smallLine: {
    height: 14,
    backgroundColor: COLORS.border,
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
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.pill,
    marginRight: SPACING.md,
  }
});

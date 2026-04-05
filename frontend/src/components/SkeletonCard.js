import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../utils/theme';

export default function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Animated.View style={[styles.shimmer, { width: '40%', height: 12, opacity }]} />
          <Animated.View style={[styles.shimmer, { width: '20%', height: 10, opacity }]} />
        </View>

        <View style={styles.titleRow}>
          <Animated.View style={[styles.shimmer, { width: '80%', height: 20, opacity, marginBottom: 8 }]} />
          <Animated.View style={[styles.shimmer, { width: 32, height: 32, borderRadius: 8, opacity }]} />
        </View>

        <Animated.View style={[styles.shimmer, { width: '30%', height: 24, borderRadius: 12, opacity, marginBottom: 16 }]} />

        <Animated.View style={[styles.shimmer, { width: '100%', height: 60, borderRadius: 8, opacity, marginBottom: 16 }]} />

        <View style={styles.statsRow}>
          <Animated.View style={[styles.shimmer, { width: 40, height: 16, opacity }]} />
          <View style={styles.divider} />
          <Animated.View style={[styles.shimmer, { width: 40, height: 16, opacity }]} />
          <View style={styles.divider} />
          <Animated.View style={[styles.shimmer, { width: 40, height: 16, opacity }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    height: 180,
  },
  accent: {
    width: 6,
    backgroundColor: COLORS.border,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shimmer: {
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: SPACING.md,
  },
});

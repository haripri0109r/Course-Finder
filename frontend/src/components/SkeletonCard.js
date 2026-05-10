import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOW, ANIMATION } from '../utils/theme';

/**
 * Premium shimmer skeleton loader
 * Variants: card | detail | compact
 */
export default function SkeletonCard({ variant = 'card' }) {
  const opacity = useRef(new Animated.Value(ANIMATION.shimmer.lowOpacity)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: ANIMATION.shimmer.highOpacity,
          duration: ANIMATION.shimmer.duration,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: ANIMATION.shimmer.lowOpacity,
          duration: ANIMATION.shimmer.duration,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  const Bone = ({ width, height, radius = RADIUS.sm, mb = 0, style }) => (
    <Animated.View
      style={[
        styles.bone,
        { width, height, borderRadius: radius, marginBottom: mb, opacity },
        style,
      ]}
    />
  );

  if (variant === 'compact') {
    return (
      <View style={styles.compactCard}>
        <Bone width={60} height={60} radius={RADIUS.md} />
        <View style={styles.compactContent}>
          <Bone width="70%" height={14} mb={8} />
          <Bone width="45%" height={12} mb={6} />
          <Bone width="30%" height={10} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* Image placeholder */}
      <Bone width="100%" height={160} radius={0} mb={0} style={styles.imageBone} />

      <View style={styles.content}>
        {/* Author + time row */}
        <View style={styles.row}>
          <Bone width={28} height={28} radius={14} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Bone width="40%" height={12} mb={6} />
            <Bone width="25%" height={10} />
          </View>
        </View>

        {/* Title */}
        <Bone width="85%" height={18} mb={10} />
        <Bone width="60%" height={14} mb={16} />

        {/* Platform badge */}
        <Bone width={80} height={24} radius={RADIUS.full} mb={16} />

        {/* Description */}
        <Bone width="100%" height={12} mb={6} />
        <Bone width="90%" height={12} mb={6} />
        <Bone width="70%" height={12} mb={20} />

        {/* Stats row */}
        <View style={styles.row}>
          <Bone width={50} height={16} />
          <Bone width={50} height={16} style={{ marginLeft: 20 }} />
          <Bone width={50} height={16} style={{ marginLeft: 20 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  imageBone: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  content: {
    padding: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  bone: {
    backgroundColor: COLORS.shimmer,
  },

  // Compact variant
  compactCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOW.xs,
  },
  compactContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
});

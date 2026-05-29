import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { RADIUS, SPACING, SHADOW, ANIMATION } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

export default function SkeletonCard({ variant = 'card' }) {
  const { colors } = useAppTheme();
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

  const s = styles(colors);

  const Bone = ({ w, h, radius = RADIUS.sm, mb = 0, style: extraStyle }) => (
    <Animated.View
      style={[
        s.bone,
        { width: w, height: h, borderRadius: radius, marginBottom: mb, opacity },
        extraStyle,
      ]}
    />
  );

  if (variant === 'compact') {
    return (
      <View style={s.compactCard}>
        <Bone w={60} h={60} radius={RADIUS.md} />
        <View style={s.compactContent}>
          <Bone w="70%" h={14} mb={8} />
          <Bone w="45%" h={12} mb={6} />
          <Bone w="30%" h={10} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <Bone w="100%" h={160} radius={0} mb={0} style={s.imageBone} />
      <View style={s.content}>
        <View style={s.row}>
          <Bone w={28} h={28} radius={14} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Bone w="40%" h={12} mb={6} />
            <Bone w="25%" h={10} />
          </View>
        </View>
        <Bone w="85%" h={18} mb={10} />
        <Bone w="60%" h={14} mb={16} />
        <Bone w={80} h={24} radius={RADIUS.full} mb={16} />
        <Bone w="100%" h={12} mb={6} />
        <Bone w="90%" h={12} mb={6} />
        <Bone w="70%" h={12} mb={20} />
        <View style={s.row}>
          <Bone w={50} h={16} />
          <Bone w={50} h={16} style={{ marginLeft: 20 }} />
          <Bone w={50} h={16} style={{ marginLeft: 20 }} />
        </View>
      </View>
    </View>
  );
}

const styles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
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
    backgroundColor: colors.shimmer,
  },
  compactCard: {
    backgroundColor: colors.surface,
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

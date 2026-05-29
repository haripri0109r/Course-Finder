import React, { useEffect, useRef } from 'react';

import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, RADIUS, ANIMATION } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

export default function SkeletonDetail() {
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

  const Bone = ({ width, height, radius = RADIUS.sm, mb = 0, style: extraStyle }) => (
    <Animated.View
      style={[
        { backgroundColor: colors.shimmer },
        { width, height, borderRadius: radius, marginBottom: mb, opacity },
        extraStyle,
      ]}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Bone width="100%" height={380} radius={0} />

        <View style={s(colors).body}>
          <View style={s(colors).authorCard}>
            <Bone width={40} height={40} radius={20} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Bone width="40%" height={12} mb={6} />
              <Bone width="25%" height={10} />
            </View>
          </View>

          <View style={s(colors).statsRow}>
            <Bone width="45%" height={60} radius={RADIUS.lg} />
            <Bone width="45%" height={60} radius={RADIUS.lg} />
          </View>

          <Bone width="60%" height={18} mb={16} />
          <Bone width="100%" height={12} mb={8} />
          <Bone width="100%" height={12} mb={8} />
          <Bone width="90%" height={12} mb={24} />

          <Bone width="50%" height={18} mb={16} />
          <Bone width="100%" height={80} radius={RADIUS.md} mb={24} />

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Bone width={60} height={24} radius={RADIUS.sm} style={{ marginRight: 8 }} />
            <Bone width={70} height={24} radius={RADIUS.sm} style={{ marginRight: 8 }} />
            <Bone width={50} height={24} radius={RADIUS.sm} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = (colors) => StyleSheet.create({
  body: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    marginTop: -RADIUS.xxl,
    padding: SPACING.xl,
  },
  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: colors.background,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xxl,
  },
});

import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { ANIMATION, RADIUS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

export default function LoadingSkeleton({ width = '100%', height = 14, style, radius = RADIUS.sm }) {
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

  return (
    <Animated.View
      style={[{ backgroundColor: colors.shimmer, width, height, borderRadius: radius, opacity }, style]}
    />
  );
}

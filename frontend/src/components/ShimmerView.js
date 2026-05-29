import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { RADIUS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

/**
 * ShimmerView — a shimmer effect container for skeleton loading.
 * Uses a moving highlight band instead of simple opacity pulse.
 * Wrap bone elements inside for a premium loading feel.
 */
export default function ShimmerView({
  children,
  width = '100%',
  height = 20,
  radius = RADIUS.sm,
  style,
}) {
  const { colors } = useAppTheme();
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [translateX]);

  const shimmerOpacity = translateX.interpolate({
    inputRange: [-1, -0.3, 0, 0.3, 1],
    outputRange: [0.4, 0.4, 0.8, 0.4, 0.4],
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.shimmer,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.surface,
            opacity: shimmerOpacity,
          },
        ]}
      />
      {children}
    </View>
  );
}

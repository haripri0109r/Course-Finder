import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { triggerHaptic } from '../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = {
  damping: 12,
  stiffness: 200,
  mass: 0.5,
};

/**
 * AnimatedToggle — a bouncy toggle button for bookmark, like, follow.
 * Uses reanimated spring physics for a satisfying "click" feel.
 *
 * @param {boolean} active - current toggle state
 * @param {function} onToggle - called when toggled
 * @param {function} children - render function: ({ active, animatedStyle }) => JSX
 * @param {string} haptic - haptic feedback type
 */
export default function AnimatedToggle({
  active,
  onToggle,
  children,
  haptic = 'impactMedium',
  style,
  disabled = false,
}) {
  const scale = useSharedValue(1);
  const bounce = useSharedValue(active ? 1 : 0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.85, SPRING_CONFIG);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, SPRING_CONFIG);
    }
  };

  const handlePress = () => {
    if (disabled) return;
    if (haptic) triggerHaptic(haptic);

    // Celebration bounce: scale down → up → settle
    scale.value = withSequence(
      withSpring(0.85, { ...SPRING_CONFIG, stiffness: 300 }),
      withSpring(1.15, { ...SPRING_CONFIG, stiffness: 300 }),
      withSpring(1, SPRING_CONFIG)
    );

    onToggle?.(!active);
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={[style, animatedStyle]}
    >
      {typeof children === 'function'
        ? children({ active, animatedStyle })
        : children}
    </AnimatedPressable>
  );
}

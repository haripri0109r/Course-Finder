import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { triggerHaptic } from '../utils/haptics';

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
  mass: 0.5,
};

export default function AnimatedPressable({
  children,
  onPress,
  style,
  haptic = 'impactLight',
  scaleTo = 0.96,
  disabled = false,
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(scaleTo, SPRING_CONFIG);
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
    onPress?.();
  };

  return (
    <AnimatedPressableComponent
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressableComponent>
  );
}

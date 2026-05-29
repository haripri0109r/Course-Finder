import React from 'react';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideInUp,
  SlideInRight,
  Layout,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

/**
 * AnimatedEntry — wraps children with a fade+slide entering animation.
 * Use in FlatList renderItem or standalone sections.
 *
 * @param {number} delay - stagger delay in ms (default 0)
 * @param {string} direction - 'up' | 'down' | 'right' (default 'up')
 * @param {number} duration - animation duration in ms (default 300)
 */
export function AnimatedEntry({
  children,
  delay = 0,
  direction = 'up',
  duration = 300,
  style,
  layout = true,
}) {
  const entering = direction === 'down'
    ? SlideInDown.delay(delay).duration(duration).springify().damping(18)
    : direction === 'right'
    ? SlideInRight.delay(delay).duration(duration).springify().damping(18)
    : SlideInUp.delay(delay).duration(duration).springify().damping(18);

  return (
    <Animated.View
      entering={entering}
      exiting={FadeOut.duration(150)}
      layout={layout ? Layout.springify().damping(18) : undefined}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/**
 * AnimatedLayout — provides layout animation for items that change position.
 * Use as a wrapper around FlatList items for smooth reorder/remove animations.
 */
export function AnimatedLayout({ children, style }) {
  return (
    <Animated.View
      layout={Layout.springify().damping(18).stiffness(120)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

/**
 * StaggeredList — renders children with staggered entry animations.
 * Use for small lists (< 20 items) where you want a cascade effect.
 */
export function StaggeredList({ children, baseDelay = 50, stagger = 60 }) {
  return React.Children.map(children, (child, index) => (
    <AnimatedEntry delay={baseDelay + index * stagger} direction="up">
      {child}
    </AnimatedEntry>
  ));
}

export default AnimatedEntry;

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SPACING, FONTS, RADIUS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TAB_CONFIG = {
  Home: { icon: 'home-outline', iconFocused: 'home', label: 'Home' },
  Search: { icon: 'compass-outline', iconFocused: 'compass', label: 'Explore' },
  Add: { icon: 'add', iconFocused: 'add', label: 'Add', center: true },
  Inbox: {
    icon: 'notifications-outline',
    iconFocused: 'notifications',
    label: 'Alerts',
  },
  Profile: { icon: 'person-outline', iconFocused: 'person', label: 'Profile' },
};

const SPRING = { damping: 15, stiffness: 250, mass: 0.5 };

// Minimum touch target: 48px (iOS HIG recommends 44px, we go bigger)
const MIN_TOUCH = 48;

function TabButton({ route, isFocused, onPress, cfg, colors }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, SPRING);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING);
  };

  const handlePress = () => {
    triggerHaptic('impactLight');
    onPress();
  };

  const iconName = isFocused ? cfg.iconFocused : cfg.icon;
  const iconColor = isFocused ? colors.accent : colors.textMuted;

  if (cfg.center) {
    return (
      <Animated.View style={[styles.fabWrap, animStyle]}>
        <AnimatedPressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          style={[styles.fab, { backgroundColor: colors.accent }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={iconName} size={28} color={colors.white} />
        </AnimatedPressable>
      </Animated.View>
    );
  }

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[styles.tab, animStyle]}
    >
      {/* Active indicator pill */}
      {isFocused && (
        <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]} />
      )}
      <Ionicons name={iconName} size={23} color={iconColor} />
      <Text
        style={[
          styles.tabLabel,
          {
            color: iconColor,
            fontFamily: isFocused ? FONTS.captionBold.fontFamily : FONTS.small.fontFamily,
            fontWeight: isFocused ? '600' : '500',
          },
        ]}
      >
        {cfg.label}
      </Text>
    </AnimatedPressable>
  );
}

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  // Proper safe area: at least 12px below bar, plus device safe area
  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <View style={styles.outerWrap} pointerEvents="box-none">
      {/* Background blur layer */}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.black,
            marginBottom: bottomPad,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const cfg = TAB_CONFIG[route.name] || {
            icon: 'ellipse-outline',
            iconFocused: 'ellipse',
            label: route.name,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabButton
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
              cfg={cfg}
              colors={colors}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '92%',
    height: 68,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    paddingVertical: 6,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
});

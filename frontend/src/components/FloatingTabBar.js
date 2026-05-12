import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, FONTS, LAYOUT } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';

const TAB_CONFIG = {
  Home: { icon: 'home', iconFocused: 'home', label: 'Home' },
  Search: { icon: 'compass-outline', iconFocused: 'compass', label: 'Explore' },
  Add: { icon: 'add', iconFocused: 'add', label: 'Add', center: true },
  Inbox: {
    icon: 'notifications-outline',
    iconFocused: 'notifications',
    label: 'Notifications',
  },
  Profile: { icon: 'person-outline', iconFocused: 'person', label: 'Profile' },
};

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const bottom = Math.max(insets.bottom, SPACING.sm);

  return (
    <View
      style={[styles.wrap, { paddingBottom: bottom }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.black,
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

          const color = cfg.center
            ? colors.white
            : isFocused
              ? colors.accent
              : colors.textSecondary;
          const iconName = isFocused ? cfg.iconFocused : cfg.icon;
          const size = cfg.center ? 28 : 22;

          return (
            <TabButton
              key={route.key}
              onPress={onPress}
              isFocused={isFocused}
              colors={colors}
              center={cfg.center}
              accessibilityLabel={options.tabBarAccessibilityLabel}
            >
              <Ionicons name={iconName} size={size} color={color} />
              {!cfg.center && (
                <Text
                  style={[
                    styles.label,
                    { color },
                  ]}
                  numberOfLines={1}
                >
                  {cfg.label}
                </Text>
              )}
            </TabButton>
          );
        })}
      </View>
    </View>
  );
}

function TabButton({ children, onPress, isFocused, colors, center, accessibilityLabel }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  if (center) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || 'Add course'}
        style={styles.centerWrap}
      >
        <Animated.View
          style={[
            styles.centerFab,
            {
              backgroundColor: colors.accent,
              transform: [{ scale }],
              shadowColor: colors.accent,
            },
          ]}
        >
          {children}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.tabBtn}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        {isFocused && (
          <View
            style={[styles.activePill, { backgroundColor: colors.accentLight }]}
          />
        )}
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

const BAR_WIDTH = Math.min(LAYOUT.window.width - SPACING.xl * 2, 420);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: BAR_WIDTH,
    minHeight: 58,
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? 4 : 6,
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0.08,
    shadowRadius: 24,
    elevation: 12,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  activePill: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  label: {
    ...FONTS.small,
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  centerWrap: {
    marginTop: -22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});

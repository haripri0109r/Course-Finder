import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import PrimaryButton from '../components/PrimaryButton';
import { SPACING, FONTS, RADIUS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
import { ONBOARDING_STORAGE_KEY } from '../constants/onboarding';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    title: 'Your learning portfolio',
    body: 'Log courses you finish, attach certificates, and build a profile that speaks for itself.',
    icon: 'ribbon-outline',
    accent: '#6366F1',
  },
  {
    key: '2',
    title: 'Discover & connect',
    body: 'Explore trending skills, follow peers, and celebrate wins in a feed built for learners.',
    icon: 'compass-outline',
    accent: '#0EA5E9',
  },
  {
    key: '3',
    title: 'Built for momentum',
    body: 'Track streaks, earn achievements, and turn learning into a daily habit.',
    icon: 'flame-outline',
    accent: '#F59E0B',
  },
  {
    key: '4',
    title: 'Ready when you are',
    body: 'Add your first completion in seconds. Metadata autofetch and uploads are built in.',
    icon: 'rocket-outline',
    accent: '#10B981',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const { colors, isDark } = useAppTheme();
  const s = createStyles(colors);
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    onComplete?.();
  };

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      finish();
    }
  };

  const onMomentumEnd = useCallback((e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  }, []);

  const renderItem = useCallback(
    ({ item, index: slideIndex }) => (
      <View style={s.slide}>
        <Animated.View
          entering={FadeInDown.delay(slideIndex * 100).duration(400).springify()}
          style={[s.iconCircle, { backgroundColor: item.accent + '18' }]}
        >
          <Ionicons name={item.icon} size={48} color={item.accent} />
        </Animated.View>
        <Animated.Text
          entering={FadeInUp.delay(200 + slideIndex * 100).duration(300)}
          style={s.title}
        >
          {item.title}
        </Animated.Text>
        <Animated.Text
          entering={FadeInUp.delay(300 + slideIndex * 100).duration(300)}
          style={s.body}
        >
          {item.body}
        </Animated.Text>
      </View>
    ),
    [colors]
  );

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.progressRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                s.progressDot,
                i === index && s.progressDotActive,
                i < index && s.progressDotDone,
                { backgroundColor: i <= index ? colors.accent : colors.border },
              ]}
            />
          ))}
        </View>
        {index < SLIDES.length - 1 && (
          <TouchableOpacity onPress={finish} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
      />

      {/* Footer */}
      <Animated.View entering={FadeIn.delay(400).duration(300)} style={s.footer}>
        <PrimaryButton
          title={index === SLIDES.length - 1 ? 'Get started' : 'Next'}
          onPress={goNext}
          fullWidth
          icon={index === SLIDES.length - 1 ? 'arrow-forward' : undefined}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.xl,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.md,
    },
    progressRow: {
      flexDirection: 'row',
      gap: 6,
    },
    progressDot: {
      width: 24,
      height: 4,
      borderRadius: 2,
    },
    progressDotActive: {
      width: 32,
    },
    progressDotDone: {
      opacity: 0.6,
    },
    skipText: {
      ...FONTS.caption,
      color: colors.textMuted,
    },
    slide: {
      width,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING['4xl'],
    },
    iconCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING['3xl'],
    },
    title: {
      ...FONTS.h1,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: SPACING.md,
    },
    body: {
      ...FONTS.body,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: SPACING.md,
    },
    footer: {
      paddingHorizontal: SPACING.xl,
      paddingBottom: SPACING['3xl'],
    },
  });
}

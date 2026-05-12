import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../components/PrimaryButton';
import { SPACING, FONTS, RADIUS } from '../utils/theme';
import { useAppTheme } from '../context/ThemeContext';
import { ONBOARDING_STORAGE_KEY } from '../constants/onboarding';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    title: 'Your learning portfolio',
    body: 'Log courses you finish, attach certificates, and build a profile investors and hiring managers trust.',
    icon: 'ribbon-outline',
  },
  {
    key: '2',
    title: 'Discover & connect',
    body: 'Explore trending skills, follow peers, and celebrate wins in a feed built for professionals.',
    icon: 'people-outline',
  },
  {
    key: '3',
    title: 'Ready when you are',
    body: 'Add your first completion in minutes. Metadata autofetch and uploads are built in.',
    icon: 'rocket-outline',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const { colors, isDark } = useAppTheme();
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

  const onMomentumEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={finish} hitSlop={12}>
          <Text style={[styles.skip, { color: colors.accent }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise((r) => setTimeout(r, 500));
          wait.then(() => {
            listRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.accentLight }]}>
              <Ionicons name={item.icon} size={48} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === index ? colors.accent : colors.border },
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title={index === SLIDES.length - 1 ? 'Get started' : 'Next'}
          onPress={goNext}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    alignItems: 'flex-end',
  },
  skip: { ...FONTS.captionBold, fontSize: 15 },
  slide: {
    paddingHorizontal: SPACING['3xl'],
    paddingTop: SPACING['3xl'],
    alignItems: 'center',
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING['3xl'],
  },
  title: {
    ...FONTS.h1,
    fontSize: 26,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  body: {
    ...FONTS.body,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: SPACING.lg,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING['3xl'],
  },
});

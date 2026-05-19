import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

/** Light theme — default export `COLORS` keeps existing imports working */
export const LIGHT_COLORS = {
  primary: '#0F172A',
  accent: '#2563EB',
  accentLight: '#DBEAFE',
  accentDark: '#1D4ED8',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',

  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',

  success: '#16A34A',
  successSoft: '#ECFDF5',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  info: '#3B82F6',
  infoSoft: '#EFF6FF',

  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderMedium: '#CBD5E1',
  shimmer: '#E2E8F0',

  platforms: {
    Udemy: '#A435F0',
    Coursera: '#0056D2',
    YouTube: '#FF0000',
    LinkedIn: '#0A66C2',
    Other: '#64748B',
  },
  primarySoft: '#E2E8F0',
  secondary: '#64748B',
  card: '#FFFFFF',
};

/** Premium dark — layered slate, not a flat invert */
export const DARK_COLORS = {
  primary: '#F8FAFC',
  accent: '#60A5FA',
  accentLight: 'rgba(96, 165, 250, 0.15)',
  accentDark: '#3B82F6',

  background: '#020617',
  surface: '#0F172A',
  surfaceCard: '#1E293B',
  surfaceSubtle: '#1E293B',

  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#020617',
  white: '#FFFFFF',
  black: '#000000',

  success: '#4ADE80',
  successSoft: 'rgba(74, 222, 128, 0.12)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.12)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.12)',
  info: '#60A5FA',
  infoSoft: 'rgba(96, 165, 250, 0.12)',

  border: '#334155',
  borderLight: '#1E293B',
  borderMedium: '#475569',
  shimmer: '#334155',

  platforms: {
    Udemy: '#C084FC',
    Coursera: '#60A5FA',
    YouTube: '#F87171',
    LinkedIn: '#38BDF8',
    Other: '#94A3B8',
  },
  primarySoft: '#334155',
  secondary: '#94A3B8',
  card: '#1E293B',
};

export const COLORS = LIGHT_COLORS;

export const SPACING = {
  xs: 8,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
  xxxl: 48,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 24,
  pill: 999,
  full: 999,
};

/**
 * FONTS — typography tokens WITHOUT hardcoded colors.
 * Colors should come from useAppTheme().colors in components.
 * This ensures dark mode works correctly everywhere.
 *
 * Usage in components:
 *   <Text style={[FONTS.h1, { color: colors.textPrimary }]}>
 */
export const FONTS = {
  // Display
  display: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 40,
  },
  // Headings
  h1: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  // Body
  body: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  // Small
  caption: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  small: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  tiny: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  // Interactive
  label: {
    fontSize: 14,
    fontWeight: '600',
  }
};

/**
 * Factory: creates FONTS with colors baked in (for StyleSheet.create usage).
 * Use in screens: const fonts = createFonts(colors);
 */
export const createFonts = (colors) => ({
  display: { ...FONTS.display, color: colors.textPrimary },
  h1: { ...FONTS.h1, color: colors.textPrimary },
  h2: { ...FONTS.h2, color: colors.textPrimary },
  h3: { ...FONTS.h3, color: colors.textPrimary },
  body: { ...FONTS.body, color: colors.textSecondary },
  bodyMedium: { ...FONTS.bodyMedium, color: colors.textPrimary },
  bodyBold: { ...FONTS.bodyBold, color: colors.textPrimary },
  caption: { ...FONTS.caption, color: colors.textMuted },
  captionBold: { ...FONTS.captionBold, color: colors.textSecondary },
  small: { ...FONTS.small, color: colors.textSecondary },
  tiny: { ...FONTS.tiny, color: colors.textMuted },
  label: { ...FONTS.label, color: colors.textPrimary },
});

export const SHADOW = {
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  accent: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  }
};

export const LAYOUT = {
  window: { width, height },
  isSmallDevice: width < 375,
  safeBottom: Platform.OS === 'ios' ? 34 : 16,
  tabBarHeight: 64,
  floatingNavBottom: Platform.OS === 'ios' ? 24 : 16,
  avatarSizes: { xs: 24, sm: 32, md: 40, lg: 48, xl: 64, xxl: 80 },
};

export const ANIMATION = {
  tap: {
    scale: 0.97,
    duration: 100,
  },
  shimmer: {
    duration: 1500,
    lowOpacity: 0.4,
    highOpacity: 0.7,
  }
};

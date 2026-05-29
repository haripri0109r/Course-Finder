import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// ─── Signature accent: warm indigo-violet ───────────────────────────
// Reads as "AI-native" and "premium" — distinct from generic blue.
const ACCENT_LIGHT = '#6366F1';
const ACCENT_DARK = '#818CF8';

/** Light theme — default export `COLORS` keeps existing imports working */
export const LIGHT_COLORS = {
  primary: '#0F172A',
  accent: ACCENT_LIGHT,
  accentLight: '#E0E7FF',
  accentDark: '#4F46E5',

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
  accent: ACCENT_DARK,
  accentLight: 'rgba(129, 140, 248, 0.15)',
  accentDark: '#6366F1',

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

// ─── Spacing — 4px base grid ────────────────────────────────────────
// Original values preserved for backward compatibility.
// New tokens: xxs(4), md2(12) for the proper 4px grid.
export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 8,       // backward compat — same as xs
  md2: 12,     // proper 4px grid step between sm(8) and md(16)
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  '2xl': 40,   // alias
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
  xxxl: 48,    // alias
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
 * Font family mapping — Inter via @expo-google-fonts/inter.
 * Falls back to system font if custom fonts fail to load.
 */
const FONT_FAMILY = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
};

/**
 * FONTS — typography tokens WITHOUT hardcoded colors.
 * Colors should come from useAppTheme().colors in components.
 *
 * Usage in components:
 *   <Text style={[FONTS.h1, { color: colors.textPrimary }]}>
 */
export const FONTS = {
  // Display — hero headlines
  display: {
    fontFamily: FONT_FAMILY.extrabold,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 40,
  },
  // Headings
  h1: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  h2: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  h3: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  // Body
  body: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  // Small
  caption: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  captionBold: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  small: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  tiny: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  // Interactive
  label: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 14,
    fontWeight: '600',
  },
  // Monospaced — for stats, numbers, counters
  mono: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  monoSmall: {
    fontFamily: FONT_FAMILY.semibold,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
};

/**
 * Factory: creates FONTS with colors baked in (for StyleSheet.create usage).
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
  mono: { ...FONTS.mono, color: colors.textPrimary },
  monoSmall: { ...FONTS.monoSmall, color: colors.textPrimary },
});

// ─── Shadows ────────────────────────────────────────────────────────
// `accent` and `glow` now accept a color parameter via createShadows().
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
    shadowColor: ACCENT_LIGHT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};

/**
 * Dark-mode-aware shadow factory.
 * In dark mode, shadows are invisible — use subtle borders instead.
 * Call: createShadows(colors).md  OR  createShadows(colors).glow
 */
export const createShadows = (colors) => ({
  ...SHADOW,
  // Glass morphism — subtle border, no shadow (for dark mode compat)
  glass: {
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: colors.borderMedium,
  },
  // Accent glow — colored shadow for emphasis states
  glow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  // Elevated card — works in both light and dark
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: colors === DARK_COLORS ? 0 : 0.06,
    shadowRadius: 8,
    elevation: colors === DARK_COLORS ? 0 : 3,
    borderWidth: colors === DARK_COLORS ? 1 : 0,
    borderColor: colors.border,
  },
});

export const LAYOUT = {
  window: { width, height },
  isSmallDevice: width < 375,
  isTallDevice: height > 800,
  safeBottom: Platform.OS === 'ios' ? 34 : 16,
  tabBarHeight: 68,
  floatingNavBottom: Platform.OS === 'ios' ? 24 : 16,
  avatarSizes: { xs: 24, sm: 32, md: 40, lg: 48, xl: 64, xxl: 80 },
  // Mobile ergonomics
  minTouchTarget: 48,     // iOS HIG: 44pt minimum, we use 48
  headerHeight: 56,       // Standard header height
  cardMinHeight: 120,     // Minimum card height for comfortable tapping
  horizontalPadding: 20,  // Standard screen edge padding
  sectionGap: 24,         // Gap between major sections
  itemGap: 12,            // Gap between related items
};

export const ANIMATION = {
  // Press micro-interaction
  tap: {
    scale: 0.97,
    duration: 100,
  },
  // Toggle (bookmark, follow) — celebration bounce
  toggle: {
    scaleSequence: [0.95, 1.08, 1.0],
    duration: 250,
  },
  // Content entering viewport
  enter: {
    translateY: 8,
    duration: 200,
    delay: 50,   // stagger base per item
  },
  // Content exiting
  exit: {
    duration: 150,
  },
  // Skeleton shimmer
  shimmer: {
    duration: 1500,
    lowOpacity: 0.4,
    highOpacity: 0.7,
  },
  // Error shake (horizontal)
  shake: {
    distance: 3,
    duration: 200,
    cycles: 3,
  },
  // Spring config presets
  spring: {
    gentle: { tension: 120, friction: 14 },
    bouncy: { tension: 180, friction: 10 },
    stiff: { tension: 200, friction: 20 },
  },
};

// Design System — single source of truth for the entire app
export const COLORS = {
  primary: '#6C63FF',      // Vibrant Indigo
  primaryLight: '#8B85FF',
  primaryDark: '#5A52E0',
  secondary: '#00C9A7',    // Teal/Mint
  secondaryLight: '#33D4B9',
  background: '#F8F9FB',   // Off-white/Gray
  card: '#FFFFFF',
  textPrimary: '#1E1E2D',  // Deep Blue/Black
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  success: '#10B981',
  successLight: '#D1FAE5',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.05)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 50,
};

export const FONTS = {
  h1: { fontSize: 30, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  body: { fontSize: 16, fontWeight: '400', color: COLORS.textPrimary, lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  caption: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  small: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  tiny: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase' },
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
  inner: { 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowOffset: { width: 0, height: 1 }, 
    shadowRadius: 2, 
    elevation: 1 
  }
};

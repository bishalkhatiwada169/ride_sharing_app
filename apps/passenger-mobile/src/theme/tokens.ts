/**
 * Premium Kathmandu 2.0 — design system tokens.
 * Deep neutrals + warm marigold. Atmosphere over decoration.
 */

export const colors = {
  // Brand
  primary: '#F2B84B',
  primaryPressed: '#D49A2E',
  primaryBright: '#FFC85C',
  primaryDark: '#D49A2E',
  primaryMuted: 'rgba(242, 184, 75, 0.14)',

  // Surfaces (layered depth)
  background: '#0B0D12',
  elevatedBackground: '#0F1218',
  secondary: '#12151C',
  surface: '#12151C',
  surfaceElevated: '#171B23',
  card: '#171B23',
  glass: 'rgba(18, 21, 28, 0.90)',

  // Text
  text: '#F7F3EA',
  textPrimary: '#F7F3EA',
  textSecondary: '#B9B5AC',
  textMuted: '#77756F',
  textOnPrimary: '#0B0D12',

  // Lines / overlays
  border: 'rgba(247, 243, 234, 0.10)',
  borderStrong: 'rgba(247, 243, 234, 0.18)',
  overlay: 'rgba(11, 13, 18, 0.42)',
  mapOverlay: 'rgba(18, 21, 28, 0.92)',

  // Status (restrained)
  success: '#5ECF9A',
  successMuted: 'rgba(94, 207, 154, 0.14)',
  warning: '#F2B84B',
  warningMuted: 'rgba(242, 184, 75, 0.14)',
  error: '#E86A5C',
  errorMuted: 'rgba(232, 106, 92, 0.14)',

  // Map
  mapPlaceholder: '#12151C',
  mapPlaceholderInk: '#77756F',
  accuracyFill: 'rgba(242, 184, 75, 0.12)',
  accuracyStroke: 'rgba(242, 184, 75, 0.4)',

  // Compat aliases (do not use in new code)
  mist: '#171B23',
  fog: '#0B0D12',
  ink: '#F7F3EA',
  inkSoft: '#B9B5AC',
  line: 'rgba(247, 243, 234, 0.10)',
  accent: '#F2B84B',
  accentHover: '#D49A2E',
  accentMuted: 'rgba(242, 184, 75, 0.14)',
  warn: '#F2B84B',
  danger: '#E86A5C',
  dangerMuted: 'rgba(232, 106, 92, 0.14)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  '2xl': 48,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  sheet: 28,
  pill: 999,
  small: 10,
  medium: 14,
  large: 18,
};

export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {width: 0, height: 0},
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 8},
    elevation: 9,
  },
};

export const typography = {
  display: {
    fontSize: 34,
    fontWeight: '600' as const,
    letterSpacing: -0.8,
  },
  title: {fontSize: 24, fontWeight: '600' as const, letterSpacing: -0.4},
  heading: {fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.35},
  section: {fontSize: 18, fontWeight: '600' as const, letterSpacing: -0.3},
  subtitle: {fontSize: 17, fontWeight: '500' as const},
  cardTitle: {fontSize: 15, fontWeight: '600' as const},
  body: {fontSize: 16, fontWeight: '400' as const},
  bodyStrong: {fontSize: 16, fontWeight: '500' as const},
  secondary: {fontSize: 14, fontWeight: '400' as const},
  caption: {fontSize: 12, fontWeight: '400' as const},
  label: {fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.6},
  button: {fontSize: 16, fontWeight: '600' as const, letterSpacing: 0.15},
  price: {fontSize: 30, fontWeight: '600' as const, letterSpacing: -0.6},
  numeric: {fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.3},
  brand: {
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 3.2,
    textTransform: 'uppercase' as const,
  },
};

export const motion = {
  fast: 160,
  normal: 240,
  slow: 360,
};

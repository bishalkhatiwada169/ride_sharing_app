/**
 * Pathao-inspired ride UI — light surfaces, bold red CTAs, Nepali city feel.
 */

export const colors = {
  // Brand (Pathao red)
  primary: '#E31C23',
  primaryPressed: '#C4161C',
  primaryBright: '#FF3B42',
  primaryDark: '#B01016',
  primaryMuted: 'rgba(227, 28, 35, 0.10)',

  // Surfaces
  background: '#F5F5F5',
  elevatedBackground: '#FFFFFF',
  secondary: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.94)',

  // Text
  text: '#1A1A1A',
  textPrimary: '#1A1A1A',
  textSecondary: '#5C5C5C',
  textMuted: '#8A8A8A',
  textOnPrimary: '#FFFFFF',

  // Lines / overlays
  border: 'rgba(0, 0, 0, 0.08)',
  borderStrong: 'rgba(0, 0, 0, 0.14)',
  overlay: 'rgba(0, 0, 0, 0.35)',
  mapOverlay: 'rgba(255, 255, 255, 0.94)',

  // Status
  success: '#1B9E5A',
  successMuted: 'rgba(27, 158, 90, 0.12)',
  warning: '#E6A100',
  warningMuted: 'rgba(230, 161, 0, 0.14)',
  error: '#E31C23',
  errorMuted: 'rgba(227, 28, 35, 0.12)',

  // Map
  mapPlaceholder: '#E8E8E8',
  mapPlaceholderInk: '#8A8A8A',
  accuracyFill: 'rgba(227, 28, 35, 0.10)',
  accuracyStroke: 'rgba(227, 28, 35, 0.35)',
  routeLine: '#2B2B2B',
  pickupMarker: '#1A1A1A',
  dropoffMarker: '#E31C23',
  driverMarker: '#E31C23',

  // Compat aliases
  mist: '#F0F0F0',
  fog: '#F5F5F5',
  ink: '#1A1A1A',
  inkSoft: '#5C5C5C',
  line: 'rgba(0, 0, 0, 0.08)',
  accent: '#E31C23',
  accentHover: '#C4161C',
  accentMuted: 'rgba(227, 28, 35, 0.10)',
  warn: '#E6A100',
  danger: '#E31C23',
  dangerMuted: 'rgba(227, 28, 35, 0.12)',
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  sheet: 20,
  pill: 999,
  small: 8,
  medium: 12,
  large: 16,
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
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 8,
  },
};

export const typography = {
  display: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
  title: {fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3},
  heading: {fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2},
  section: {fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.2},
  subtitle: {fontSize: 17, fontWeight: '600' as const},
  cardTitle: {fontSize: 15, fontWeight: '700' as const},
  body: {fontSize: 16, fontWeight: '400' as const},
  bodyStrong: {fontSize: 16, fontWeight: '600' as const},
  secondary: {fontSize: 14, fontWeight: '400' as const},
  caption: {fontSize: 12, fontWeight: '400' as const},
  label: {fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.4},
  button: {fontSize: 15, fontWeight: '700' as const, letterSpacing: 0.4},
  price: {fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.4},
  numeric: {fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.2},
  brand: {
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
    textTransform: 'none' as const,
  },
};

export const motion = {
  fast: 160,
  normal: 240,
  slow: 360,
};

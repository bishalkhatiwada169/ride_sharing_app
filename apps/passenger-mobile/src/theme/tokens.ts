/** Design tokens for passenger app (original Ride brand — not a competitor clone). */
export const colors = {
  ink: '#0B1F1C',
  inkSoft: '#1A3330',
  mist: '#E8F0EE',
  fog: '#F4F7F6',
  line: '#C5D5D1',
  accent: '#0F6E56',
  accentHover: '#0B5844',
  accentMuted: '#D8EBE4',
  warn: '#B45309',
  danger: '#B42318',
  dangerMuted: '#F9E4E2',
  surface: '#FFFFFF',
  mapPlaceholder: '#D3E2DD',
  mapPlaceholderInk: '#3D5F58',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const typography = {
  display: {fontSize: 36, fontWeight: '700' as const, letterSpacing: -1},
  title: {fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3},
  subtitle: {fontSize: 18, fontWeight: '600' as const},
  body: {fontSize: 16, fontWeight: '400' as const},
  bodyStrong: {fontSize: 16, fontWeight: '600' as const},
  caption: {fontSize: 13, fontWeight: '400' as const},
  label: {fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.4},
};

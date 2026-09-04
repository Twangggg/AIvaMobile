import { alpha, palette } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  container: 20,
};

export const radii = {
  sm: 4,
  md: 12,
  lg: 16,
  xl: 20,
  card: 24,
  full: 999,
};

export const typography = {
  displayLg: { fontSize: 40, fontWeight: '700' as const, lineHeight: 48, letterSpacing: -0.8 },
  headlineLg: { fontSize: 32, fontWeight: '600' as const, lineHeight: 40, letterSpacing: -0.32 },
  headlineLgMobile: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  headlineMd: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  title: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28 },
  bodyLg: { fontSize: 18, fontWeight: '400' as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  labelMd: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0.14 },
  caption: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
};

export const shadows = {
  card: {
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },
};

export const lightColors = {
  background: palette.slate.background,
  surface: palette.white,
  surfaceElevated: palette.white,
  surface2: palette.slate.low,
  surface3: palette.slate.container,
  surface4: palette.slate.high,

  text: palette.slate.onSurface,
  textMuted: palette.slate.onVariant,
  muted: palette.slate.outline,
  muted2: palette.slate.outlineVariant,
  onSurface: palette.slate.onSurface,
  onAccent: palette.amber.on,

  brand: palette.navy.DEFAULT,
  brandSoft: palette.navy.soft,
  brandDim: palette.navy.container,
  brandGold: palette.amber.DEFAULT,
  brandGoldSoft: palette.amber.fixedDim,
  brandGoldDim: palette.amber.deep,

  accent: palette.amber.DEFAULT,
  accentSoft: palette.amber.fixedDim,
  accentDim: palette.amber.deep,
  accentMuted: palette.amber.fixed,

  primary: palette.navy.DEFAULT,
  primaryContainer: palette.navy.container,
  onPrimary: palette.white,
  onPrimaryContainer: palette.navy.onContainer,

  border: palette.slate.highest,
  borderStrong: palette.slate.outlineVariant,
  overlay: alpha(palette.black, 0.4),

  danger: palette.rose.DEFAULT,
  dangerContainer: palette.rose.container,
  success: palette.green.DEFAULT,
  successDeep: palette.green.deep,
  warn: palette.amber.DEFAULT,
};

/** @deprecated use lightColors — kept for any leftover imports */
export const darkColors = lightColors;

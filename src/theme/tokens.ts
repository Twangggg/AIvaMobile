export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const typography = {
  displayLg: { fontFamily: 'Montserrat', fontSize: 48, fontWeight: '700' as const, lineHeight: 56, letterSpacing: -0.48 },
  headlineLg: { fontFamily: 'Montserrat', fontSize: 32, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.32 },
  headlineLgMobile: { fontFamily: 'Montserrat', fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  headlineMd: { fontFamily: 'Montserrat', fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  title: { fontFamily: 'Montserrat', fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  bodyLg: { fontFamily: 'Inter', fontSize: 18, fontWeight: '400' as const, lineHeight: 28 },
  body: { fontFamily: 'Inter', fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  labelMd: { fontFamily: 'Inter', fontSize: 14, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0.7 },
  caption: { fontFamily: 'Inter', fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
};

export const darkColors = {
  background: '#131313',
  surface: '#201f1f',
  surface2: '#2a2a2a',
  surface3: '#353534',
  text: '#e5e2e1',
  textMuted: '#c4c7c8',
  primary: '#ffd700',
  border: 'rgba(255, 255, 255, 0.06)',
  danger: '#ffb4ab',

  brandGold: '#ffd700',
  brandGoldSoft: '#fff4b0',
  brandGoldDim: '#b8970a',
  brandBlue: '#00a3ff',
  brandBlueSoft: '#7dd3ff',
  muted: '#8f9095',
  muted2: '#5b5e62',
  borderStrong: 'rgba(255, 255, 255, 0.12)',
  onSurface: '#e5e2e1',
  success: '#34d399',
  warn: '#f59e0b',
};

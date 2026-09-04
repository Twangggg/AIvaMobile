import { lightColors, radii, shadows, spacing, typography } from './tokens';

export function useAppTheme() {
  return {
    colors: lightColors,
    spacing,
    radii,
    typography,
    shadows,
    isDark: false,
  };
}

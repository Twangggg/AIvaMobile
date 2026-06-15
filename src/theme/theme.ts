import { darkColors, spacing, typography } from './tokens';

export function useAppTheme() {
  return {
    colors: darkColors,
    spacing,
    typography,
    isDark: true,
  };
}

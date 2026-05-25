import { useColorScheme } from 'react-native';

import { darkColors, lightColors, spacing, typography } from './tokens';

export function useAppTheme() {
  const isDark = useColorScheme() === 'dark';

  return {
    colors: isDark ? darkColors : lightColors,
    spacing,
    typography,
    isDark,
  };
}

import { SafeAreaView, View, type ViewProps } from 'react-native';

import { useAppTheme } from '@/theme/theme';

export function Screen({ style, children, ...props }: ViewProps) {
  const theme = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[{ flex: 1, padding: theme.spacing.lg }, style]} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}

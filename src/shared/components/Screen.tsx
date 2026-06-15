import { SafeAreaView, View, type ViewProps } from 'react-native';

import { useAppTheme } from '@/theme/theme';

export function Screen({ style, children, ...props }: ViewProps) {
  const theme = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[{ flex: 1, paddingHorizontal: 20, paddingVertical: 8 }, style]} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}

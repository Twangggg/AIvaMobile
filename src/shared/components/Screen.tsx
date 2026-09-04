import { View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/theme';

type Props = ViewProps & {
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
};

export function Screen({ style, children, edges = ['top', 'bottom'], ...props }: Props) {
  const theme = useAppTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <View style={[{ flex: 1, paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.sm }, style]} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}

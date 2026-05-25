import { Text as RNText, type TextProps } from 'react-native';

import { useAppTheme } from '@/theme/theme';

type Props = TextProps & { tone?: 'default' | 'muted' | 'danger'; variant?: 'title' | 'body' | 'caption' };

export function Text({ tone = 'default', variant = 'body', style, ...props }: Props) {
  const theme = useAppTheme();
  const color = tone === 'muted' ? theme.colors.textMuted : tone === 'danger' ? theme.colors.danger : theme.colors.text;
  const fontSize =
    variant === 'title' ? theme.typography.title : variant === 'caption' ? theme.typography.caption : theme.typography.body;

  return <RNText style={[{ color, fontSize, fontWeight: '500' }, style]} {...props} />;
}

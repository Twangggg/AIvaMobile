import { Text as RNText, type TextProps } from 'react-native';

import { useAppTheme } from '@/theme/theme';

type Props = TextProps & { tone?: 'default' | 'muted' | 'danger' | 'accent' | 'brand'; variant?: 'title' | 'body' | 'caption' };

export function Text({ tone = 'default', variant = 'body', style, ...props }: Props) {
  const theme = useAppTheme();
  const color =
    tone === 'muted'
      ? theme.colors.textMuted
      : tone === 'danger'
        ? theme.colors.danger
        : tone === 'accent'
          ? theme.colors.accent
          : tone === 'brand'
            ? theme.colors.brand
            : theme.colors.text;
  const variantStyle =
    variant === 'title' ? theme.typography.title :
    variant === 'caption' ? theme.typography.caption :
    theme.typography.body;

  return <RNText style={[{ color }, variantStyle, style]} {...props} />;
}

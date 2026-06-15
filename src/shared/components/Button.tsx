import { Pressable, type PressableProps } from 'react-native';

import { useAppTheme } from '@/theme/theme';

import { Text } from './Text';

type Props = PressableProps & { label: string; variant?: 'primary' | 'ghost' };

export function Button({ label, variant = 'primary', ...props }: Props) {
  const theme = useAppTheme();
  return (
    <Pressable
      style={({ pressed }) => ({
        backgroundColor: variant === 'primary' ? theme.colors.brandGold : 'transparent',
        borderColor: variant === 'primary' ? 'transparent' : theme.colors.textMuted,
        borderWidth: 1,
        borderRadius: 4,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
      })}
      {...props}
    >
      <Text
        style={{
          color: variant === 'primary' ? theme.colors.background : theme.colors.textMuted,
          fontFamily: theme.typography.labelMd.fontFamily,
          fontSize: theme.typography.labelMd.fontSize,
          fontWeight: '700',
          letterSpacing: theme.typography.labelMd.letterSpacing,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

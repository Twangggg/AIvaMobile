import { Pressable, type PressableProps } from 'react-native';

import { useAppTheme } from '@/theme/theme';

import { Text } from './Text';

type Props = PressableProps & { label: string; variant?: 'primary' | 'ghost' };

export function Button({ label, variant = 'primary', ...props }: Props) {
  const theme = useAppTheme();
  return (
    <Pressable
      style={({ pressed }) => ({
        backgroundColor: variant === 'primary' ? theme.colors.accent : 'transparent',
        borderColor: variant === 'primary' ? 'transparent' : theme.colors.borderStrong,
        borderWidth: 1,
        borderRadius: theme.radii.md,
        minHeight: 48,
        paddingHorizontal: theme.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed || props.disabled ? 0.7 : 1,
      })}
      {...props}
    >
      <Text
        style={{
          color: variant === 'primary' ? theme.colors.onAccent : theme.colors.textMuted,
          fontSize: theme.typography.labelMd.fontSize,
          fontWeight: '700',
          letterSpacing: theme.typography.labelMd.letterSpacing,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

import { Pressable, type PressableProps } from 'react-native';

import { useAppTheme } from '@/theme/theme';

import { Text } from './Text';

type Props = PressableProps & { label: string; variant?: 'primary' | 'ghost' };

export function Button({ label, variant = 'primary', ...props }: Props) {
  const theme = useAppTheme();
  return (
    <Pressable
      style={({ pressed }) => ({
        backgroundColor: variant === 'primary' ? theme.colors.primary : 'transparent',
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: 12,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
      })}
      {...props}
    >
      <Text style={{ color: '#fff', fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

import { TextInput, type TextInputProps } from 'react-native';

import { useAppTheme } from '@/theme/theme';

export function Input({ style, placeholderTextColor, ...props }: TextInputProps) {
  const theme = useAppTheme();

  return (
    <TextInput
      style={[
        {
          borderWidth: 1,
          borderRadius: theme.radii.md,
          minHeight: 48,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderColor: theme.colors.borderStrong,
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
          fontSize: theme.typography.body.fontSize,
        },
        style,
      ]}
      placeholderTextColor={placeholderTextColor ?? theme.colors.textMuted}
      {...props}
    />
  );
}

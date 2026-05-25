import { TextInput, type TextInputProps } from 'react-native';

import { useAppTheme } from '@/theme/theme';

export function Input({ style, placeholderTextColor, ...props }: TextInputProps) {
  const theme = useAppTheme();

  return (
    <TextInput
      style={[
        {
          borderWidth: 1,
          borderRadius: 12,
          minHeight: 44,
          paddingHorizontal: 12,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
        },
        style,
      ]}
      placeholderTextColor={placeholderTextColor ?? theme.colors.textMuted}
      {...props}
    />
  );
}

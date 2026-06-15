import { TextInput, type TextInputProps } from 'react-native';

import { useAppTheme } from '@/theme/theme';

export function Input({ style, placeholderTextColor, ...props }: TextInputProps) {
  const theme = useAppTheme();

  return (
    <TextInput
      style={[
        {
          borderBottomWidth: 1,
          borderWidth: 0,
          borderRadius: 0,
          minHeight: 44,
          paddingHorizontal: 0,
          borderColor: theme.colors.textMuted + '60',
          backgroundColor: 'transparent',
          color: theme.colors.text,
          fontFamily: theme.typography.body.fontFamily,
          fontSize: theme.typography.body.fontSize,
        },
        style,
      ]}
      placeholderTextColor={placeholderTextColor ?? theme.colors.textMuted + '80'}
      {...props}
    />
  );
}

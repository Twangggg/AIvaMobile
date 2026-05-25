import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { z } from 'zod';

import { useAuth } from '@/features/auth/hooks';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Screen } from '@/shared/components/Screen';
import { Text } from '@/shared/components/Text';
import { showError } from '@/shared/utils/toast';
import { useAppTheme } from '@/theme/theme';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
});

type LoginValues = z.infer<typeof schema>;

export function LoginScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { login, status } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'demo@aiva.app', password: '123456' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
    } catch {
      showError('Login failed', 'Please check credentials or API server');
    }
  });

  return (
    <Screen>
      <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
        <Text variant="title">{t('signIn')}</Text>
        <Text tone="muted">Secure auth with refresh token flow</Text>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('email')}
            />
          )}
        />
        {errors.email?.message ? <Text tone="danger" variant="caption">{errors.email.message}</Text> : null}

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
              placeholder={t('password')}
            />
          )}
        />
        {errors.password?.message ? <Text tone="danger" variant="caption">{errors.password.message}</Text> : null}

        <Button label={status === 'loading' ? 'Signing in...' : t('signIn')} onPress={onSubmit} disabled={status === 'loading'} />
      </View>
    </Screen>
  );
}

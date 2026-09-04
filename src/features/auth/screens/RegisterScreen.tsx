import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { z } from 'zod';

import { useAuth } from '@/features/auth/hooks';
import type { AuthStackParamList } from '@/navigation/types';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Screen } from '@/shared/components/Screen';
import { Text } from '@/shared/components/Text';
import { showError } from '@/shared/utils/toast';
import { useAppTheme } from '@/theme/theme';

const schema = z.object({
  displayName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

type RegisterValues = z.infer<typeof schema>;

export function RegisterScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { register, status } = useAuth();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await register(values);
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 409 || status === 400) {
        showError(t('auth.registerFailed'), t('auth.checkCredentials'));
      } else {
        showError(t('auth.registerFailed'), t('auth.networkError'));
      }
    }
  });

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ gap: theme.spacing.xs, marginBottom: theme.spacing.xxl }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: theme.colors.primary, letterSpacing: 0.5 }}>
            AIVA
          </Text>
          <Text variant="title">{t('auth.signUp')}</Text>
          <Text tone="muted">{t('auth.createAccount')}</Text>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Controller
            control={control}
            name="displayName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                placeholder={t('auth.displayName')}
              />
            )}
          />
          {errors.displayName?.message ? (
            <Text tone="danger" variant="caption">{t('auth.displayNameMin')}</Text>
          ) : null}

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
                placeholder={t('auth.email')}
              />
            )}
          />
          {errors.email?.message ? <Text tone="danger" variant="caption">{t('auth.invalidEmail')}</Text> : null}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                placeholder={t('auth.password')}
              />
            )}
          />
          {errors.password?.message ? (
            <Text tone="danger" variant="caption">{t('auth.minChars')}</Text>
          ) : null}

          <View style={{ marginTop: theme.spacing.sm }}>
            <Button
              label={status === 'loading' ? t('auth.signingUp') : t('auth.signUp')}
              onPress={onSubmit}
              disabled={status === 'loading'}
            />
          </View>

          <Pressable onPress={() => navigation.navigate('Login')} style={{ alignItems: 'center', padding: 8 }}>
            <Text tone="muted">
              {t('auth.haveAccount')}{' '}
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>{t('auth.signIn')}</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAuth } from '@/features/auth/hooks';
import { Button } from '@/shared/components/Button';
import { Screen } from '@/shared/components/Screen';
import { Text } from '@/shared/components/Text';
import { useAppTheme } from '@/theme/theme';

export function HomeScreen() {
  const theme = useAppTheme();
  const { logout } = useAuth();
  const { i18n } = useTranslation();

  return (
    <Screen>
      <View style={{ gap: theme.spacing.md, justifyContent: 'center', flex: 1 }}>
        <Text variant="title">AIva Mobile</Text>
        <Text tone="muted">{format(new Date(), 'yyyy-MM-dd HH:mm')}</Text>
        <Button label="Logout" onPress={logout} />
        <Button label="Switch Language" variant="ghost" onPress={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')} />
      </View>
    </Screen>
  );
}

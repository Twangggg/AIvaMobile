import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Text } from '@/shared/components/Text';
import { useAppTheme } from '@/theme/theme';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const { isConnected } = useNetworkStatus();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      {!isConnected ? (
        <View style={{ paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 12, backgroundColor: colors.danger }}>
          <Text style={{ color: colors.onAccent, textAlign: 'center' }}>{t('offline')}</Text>
        </View>
      ) : null}
      {children}
      <Toast />
    </>
  );
}

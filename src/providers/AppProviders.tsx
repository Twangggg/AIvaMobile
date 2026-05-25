import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Text } from '@/shared/components/Text';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const { isConnected } = useNetworkStatus();
  const { t } = useTranslation();

  return (
    <>
      {!isConnected ? (
        <View style={{ padding: 8, backgroundColor: '#b91c1c' }}>
          <Text style={{ color: '#fff' }}>{t('offline')}</Text>
        </View>
      ) : null}
      {children}
      <Toast />
    </>
  );
}

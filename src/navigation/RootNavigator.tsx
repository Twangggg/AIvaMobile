import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/features/auth/hooks';

import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';

export function RootNavigator() {
  const { hydrated, status } = useAuth();

  if (!hydrated || status === 'idle') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (status !== 'authenticated') return <AuthNavigator />;
  return <AppNavigator />;
}

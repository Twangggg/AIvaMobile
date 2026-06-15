import '@/config/sentry';
import '@/i18n';

import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from '@/navigation/RootNavigator';
import { AppProviders } from '@/providers/AppProviders';
import { queryClient } from '@/services/query/queryClient';
import { useAppTheme } from '@/theme/theme';

export default function App() {
  const theme = useAppTheme();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <AppProviders>
            <StatusBar style={theme.isDark ? 'light' : 'dark'} />
            <RootNavigator />
          </AppProviders>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

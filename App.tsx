import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

try {
  // These may fail on some devices; catch early
  require('@/config/sentry');
} catch (e: any) {
  console.warn('[init] sentry failed:', e?.message);
}

try {
  require('@/i18n');
} catch (e: any) {
  console.warn('[init] i18n failed:', e?.message);
}

type ErrorBoundaryProps = { children: React.ReactNode };
type ErrorBoundaryState = { error: Error | null };

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#111', padding: 20, justifyContent: 'center' }}>
          <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>ERROR:</Text>
          <ScrollView>
            <Text style={{ color: '#eee', fontFamily: 'monospace', fontSize: 12 }}>
              {this.state.error.stack || this.state.error.message}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

let SafeAreaProvider: any;
let QueryClientProvider: any;
let NavigationContainer: any;
let StatusBar: any;
let AppProviders: any;
let RootNavigator: any;
let useAppTheme: any;
let queryClient: any;
let moduleError: string | null = null;

try {
  SafeAreaProvider = require('react-native-safe-area-context').SafeAreaProvider;
  QueryClientProvider = require('@tanstack/react-query').QueryClientProvider;
  NavigationContainer = require('@react-navigation/native').NavigationContainer;
  StatusBar = require('expo-status-bar').StatusBar;
  AppProviders = require('@/providers/AppProviders').AppProviders;
  RootNavigator = require('@/navigation/RootNavigator').RootNavigator;
  useAppTheme = require('@/theme/theme').useAppTheme;
  queryClient = require('@/services/query/queryClient').queryClient;
} catch (e: any) {
  moduleError = e?.message || String(e);
  console.warn('[init] module load failed:', moduleError);
}

function AppInner() {
  const theme = useAppTheme();

  return (
    <NavigationContainer>
      <AppProviders>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <RootNavigator />
      </AppProviders>
    </NavigationContainer>
  );
}

export default function App() {
  if (moduleError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#111', padding: 20, justifyContent: 'center' }}>
        <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>MODULE LOAD ERROR:</Text>
        <ScrollView>
          <Text style={{ color: '#eee', fontFamily: 'monospace', fontSize: 12 }}>{moduleError}</Text>
        </ScrollView>
      </View>
    );
  }
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppInner />
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

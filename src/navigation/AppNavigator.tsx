import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AivaAskScreen } from '@/features/aiva/screens/AivaAskScreen';
import { AivaHistoryScreen } from '@/features/aiva/screens/AivaHistoryScreen';
import { AivaHomeScreen } from '@/features/aiva/screens/AivaHomeScreen';
import { AivaPairScreen } from '@/features/aiva/screens/AivaPairScreen';

import { BottomNav } from '../features/aiva/components/BottomNav';
import type { AppTabParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="AivaHome" component={AivaHomeScreen} />
      <Tab.Screen name="AivaHistory" component={AivaHistoryScreen} />
      <Tab.Screen name="AivaAsk" component={AivaAskScreen} />
      <Tab.Screen name="AivaPair" component={AivaPairScreen} />
    </Tab.Navigator>
  );
}

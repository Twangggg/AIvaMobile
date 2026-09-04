import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { AivaHistoryScreen } from '@/features/aiva/screens/AivaHistoryScreen';
import { AivaHomeScreen } from '@/features/aiva/screens/AivaHomeScreen';
import { AivaLocationScreen } from '@/features/aiva/screens/AivaLocationScreen';
import { AivaPairScreen } from '@/features/aiva/screens/AivaPairScreen';
import { AivaPlayScreen } from '@/features/aiva/screens/AivaPlayScreen';
import { AivaSafetyScreen } from '@/features/aiva/screens/AivaSafetyScreen';

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
      <Tab.Screen name="AivaPlay" component={AivaPlayScreen} />
      <Tab.Screen name="AivaSafety" component={AivaSafetyScreen} />
      <Tab.Screen name="AivaLocation" component={AivaLocationScreen} />
      <Tab.Screen name="AivaHistory" component={AivaHistoryScreen} />
      <Tab.Screen name="AivaPair" component={AivaPairScreen} />
    </Tab.Navigator>
  );
}

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AivaAskScreen } from '@/features/aiva/screens/AivaAskScreen';
import { PlayPackEditorScreen } from '@/features/aiva/screens/PlayPackEditorScreen';
import { PlaySessionScreen } from '@/features/aiva/screens/PlaySessionScreen';

import { AppNavigator } from './AppNavigator';
import type { MainStackParamList } from './types';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AppNavigator} />
      <Stack.Screen name="AivaAsk" component={AivaAskScreen} />
      <Stack.Screen name="PlaySession" component={PlaySessionScreen} />
      <Stack.Screen name="PlayPackEditor" component={PlayPackEditorScreen} />
    </Stack.Navigator>
  );
}

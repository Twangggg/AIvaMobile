import { View } from 'react-native';

import { Screen } from '@/shared/components/Screen';
import { Text } from '@/shared/components/Text';

import { useTemplateFeature } from '../hooks/useTemplateFeature';

export function TemplateScreen() {
  const { itemsQuery } = useTemplateFeature();
  return (
    <Screen>
      <View>
        <Text variant="title">Template Feature</Text>
        <Text tone="muted">Starter module for new features.</Text>
        <Text>Items: {itemsQuery.data?.length ?? 0}</Text>
      </View>
    </Screen>
  );
}

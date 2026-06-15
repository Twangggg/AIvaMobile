import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/theme';

type TabItem = {
  route: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
};

const items: TabItem[] = [
  { route: 'AivaHome', label: 'DASHBOARD', icon: 'grid-outline', iconFocused: 'grid' },
  { route: 'AivaHistory', label: 'SYNC', icon: 'sync-outline', iconFocused: 'sync' },
  { route: 'AivaAsk', label: 'LENS', icon: 'eye-outline', iconFocused: 'eye' },
  { route: 'AivaPair', label: 'SETTINGS', icon: 'options-outline', iconFocused: 'options' },
];

export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background + 'E6' }]}>
      <View style={styles.grid}>
        {state.routes.map((route, index) => {
          const active = state.index === index;
          const tab = items.find((t) => t.route === route.name);
          if (!tab) return null;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={[
                styles.item,
                active && { backgroundColor: theme.colors.brandGold + '18' },
              ]}
            >
              <Ionicons
                name={active ? tab.iconFocused : tab.icon}
                size={20}
                color={active ? theme.colors.brandGold : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: active ? theme.colors.brandGold : theme.colors.textMuted,
                    fontWeight: active ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  grid: { flexDirection: 'row', gap: 4 },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  label: { fontSize: 9, letterSpacing: 0.5 },
});

import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/theme';

type TabItem = {
  route: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
};

/** Order must match Tab.Screen order in AppNavigator. */
const items: TabItem[] = [
  { route: 'AivaHome', labelKey: 'nav.dashboard', icon: 'grid-outline', iconFocused: 'grid' },
  { route: 'AivaPlay', labelKey: 'nav.play', icon: 'game-controller-outline', iconFocused: 'game-controller' },
  { route: 'AivaSafety', labelKey: 'nav.safety', icon: 'shield-outline', iconFocused: 'shield' },
  { route: 'AivaLocation', labelKey: 'nav.location', icon: 'location-outline', iconFocused: 'location' },
  { route: 'AivaHistory', labelKey: 'nav.sync', icon: 'time-outline', iconFocused: 'time' },
  { route: 'AivaPair', labelKey: 'nav.settings', icon: 'settings-outline', iconFocused: 'settings' },
];

export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.row}>
        {state.routes.map((route) => {
          const active = state.routes[state.index]?.name === route.name;
          const tab = items.find((item) => item.route === route.name) ?? items[0];

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={t(tab.labelKey)}
              accessibilityState={{ selected: active }}
              hitSlop={4}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (event.defaultPrevented) return;
                if (typeof (navigation as unknown as { jumpTo?: (name: string) => void }).jumpTo === 'function') {
                  (navigation as unknown as { jumpTo: (name: string) => void }).jumpTo(route.name);
                } else {
                  navigation.navigate(route.name as never);
                }
              }}
              style={styles.slot}
              android_ripple={{ color: 'transparent' }}
            >
              <View
                style={[
                  styles.chip,
                  {
                    borderRadius: theme.radii.md,
                    backgroundColor: 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name={active ? tab.iconFocused : tab.icon}
                  size={22}
                  color={active ? theme.colors.primary : theme.colors.textMuted}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 56,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppTabParamList, MainStackParamList } from '@/navigation/types';
import { useAppTheme } from '@/theme/theme';

type Props = {
  children: ReactNode;
  showBack?: boolean;
};

type ShellNav = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList>,
  NativeStackNavigationProp<MainStackParamList>
>;

export function AppShell({ children, showBack }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ShellNav>();

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.background,
            borderBottomColor: theme.colors.border,
            ...theme.shadows.card,
          },
        ]}
      >
        <View style={styles.side}>
          {showBack ? (
            <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
            </Pressable>
          ) : (
            <View style={styles.iconBtn} />
          )}
        </View>

        <Text style={[styles.logo, { color: theme.colors.primary }]}>AIVA</Text>

        <View style={[styles.side, styles.sideRight]}>
          <View style={styles.iconBtn} />
        </View>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 2,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: { flex: 1 },
});

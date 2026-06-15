import Constants from 'expo-constants';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/theme';

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const topInset = insets.top || Constants.statusBarHeight || 0;

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <View style={{ height: topInset, backgroundColor: theme.colors.background }} />
      <View style={[styles.header, { backgroundColor: theme.colors.background + 'CC', borderBottomColor: theme.colors.textMuted + '20' }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.logoIcon, { color: theme.colors.brandGold }]}>◆</Text>
          <Text style={[styles.logoText, { color: theme.colors.brandGold }]}>AIVA</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.avatar}>
            <Text style={[styles.avatarText, { color: theme.colors.brandGold }]}>●</Text>
          </View>
        </View>
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 48,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    fontSize: 22,
    fontWeight: '700',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
});

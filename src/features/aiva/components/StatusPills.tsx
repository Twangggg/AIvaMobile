import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { alpha } from '@/theme/colors';
import { useAppTheme } from '@/theme/theme';

export function ConnectionPill({ connected }: { connected: boolean }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.connectionRow}>
      <View
        style={[
          styles.dot,
          {
            backgroundColor: connected ? theme.colors.accent : theme.colors.muted,
          },
        ]}
      />
      <Text
        style={[
          styles.connectionLabel,
          { color: connected ? theme.colors.accent : theme.colors.muted },
        ]}
      >
        {connected ? t('common.connected') : t('common.disconnected')}
      </Text>
    </View>
  );
}

export function BatteryPill({ battery }: { battery: number }) {
  const theme = useAppTheme();
  const bars = Math.round((battery / 100) * 3);
  return (
    <View style={[styles.batteryPill, { borderColor: theme.colors.border }]}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.batteryBar,
            {
              backgroundColor: i < bars ? theme.colors.accent : alpha(theme.colors.text, 0.15),
            },
          ]}
        />
      ))}
      <Text style={[styles.batteryText, { color: theme.colors.accent }]}>
        {battery}%
      </Text>
    </View>
  );
}

export function SignalPill({ signal }: { signal: number }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const label =
    signal >= 3 ? t('statusPills.strong') : signal === 2 ? t('statusPills.stable') : t('statusPills.weak');
  const color =
    signal >= 3
      ? theme.colors.accent
      : signal === 2
        ? theme.colors.accent
        : theme.colors.danger;
  const bg = alpha(color, 0.14);

  return (
    <View style={[styles.signalPill, { borderColor: alpha(color, 0.35), backgroundColor: bg }]}>
      <Text style={[styles.signalText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  batteryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  batteryBar: {
    width: 4,
    height: 12,
    borderRadius: 2,
  },
  batteryText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
  signalPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  signalText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

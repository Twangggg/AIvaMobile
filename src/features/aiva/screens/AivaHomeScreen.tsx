import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/theme';

import { AppShell } from '../components/AppShell';

export function AivaHomeScreen() {
  const theme = useAppTheme();

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Hello, Explorer</Text>
          <Text style={[styles.heroSub, { color: theme.colors.textMuted }]}>
            Your neural interface is synchronized and ready for the next discovery.
          </Text>
        </View>

        <View style={[styles.glassSphere, { borderColor: theme.colors.brandGold + '18' }]}>
          <View style={[styles.ringOuter, { borderColor: theme.colors.brandGold + '12' }]} />
          <View style={[styles.ringInner, { borderColor: theme.colors.brandGold + '25' }]} />
          <View style={[styles.glassesWrap, { borderColor: theme.colors.textMuted + '20' }]}>
            <Ionicons name="diamond-outline" size={48} color={theme.colors.brandGold} />
          </View>
          <View style={[styles.statusChip, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.brandGold + '60' }]}>
            <View style={[styles.statusDot, { backgroundColor: theme.colors.brandGold }]} />
            <Text style={[styles.statusText, { color: theme.colors.brandGold }]}>LIVE: SYNCED</Text>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <Pressable style={[styles.actionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textMuted + '10' }]}>
            <Ionicons name="play-outline" size={22} color={theme.colors.brandGold} />
            <Text style={[styles.actionLabel, { color: theme.colors.brandGold }]}>START RECORDING</Text>
          </Pressable>
          <Pressable style={[styles.actionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textMuted + '10' }]}>
            <Ionicons name="musical-note-outline" size={22} color={theme.colors.brandGold} />
            <Text style={[styles.actionLabel, { color: theme.colors.brandGold }]}>VOICE ASSISTANT</Text>
          </Pressable>
          <Pressable style={[styles.actionCardFeatured, { backgroundColor: theme.colors.brandGold }]}>
            <Ionicons name="sparkles" size={22} color={theme.colors.background} />
            <Text style={[styles.actionLabelFeatured, { color: theme.colors.background }]}>AI INSIGHT</Text>
          </Pressable>
        </View>

        <View style={styles.analyticsRow}>
          <View style={[styles.analyticsCard, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.brandGold, borderColor: theme.colors.textMuted + '10' }]}>
            <View style={styles.analyticsHeader}>
              <View>
                <Text style={[styles.analyticsLabel, { color: theme.colors.textMuted }]}>DAILY ACTIVITY</Text>
                <Text style={[styles.analyticsTitle, { color: theme.colors.text }]}>Active Contexts</Text>
              </View>
              <Ionicons name="stats-chart-outline" size={18} color={theme.colors.textMuted} />
            </View>
            <View style={styles.barsGroup}>
              <BarItem label="Visual Processing" value={84} color={theme.colors.brandGold} />
              <BarItem label="NLP Analysis" value={62} color={theme.colors.brandGold} />
            </View>
          </View>

          <View style={[styles.healthCard, { backgroundColor: theme.colors.surface, borderLeftColor: theme.colors.brandGold, borderColor: theme.colors.textMuted + '10' }]}>
            <CircularGauge value={80} label="Power" color={theme.colors.brandGold} />
            <View style={styles.healthInfo}>
              <Text style={[styles.healthLabel, { color: theme.colors.textMuted }]}>DEVICE HEALTH</Text>
              <Text style={[styles.healthValue, { color: theme.colors.text }]}>
                Thermal: <Text style={{ color: theme.colors.brandGold }}>Optimal</Text>
              </Text>
              <View style={styles.signalRow}>
                <Ionicons name="locate-outline" size={14} color={theme.colors.brandGold} />
                <Text style={[styles.signalText, { color: theme.colors.textMuted }]}>5G Signal: Excellent</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </AppShell>
  );
}

function BarItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={barStyles.wrap}>
      <View style={barStyles.row}>
        <Text style={barStyles.label}>{label}</Text>
        <Text style={[barStyles.value, { color }]}>{value}%</Text>
      </View>
      <View style={[barStyles.track, { backgroundColor: '#353534' }]}>
        <View style={[barStyles.fill, { backgroundColor: color, width: `${value}%` }]} />
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 12, color: '#c4c7c8' },
  value: { fontSize: 12, fontWeight: '600' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});

function CircularGauge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={gaugeStyles.wrap}>
      <View style={gaugeStyles.svgWrap}>
        <View style={gaugeStyles.ring}>
          <View style={[gaugeStyles.ringFill, { borderColor: color, transform: [{ rotate: `${(value / 100) * 360}deg` }] }]} />
        </View>
        <View style={gaugeStyles.center}>
          <Text style={[gaugeStyles.value, { color: '#e5e2e1' }]}>{value}%</Text>
          <Text style={gaugeStyles.label}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  wrap: { width: 96, height: 96 },
  svgWrap: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: '#353534',
    position: 'absolute',
  },
  ringFill: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
  label: { fontSize: 10, color: '#c4c7c8', fontWeight: '700', textTransform: 'uppercase' },
});

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 28 },
  heroSection: { gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  heroSub: { fontSize: 15, lineHeight: 22, maxWidth: 320 },
  glassSphere: {
    height: 240,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ringOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
  },
  ringInner: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
  },
  glassesWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChip: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  actionsGrid: { gap: 12 },
  actionCard: {
    padding: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
    flexDirection: 'row',
  },
  actionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  actionCardFeatured: {
    padding: 20,
    borderRadius: 4,
    alignItems: 'center',
    gap: 10,
    flexDirection: 'row',
  },
  actionLabelFeatured: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  analyticsRow: { gap: 16 },
  analyticsCard: {
    padding: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderTopWidth: 2,
    gap: 20,
  },
  analyticsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  analyticsLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 4 },
  analyticsTitle: { fontSize: 18, fontWeight: '600' },
  barsGroup: { gap: 14 },
  healthCard: {
    padding: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderLeftWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  healthInfo: { flex: 1, gap: 8 },
  healthLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  healthValue: { fontSize: 14 },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  signalText: { fontSize: 12 },
});

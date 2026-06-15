import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/theme';

import { type ActivityKind, timeAgo, useAivaStore } from '../aiva.store';
import { AppShell } from '../components/AppShell';

type Filter = 'all' | ActivityKind;

const tabs: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'question', label: 'Câu hỏi' },
  { id: 'lookup', label: 'Tra cứu' },
  { id: 'camera', label: 'Máy ảnh' },
];

export function AivaHistoryScreen() {
  const theme = useAppTheme();
  const { device, activities, clearActivities } = useAivaStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [query] = useState('');

  const filtered = useMemo(
    () =>
      activities
        .filter((i) => (filter === 'all' ? true : i.kind === filter))
        .filter((i) =>
          query
            ? (i.title + i.context).toLowerCase().includes(query.toLowerCase())
            : true,
        ),
    [activities, filter, query],
  );

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>LIVE VIEW</Text>
          <View style={[styles.deviceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textMuted + '12' }]}>
            <View style={styles.deviceRow}>
              <View>
                <View style={styles.deviceHeader}>
                  <Text style={[styles.deviceActiveDot, { color: theme.colors.success }]}>●</Text>
                  <Text style={[styles.deviceStatus, { color: theme.colors.success }]}>Active</Text>
                </View>
                <Text style={[styles.deviceName, { color: theme.colors.text }]}>AIVA LENS-1</Text>
                <Text style={[styles.deviceDesc, { color: theme.colors.textMuted }]}>Device Hardware</Text>
              </View>
              <Ionicons name="hardware-chip-outline" size={32} color={theme.colors.textMuted} />
            </View>
            <View style={styles.deviceStatsRow}>
              <View style={styles.deviceStat}>
                <Text style={[styles.deviceStatValue, { color: theme.colors.brandGold }]}>{device.battery}%</Text>
                <Text style={[styles.deviceStatLabel, { color: theme.colors.textMuted }]}>Battery</Text>
              </View>
              <View style={[styles.deviceStatDivider, { backgroundColor: theme.colors.textMuted + '20' }]} />
              <View style={styles.deviceStat}>
                <Text style={[styles.deviceStatValue, { color: theme.colors.text }]}>4.2GB / 64GB</Text>
                <Text style={[styles.deviceStatLabel, { color: theme.colors.textMuted }]}>Storage</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.cloudCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textMuted + '12' }]}>
          <View style={styles.cloudLeft}>
            <Ionicons name="cloud-done-outline" size={24} color={theme.colors.success} />
            <View>
              <Text style={[styles.cloudLabel, { color: theme.colors.text }]}>Cloud Status</Text>
              <Text style={[styles.cloudMeta, { color: theme.colors.textMuted }]}>Synchronized 2m ago</Text>
            </View>
          </View>
          <Pressable style={[styles.syncBtn, { backgroundColor: theme.colors.brandGold }]}>
            <Text style={[styles.syncBtnLabel, { color: theme.colors.background }]}>Sync Now</Text>
          </Pressable>
        </View>

        <View style={[styles.previewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textMuted + '12' }]}>
          <View style={styles.previewHeader}>
            <Ionicons name="videocam-outline" size={20} color={theme.colors.brandGold} />
            <Text style={[styles.previewTitle, { color: theme.colors.text }]}>Testing Live Preview</Text>
          </View>
          <View style={styles.previewMeta}>
            <Text style={[styles.previewMetaText, { color: theme.colors.textMuted }]}>ISO 200 | 1/60s</Text>
            <Text style={[styles.previewMetaText, { color: theme.colors.textMuted }]}>4K@60FPS</Text>
          </View>
          <Text style={[styles.previewCalib, { color: theme.colors.brandGold }]}>LENS CALIBRATION: OPTIMAL</Text>
        </View>

        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: theme.colors.text }]}>QUERY HISTORY</Text>
            <Pressable onPress={clearActivities}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <View style={[styles.searchRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textMuted + '12' }]}>
            <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
            <Text
              style={[styles.searchPlaceholder, { color: theme.colors.textMuted }]}
              onPress={() => {}}
            >
              {query || 'Search...'}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
            {tabs.map((t) => {
              const active = filter === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setFilter(t.id)}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: active ? theme.colors.brandGold : theme.colors.surface,
                      borderColor: active ? theme.colors.brandGold : theme.colors.textMuted + '20',
                    },
                  ]}
                >
                  <Text style={[styles.tabLabel, { color: active ? theme.colors.background : theme.colors.textMuted }]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filtered.length === 0 && (
            <View style={[styles.emptyState, { borderColor: theme.colors.textMuted + '20' }]}>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>No matching activity.</Text>
            </View>
          )}

          <View style={styles.list}>
            {filtered.map((item) => {
              const kindColor =
                item.kind === 'question'
                  ? theme.colors.textMuted
                  : item.kind === 'lookup'
                    ? theme.colors.brandGold
                    : theme.colors.textMuted;
              const kindLabel = item.kind === 'question' ? '?' : item.kind === 'lookup' ? '◆' : '◎';
              const kindTitle = item.kind === 'question' ? 'ANALYSIS' : item.kind === 'lookup' ? 'OCR' : 'CLOUD';
              return (
                <View key={item.id} style={[styles.listItem, { borderColor: theme.colors.textMuted + '10' }]}>
                  <View style={styles.listRow}>
                    <View style={[styles.listIconWrap, { borderColor: theme.colors.textMuted + '15', backgroundColor: theme.colors.surface }]}>
                      <Text style={[styles.listIcon, { color: kindColor }]}>{kindLabel}</Text>
                    </View>
                    <View style={styles.listInfo}>
                      <View style={styles.listMetaRow}>
                        <Text style={[styles.listKind, { color: kindColor }]}>{kindTitle}</Text>
                        <Text style={[styles.listSource, { color: theme.colors.textMuted }]}>{item.source === 'glass' ? 'LENS' : 'PHONE'}</Text>
                      </View>
                      <Text style={[styles.listTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.listTime, { color: theme.colors.textMuted }]}>{timeAgo(item.at)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 24 },
  section: { gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1.5 },
  deviceCard: { padding: 20, borderRadius: 4, borderWidth: 1, gap: 16 },
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  deviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  deviceActiveDot: { fontSize: 10 },
  deviceStatus: { fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  deviceName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  deviceDesc: { fontSize: 13 },
  deviceStatsRow: { flexDirection: 'row', gap: 16 },
  deviceStat: { gap: 2 },
  deviceStatValue: { fontSize: 16, fontWeight: '700' },
  deviceStatLabel: { fontSize: 11 },
  deviceStatDivider: { width: 1 },
  cloudCard: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cloudLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cloudLabel: { fontSize: 14, fontWeight: '600' },
  cloudMeta: { fontSize: 12 },
  syncBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4 },
  syncBtnLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  previewCard: { padding: 20, borderRadius: 4, borderWidth: 1, gap: 12 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewTitle: { fontSize: 14, fontWeight: '600' },
  previewMeta: { flexDirection: 'row', gap: 16 },
  previewMetaText: { fontSize: 12, fontFamily: 'monospace' },
  previewCalib: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  historySection: { gap: 16 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 44, borderRadius: 4, borderWidth: 1 },
  searchPlaceholder: { fontSize: 14, flex: 1 },
  tabsRow: { marginHorizontal: -4, paddingHorizontal: 4 },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  tabLabel: { fontSize: 12, fontWeight: '600' },
  emptyState: { paddingVertical: 40, borderWidth: 1, borderStyle: 'dashed', borderRadius: 4, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  list: { gap: 8 },
  listItem: { padding: 16, borderRadius: 4, borderWidth: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  listIconWrap: { width: 40, height: 40, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  listIcon: { fontSize: 16, fontWeight: '700' },
  listInfo: { flex: 1, gap: 2 },
  listMetaRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  listKind: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  listSource: { fontSize: 9, fontWeight: '500', letterSpacing: 0.5 },
  listTitle: { fontSize: 14, fontWeight: '500' },
  listTime: { fontSize: 11 },
});

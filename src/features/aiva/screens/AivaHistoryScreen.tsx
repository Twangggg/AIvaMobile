import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { alpha } from '@/theme/colors';
import { useAppTheme } from '@/theme/theme';

import { type ActivityKind, queryToActivity, timeAgo, useAivaStore } from '../aiva.store';
import { AppShell } from '../components/AppShell';
import { queriesService } from '../services/queries.service';

type Filter = 'all' | ActivityKind;

export function AivaHistoryScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { device, activities, setActivities, clearActivities, activitiesSyncedAt } = useAivaStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    setLoading(true);
    setSyncError(null);
    try {
      const rows = await queriesService.list();
      setActivities(rows.map(queryToActivity));
    } catch {
      setSyncError(t('history.syncFailed'));
    } finally {
      setLoading(false);
    }
  }, [setActivities, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void sync();
    }, 0);
    return () => clearTimeout(timer);
  }, [sync]);

  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: t('history.all') },
    { id: 'question', label: t('history.questions') },
    { id: 'lookup', label: t('history.lookup') },
    { id: 'camera', label: t('history.camera') },
  ];

  const filtered = useMemo(
    () =>
      activities
        .filter((i) => (filter === 'all' ? true : i.kind === filter))
        .filter((i) =>
          query ? (i.title + i.context + (i.result ?? '')).toLowerCase().includes(query.toLowerCase()) : true,
        ),
    [activities, filter, query],
  );

  const syncLabel = activitiesSyncedAt
    ? t('history.syncedAgo', { time: timeAgo(activitiesSyncedAt) })
    : t('history.notSynced');

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{t('history.liveView')}</Text>
          <View style={[styles.deviceCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.deviceRow}>
              <View>
                <View style={styles.deviceHeader}>
                  <Text
                    style={[
                      styles.deviceActiveDot,
                      { color: device.connected ? theme.colors.success : theme.colors.muted },
                    ]}
                  >
                    ●
                  </Text>
                  <Text
                    style={[
                      styles.deviceStatus,
                      { color: device.connected ? theme.colors.success : theme.colors.textMuted },
                    ]}
                  >
                    {device.connected ? t('history.active') : t('common.disconnected')}
                  </Text>
                </View>
                <Text style={[styles.deviceName, { color: theme.colors.text }]}>
                  {device.name || t('history.deviceName')}
                </Text>
                <Text style={[styles.deviceDesc, { color: theme.colors.textMuted }]}>
                  {device.firmware ? `FW ${device.firmware}` : t('history.deviceHardware')}
                </Text>
              </View>
              <Ionicons name="hardware-chip-outline" size={32} color={theme.colors.textMuted} />
            </View>
            <View style={styles.deviceStatsRow}>
              <View style={styles.deviceStat}>
                <Text style={[styles.deviceStatValue, { color: theme.colors.accent }]}>
                  {device.connected ? `${device.battery || 0}%` : '—'}
                </Text>
                <Text style={[styles.deviceStatLabel, { color: theme.colors.textMuted }]}>{t('history.battery')}</Text>
              </View>
              <View style={[styles.deviceStatDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.deviceStat}>
                <Text style={[styles.deviceStatValue, { color: theme.colors.text }]}>
                  {device.sd ? t('settings.ok') : '—'}
                </Text>
                <Text style={[styles.deviceStatLabel, { color: theme.colors.textMuted }]}>{t('history.storage')}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.cloudCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.cloudLeft}>
            <Ionicons name="cloud-done-outline" size={24} color={theme.colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cloudLabel, { color: theme.colors.text }]}>{t('history.cloudStatus')}</Text>
              <Text style={[styles.cloudMeta, { color: theme.colors.textMuted }]}>{syncLabel}</Text>
            </View>
          </View>
          <Pressable
            onPress={sync}
            disabled={loading}
            style={[styles.syncBtn, { backgroundColor: theme.colors.accent, opacity: loading ? 0.7 : 1 }]}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.onAccent} />
            ) : (
              <Text style={[styles.syncBtnLabel, { color: theme.colors.onAccent }]}>{t('history.syncNow')}</Text>
            )}
          </Pressable>
        </View>
        {syncError ? <Text style={{ color: theme.colors.danger }}>{syncError}</Text> : null}

        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: theme.colors.text }]}>{t('history.queryHistory')}</Text>
            <Pressable
              onPress={() => {
                clearActivities();
              }}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
            </Pressable>
          </View>

          <View style={[styles.searchRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('history.search')}
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.searchInput, { color: theme.colors.text }]}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
            {tabs.map((tab) => {
              const active = filter === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setFilter(tab.id)}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                      borderColor: active ? theme.colors.accent : theme.colors.borderStrong,
                    },
                  ]}
                >
                  <Text style={[styles.tabLabel, { color: active ? theme.colors.onAccent : theme.colors.textMuted }]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filtered.length === 0 && (
            <View style={[styles.emptyState, { borderColor: theme.colors.borderStrong }]}>
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>{t('history.noMatching')}</Text>
            </View>
          )}

          <View style={styles.list}>
            {filtered.map((item) => {
              const kindColor =
                item.kind === 'question'
                  ? theme.colors.accent
                  : item.kind === 'lookup'
                    ? theme.colors.accent
                    : theme.colors.textMuted;
              const kindLabel = item.kind === 'question' ? '?' : item.kind === 'lookup' ? '◆' : '◎';
              const kindTitle =
                item.kind === 'question'
                  ? t('history.analysis')
                  : item.kind === 'lookup'
                    ? t('history.ocr')
                    : t('history.cloud');
              return (
                <View
                  key={item.id}
                  style={[styles.listItem, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                >
                  <View style={styles.listRow}>
                    <View
                      style={[
                        styles.listIconWrap,
                        {
                          borderColor: theme.colors.border,
                          backgroundColor: alpha(kindColor, 0.12),
                        },
                      ]}
                    >
                      <Text style={[styles.listIcon, { color: kindColor }]}>{kindLabel}</Text>
                    </View>
                    <View style={styles.listInfo}>
                      <View style={styles.listMetaRow}>
                        <Text style={[styles.listKind, { color: kindColor }]}>{kindTitle}</Text>
                        <Text style={[styles.listSource, { color: theme.colors.textMuted }]}>
                          {item.source === 'glass' ? t('history.lens') : t('history.phone')}
                        </Text>
                        {item.status ? (
                          <Text style={[styles.listSource, { color: theme.colors.textMuted }]}>
                            {item.status === 'degraded' ? t('ask.degradedBadge') : item.status}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={[styles.listTitle, { color: theme.colors.text }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.result ? (
                        <Text style={[styles.listTime, { color: theme.colors.textMuted }]} numberOfLines={2}>
                          {item.result}
                        </Text>
                      ) : null}
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
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28, gap: 20 },
  section: { gap: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8 },
  deviceCard: { padding: 20, borderRadius: 12, borderWidth: 1, gap: 16 },
  deviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  deviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  deviceActiveDot: { fontSize: 10 },
  deviceStatus: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8 },
  deviceName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  deviceDesc: { fontSize: 13 },
  deviceStatsRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  deviceStat: { gap: 2 },
  deviceStatValue: { fontSize: 16, fontWeight: '700' },
  deviceStatLabel: { fontSize: 11 },
  deviceStatDivider: { width: 1, height: 28 },
  cloudCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cloudLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cloudLabel: { fontSize: 14, fontWeight: '600' },
  cloudMeta: { fontSize: 12 },
  syncBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, minHeight: 40, justifyContent: 'center' },
  syncBtnLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  historySection: { gap: 16 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { fontSize: 14, flex: 1, padding: 0 },
  tabsRow: { marginHorizontal: -4, paddingHorizontal: 4 },
  tab: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  tabLabel: { fontSize: 12, fontWeight: '600' },
  emptyState: {
    paddingVertical: 40,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14 },
  list: { gap: 8 },
  listItem: { padding: 16, borderRadius: 12, borderWidth: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  listIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listIcon: { fontSize: 16, fontWeight: '700' },
  listInfo: { flex: 1, gap: 2 },
  listMetaRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  listKind: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  listSource: { fontSize: 10, fontWeight: '500' },
  listTitle: { fontSize: 14, fontWeight: '500' },
  listTime: { fontSize: 11 },
});

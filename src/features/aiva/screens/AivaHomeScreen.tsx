import { Ionicons } from '@expo/vector-icons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ENV } from '@/config/env';
import type { AppTabParamList, MainStackParamList } from '@/navigation/types';
import { BLEService } from '@/services/ble/ble.service';
import { startDeviceHub } from '@/services/signalr/deviceHub';
import { AlertModal } from '@/shared/components/AlertModal';
import { useAlert } from '@/shared/hooks/useAlert';
import { alpha } from '@/theme/colors';
import { useAppTheme } from '@/theme/theme';

import { queryToActivity, useAivaStore } from '../aiva.store';
import { AppShell } from '../components/AppShell';
import { SoftSlider } from '../components/SoftSlider';
import { DEVICE_DEFAULTS } from '../device.defaults';
import { loadSavedDevice, type SavedDevice } from '../services/device.storage';
import { fetchAiHealth } from '../services/health.service';
import { queriesService } from '../services/queries.service';
import { evaluateSafetyGate, recordUsageMinutes } from '../services/safety.policy';
import { getLatestUpload } from '../services/uploads.service';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'AivaHome'>,
  NativeStackNavigationProp<MainStackParamList>
>;

const GLASSES_IMG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA1KVaxIwpAfAlKYcdQmn1_o_YWJJ1WbcKq6NZ0vXQ2bIOzG23D0LPKwVpQvSQEVxCbA-BLsuwz2FEjbUDYnadEqXyoQ_adkO6lHkouLAYDPPlXNzOoWNO4jMVCQ8F6rVaffozFYa7iebpL8l_esUxImocqcfpqD5Ewan3ke_3KiXwO_W7QkHzS1yS1VKwTNtZMbELwsqw7mk1mkP5zrYTigAoVsxjdp8kx8hZB0zCbutztsE9QPdHU';

export function AivaHomeScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const navigation = useNavigation<HomeNav>();
  const { device, activities } = useAivaStore();
  const { alert, AlertModalProps } = useAlert();
  const [volume, setVolume] = useState<number>(DEVICE_DEFAULTS.audio.volume);
  const [scrollLock, setScrollLock] = useState(false);
  const [savedDevice, setSavedDevice] = useState<SavedDevice | null>(null);
  const [aiOnline, setAiOnline] = useState<boolean | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureModalVisible, setCaptureModalVisible] = useState(false);
  const [captureImageUri, setCaptureImageUri] = useState<string | null>(null);
  const [captureAnalysis, setCaptureAnalysis] = useState<string | null>(null);
  const [capturePolling, setCapturePolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCaptureTime = useRef(0);
  const volumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSavedDevice().then((saved) => {
      setSavedDevice(saved);
      if (saved?.cloudDeviceId) {
        useAivaStore.getState().updateDevice({ cloudDeviceId: saved.cloudDeviceId });
      }
    });
    void queriesService
      .list()
      .then((rows) => useAivaStore.getState().setActivities(rows.map(queryToActivity)))
      .catch(() => {});
    void fetchAiHealth()
      .then((h) => setAiOnline(h.ok))
      .catch(() => setAiOnline(false));
  }, [device.connected]);

  useEffect(() => {
    void startDeviceHub(device.cloudDeviceId || device.deviceId || undefined).catch(() => {});
  }, [device.cloudDeviceId, device.deviceId]);

  useEffect(() => {
    if (!device.connected) return;
    const tick = () => {
      BLEService.getShared().sendCommand('status').catch(() => {});
    };
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [device.connected]);

  const commitVolume = useCallback(
    (v: number) => {
      if (!device.connected) return;
      if (volumeTimer.current) clearTimeout(volumeTimer.current);
      volumeTimer.current = setTimeout(() => {
        BLEService.getShared()
          .writeConfig({ audio: { volume: v } } as any)
          .catch(() => {});
      }, 400);
    },
    [device.connected],
  );

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const questionsToday = activities.filter(
    (a) => a.kind === 'question' && a.at >= startOfDay.getTime(),
  ).length;
  const screenMinutes = Math.max(0, Math.round((Date.now() - startOfDay.getTime()) / 60000 / 12));
  const screenHoursLabel = `${(screenMinutes / 60).toFixed(1)}`;

  const recentFeed = activities.slice(0, 8);

  const handleCapture = async () => {
    if (!device.connected || capturing) return;
    const gate = await evaluateSafetyGate('capture');
    if (!gate.allowed) {
      alert(t('common.error'), t(gate.messageKey));
      return;
    }
    setCapturing(true);
    setCaptureImageUri(null);
    setCaptureAnalysis(null);
    lastCaptureTime.current = Date.now();
    try {
      await BLEService.getShared().sendCommand('assist_test');
      setCaptureModalVisible(true);
      setCapturePolling(true);
      pollingTimeoutRef.current = setTimeout(() => {
        setCapturePolling(false);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }, 30000);
      pollingRef.current = setInterval(async () => {
        const baseUrl = device.appUrl || ENV.EXPO_PUBLIC_API_URL;
        if (!baseUrl) return;
        const upload = await getLatestUpload(baseUrl, device.cloudDeviceId || device.deviceId || undefined);
        if (upload && new Date(upload.file.uploadedAt).getTime() > lastCaptureTime.current) {
          setCaptureImageUri(`${baseUrl}${upload.url}`);
          setCapturePolling(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
          }
          if (upload.analysis) setCaptureAnalysis(upload.analysis);
          useAivaStore.getState().addActivity({
            kind: 'camera',
            title: t('dashboard.captureActivity'),
            context: upload.analysis?.slice(0, 80) || t('dashboard.capture'),
            source: 'glass',
          });
          void recordUsageMinutes(1);
          void queriesService
            .list('camera')
            .then((rows) => {
              const mapped = rows.map((q) => ({
                id: q.id,
                kind: q.kind,
                title: q.title,
                context: q.context,
                source: q.source,
                at: new Date(q.createdAt).getTime(),
                status: q.status,
                result: q.result,
              }));
              useAivaStore.getState().setActivities([
                ...mapped,
                ...useAivaStore.getState().activities.filter((a) => a.kind !== 'camera'),
              ].slice(0, 50));
            })
            .catch(() => {});
        }
      }, 3000);
    } catch {
      alert(t('common.error'), t('alerts.captureError'));
    } finally {
      setCapturing(false);
    }
  };

  const closeCaptureModal = () => {
    setCaptureModalVisible(false);
    setCaptureImageUri(null);
    setCaptureAnalysis(null);
    setCapturePolling(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  };

  const batteryLabel = device.connected ? `${device.battery || 85}%` : '—';
  const statusLabel = device.connected ? t('dashboard.statusOnline') : t('dashboard.connectHint');

  return (
    <AppShell>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!scrollLock}
      >
        {aiOnline === false ? (
          <Pressable
            onPress={() => navigation.navigate('AivaAsk')}
            style={[
              styles.aiBanner,
              { backgroundColor: alpha(theme.colors.accent, 0.12), borderColor: theme.colors.accent },
            ]}
          >
            <Text style={[styles.aiBannerText, { color: theme.colors.text }]}>{t('dashboard.aiOffline')}</Text>
          </Pressable>
        ) : null}

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              ...theme.shadows.card,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.statusLeft}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: device.connected ? theme.colors.successDeep : theme.colors.muted },
                ]}
              />
              <Text style={[styles.statusText, { color: theme.colors.text }]} numberOfLines={1}>
                {statusLabel}
              </Text>
            </View>
            <View style={styles.statusRight}>
              <Ionicons name="battery-half" size={18} color={theme.colors.primary} />
              <Text style={[styles.batteryText, { color: theme.colors.primary }]}>{batteryLabel}</Text>
            </View>
          </View>

          <View style={styles.heroImageWrap}>
            <Image source={{ uri: GLASSES_IMG }} style={styles.heroImage} resizeMode="cover" />
          </View>
          <Text style={[styles.deviceTitle, { color: theme.colors.primary }]}>
            {device.name || 'AIVA Glass X1'}
          </Text>
          {device.wifiSsid || device.connected ? (
            <View style={styles.wifiRow}>
              <Ionicons name="wifi" size={16} color={theme.colors.muted} />
              <Text style={[styles.wifiText, { color: theme.colors.muted }]}>
                {device.wifiSsid || t('common.notAvailable')}
              </Text>
            </View>
          ) : null}

          {!device.connected ? (
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => navigation.navigate('AivaPlay')}
                style={[
                  styles.cta,
                  styles.ctaFlex,
                  { backgroundColor: theme.colors.primary, ...theme.shadows.elevated },
                ]}
              >
                <Ionicons name="game-controller" size={18} color={theme.colors.onPrimary} />
                <Text style={[styles.ctaLabel, { color: theme.colors.onPrimary }]}>{t('dashboard.playCta')}</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('AivaPair')}
                style={[styles.cta, styles.ctaFlex, { backgroundColor: theme.colors.accent }]}
              >
                <Text style={[styles.ctaLabel, { color: theme.colors.onAccent }]} numberOfLines={1}>
                  {savedDevice ? t('dashboard.reconnectCta') : t('dashboard.connectCta')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.volumeHeader}>
                <Text style={[styles.volumeLabel, { color: theme.colors.textMuted }]}>
                  {t('dashboard.volume')}
                </Text>
                <Text style={[styles.volumeValue, { color: theme.colors.primary }]}>{volume}%</Text>
              </View>
              <SoftSlider
                value={volume}
                onChange={setVolume}
                onSlidingComplete={commitVolume}
                onDragStateChange={setScrollLock}
                accentColor={theme.colors.primary}
                trackColor={theme.colors.surface4}
              />

              <View style={styles.actionRow}>
                <Pressable
                  onPress={handleCapture}
                  disabled={capturing}
                  style={[
                    styles.cta,
                    styles.ctaFlex,
                    {
                      backgroundColor: theme.colors.primary,
                      opacity: capturing ? 0.6 : 1,
                    },
                  ]}
                >
                  <Ionicons name="camera" size={18} color={theme.colors.onPrimary} />
                  <Text style={[styles.ctaLabel, { color: theme.colors.onPrimary }]}>
                    {capturing ? t('dashboard.capturing') : t('dashboard.capture')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => navigation.navigate('AivaAsk')}
                  style={[styles.cta, styles.ctaFlex, { backgroundColor: theme.colors.accent }]}
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color={theme.colors.onAccent} />
                  <Text style={[styles.ctaLabel, { color: theme.colors.onAccent }]}>{t('ask.askAi')}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                ...theme.shadows.card,
              },
            ]}
          >
            <Ionicons name="compass" size={32} color={theme.colors.accent} />
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>{questionsToday}</Text>
            <Text style={[styles.statCaption, { color: theme.colors.muted }]}>
              {t('dashboard.questionsAsked')}
            </Text>
            <Text style={[styles.statFooter, { color: theme.colors.text }]}>
              {t('dashboard.explorations')}
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                ...theme.shadows.card,
              },
            ]}
          >
            <Ionicons name="timer" size={32} color={theme.colors.successDeep} />
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {screenHoursLabel}
              <Text style={{ fontSize: 18 }}>h</Text>
            </Text>
            <Text style={[styles.statCaption, { color: theme.colors.muted }]}>
              {t('dashboard.timeSaved')}
            </Text>
            <Text style={[styles.statFooter, { color: theme.colors.text }]}>
              {t('dashboard.screenTime')}
            </Text>
          </View>
        </View>

        <View style={styles.feedHeader}>
          <Text style={[styles.feedTitle, { color: theme.colors.text }]}>{t('dashboard.recentFeed')}</Text>
          <Pressable onPress={() => navigation.navigate('AivaHistory')}>
            <Text style={[styles.viewAll, { color: theme.colors.primary }]}>{t('dashboard.viewAll')}</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedScroll}>
          {recentFeed.length === 0 ? (
            <View
              style={[
                styles.emptyFeed,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <Text style={{ color: theme.colors.textMuted }}>{t('dashboard.emptyFeed')}</Text>
            </View>
          ) : (
            recentFeed.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => navigation.navigate('AivaHistory')}
                style={[
                  styles.feedCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    ...theme.shadows.card,
                  },
                ]}
              >
                <View style={styles.feedBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.feedItemTitle, { color: theme.colors.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={[styles.feedItemSub, { color: theme.colors.muted }]} numberOfLines={1}>
                      {item.context || item.kind}
                    </Text>
                  </View>
                  <View style={[styles.playBtn, { backgroundColor: theme.colors.accent }]}>
                    <Ionicons name="arrow-forward" size={18} color={theme.colors.onAccent} />
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </ScrollView>

      <Modal visible={captureModalVisible} transparent animationType="fade" onRequestClose={closeCaptureModal}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.primary }]}>{t('capture.title')}</Text>
            {capturePolling && !captureImageUri ? (
              <Text style={{ color: theme.colors.textMuted }}>{t('capture.waiting')}</Text>
            ) : captureImageUri ? (
              <Image source={{ uri: captureImageUri }} style={styles.captureImage} resizeMode="contain" />
            ) : (
              <Text style={{ color: theme.colors.textMuted }}>{t('capture.noImage')}</Text>
            )}
            {captureAnalysis ? (
              <Text style={{ color: theme.colors.text, marginTop: 8 }}>{captureAnalysis}</Text>
            ) : null}
            <Pressable
              onPress={closeCaptureModal}
              style={[styles.cta, { backgroundColor: theme.colors.accent, marginTop: 16 }]}
            >
              <Text style={[styles.ctaLabel, { color: theme.colors.onAccent }]}>{t('common.close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <AlertModal {...AlertModalProps} />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 16 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  batteryText: { fontSize: 13, fontWeight: '700' },
  aiBanner: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  aiBannerText: { fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 12 },
  heroImageWrap: { height: 140, borderRadius: 16, overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  deviceTitle: { fontSize: 22, fontWeight: '700' },
  wifiRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wifiText: { fontSize: 13 },
  volumeHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  volumeLabel: { fontSize: 13, fontWeight: '600' },
  volumeValue: { fontSize: 13, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cta: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  ctaFlex: { flex: 1 },
  ctaLabel: { fontSize: 14, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, borderRadius: 20, borderWidth: 1, padding: 16, gap: 4 },
  statNumber: { fontSize: 28, fontWeight: '700', marginTop: 8 },
  statCaption: { fontSize: 12 },
  statFooter: { fontSize: 13, fontWeight: '600' },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedTitle: { fontSize: 18, fontWeight: '700' },
  viewAll: { fontSize: 12, fontWeight: '600' },
  feedScroll: { gap: 12, paddingRight: 8 },
  emptyFeed: {
    minWidth: 260,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  feedCard: {
    width: 240,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  feedBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedItemTitle: { fontSize: 15, fontWeight: '600' },
  feedItemSub: { fontSize: 12, marginTop: 4 },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 20, padding: 20, gap: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  captureImage: { width: '100%', height: 240, borderRadius: 12 },
});

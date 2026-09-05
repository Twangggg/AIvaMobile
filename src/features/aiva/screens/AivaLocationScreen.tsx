import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BLEService } from '@/services/ble/ble.service';
import { AlertModal } from '@/shared/components/AlertModal';
import { useAlert } from '@/shared/hooks/useAlert';
import { alpha } from '@/theme/colors';
import { useAppTheme } from '@/theme/theme';

import { useAivaStore } from '../aiva.store';
import { AppShell } from '../components/AppShell';
import { evaluateGeofence } from '../services/geofence';
import {
  DEFAULT_LOCATION,
  loadLocationSettings,
  type LocationSettings,
  saveLocationSettings,
} from '../services/location.storage';

export function AivaLocationScreen() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { device } = useAivaStore();
  const { alert, AlertModalProps } = useAlert();
  const [settings, setSettings] = useState<LocationSettings>(DEFAULT_LOCATION);
  const [locating, setLocating] = useState(false);
  const [geofenceAlert, setGeofenceAlert] = useState(false);
  const [distanceLabel, setDistanceLabel] = useState<string | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const alertedRef = useRef(false);

  useEffect(() => {
    loadLocationSettings().then(setSettings);
  }, []);

  const applyPosition = useCallback(
    async (coords: { latitude: number; longitude: number }, persist: boolean) => {
      const next: LocationSettings = {
        ...settings,
        lastKnown: { ...coords, updatedAt: Date.now() },
      };
      setSettings(next);
      if (persist) await saveLocationSettings(next);

      const fence = evaluateGeofence(coords, next.zones);
      setGeofenceAlert(fence.alert);
      setDistanceLabel(
        fence.nearestDistanceM != null ? `${Math.round(fence.nearestDistanceM)} m` : null,
      );
      if (fence.alert && !alertedRef.current) {
        alertedRef.current = true;
        alert(t('location.geofenceTitle'), t('location.geofenceBody'));
      }
      if (!fence.alert) alertedRef.current = false;
    },
    [alert, settings, t],
  );

  const refreshPhoneLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert(t('common.error'), t('location.permissionDenied'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await applyPosition(
        { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
        true,
      );
    } catch {
      alert(t('common.error'), t('location.locateFailed'));
    } finally {
      setLocating(false);
    }
  }, [alert, applyPosition, t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 25,
          timeInterval: 20000,
        },
        (pos) => {
          void applyPosition(
            { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
            true,
          );
        },
      );
    })();
    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [applyPosition]);

  const setZoneHere = async (zoneId: string) => {
    if (!settings.lastKnown) {
      await refreshPhoneLocation();
      return;
    }
    const next: LocationSettings = {
      ...settings,
      zones: settings.zones.map((z) =>
        z.id === zoneId
          ? { ...z, latitude: settings.lastKnown!.latitude, longitude: settings.lastKnown!.longitude }
          : z,
      ),
    };
    setSettings(next);
    await saveLocationSettings(next);
    alert(t('common.success'), t('location.zoneSaved'));
    const fence = evaluateGeofence(settings.lastKnown, next.zones);
    setGeofenceAlert(fence.alert);
  };

  const findGlasses = async () => {
    if (!device.connected) {
      alert(t('common.error'), t('location.needConnect'));
      return;
    }
    try {
      await BLEService.getShared().writeConfig({
        audio: { volume: 90 },
      } as any);
      useAivaStore.getState().updateDevice({ volume: 90 });
      alert(t('common.success'), t('location.findSent'));
    } catch {
      alert(t('common.error'), t('location.findFailed'));
    }
  };

  const coordsLabel = settings.lastKnown
    ? `${settings.lastKnown.latitude.toFixed(5)}, ${settings.lastKnown.longitude.toFixed(5)}`
    : t('location.mapHint');

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {geofenceAlert ? (
          <View
            style={[
              styles.alertBanner,
              { backgroundColor: alpha(theme.colors.danger, 0.12), borderColor: theme.colors.danger },
            ]}
          >
            <Ionicons name="warning" size={18} color={theme.colors.danger} />
            <Text style={{ color: theme.colors.danger, flex: 1, fontWeight: '600' }}>
              {t('location.geofenceBanner')}
              {distanceLabel ? ` · ${distanceLabel}` : ''}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.mapCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              ...theme.shadows.card,
            },
          ]}
        >
          <View style={[styles.map, { backgroundColor: alpha(theme.colors.primary, 0.08) }]}>
            <View style={[styles.locPill, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="happy-outline" size={14} color={theme.colors.onPrimary} />
              <Text style={[styles.locPillText, { color: theme.colors.onPrimary }]}>
                {t('location.glassesLabel')}
              </Text>
            </View>
            <View style={[styles.pin, { backgroundColor: theme.colors.accent }]}>
              <Ionicons name="location" size={20} color={theme.colors.onAccent} />
            </View>
            <Text style={[styles.coords, { color: theme.colors.textMuted }]}>{coordsLabel}</Text>
          </View>

          <View style={styles.mapFooter}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.locTitle, { color: theme.colors.text }]}>{t('location.current')}</Text>
              <Text style={[styles.locSub, { color: theme.colors.textMuted }]}>
                {settings.lastKnown ? t('location.updatedNow') : t('location.noFix')}
                {locating ? ` · ${t('common.refreshing')}` : ''}
              </Text>
            </View>
            <Pressable
              style={[styles.targetBtn, { backgroundColor: theme.colors.surface2 }]}
              onPress={refreshPhoneLocation}
              disabled={locating}
            >
              <Ionicons name="locate" size={22} color={theme.colors.primary} />
            </Pressable>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{t('location.safeZones')}</Text>
        <View
          style={[
            styles.zonesCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              ...theme.shadows.card,
            },
          ]}
        >
          {settings.zones.map((zone) => {
            const pinned = zone.latitude != null && zone.longitude != null;
            return (
              <Pressable
                key={zone.id}
                onPress={() => setZoneHere(zone.id)}
                style={[
                  styles.zoneRow,
                  {
                    backgroundColor: pinned
                      ? theme.colors.background
                      : alpha(theme.colors.danger, 0.06),
                    borderColor: pinned ? theme.colors.border : alpha(theme.colors.danger, 0.2),
                  },
                ]}
              >
                <View
                  style={[
                    styles.zoneIcon,
                    {
                      backgroundColor: pinned
                        ? alpha(theme.colors.success, 0.15)
                        : theme.colors.dangerContainer,
                    },
                  ]}
                >
                  <Ionicons
                    name={zone.kind === 'home' ? 'home' : 'school'}
                    size={22}
                    color={pinned ? theme.colors.successDeep : theme.colors.danger}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.zoneTitle, { color: theme.colors.text }]}>
                    {zone.kind === 'home'
                      ? t('location.home')
                      : zone.kind === 'school'
                        ? t('location.school')
                        : zone.name}
                  </Text>
                  <View style={styles.zoneStatus}>
                    <View
                      style={[
                        styles.miniDot,
                        { backgroundColor: pinned ? theme.colors.successDeep : theme.colors.danger },
                      ]}
                    />
                    <Text
                      style={[
                        styles.zoneStatusText,
                        { color: pinned ? theme.colors.successDeep : theme.colors.danger },
                      ]}
                    >
                      {pinned
                        ? `${t('location.zoneSet')} · ${zone.radiusMeters}m`
                        : t('location.tapToSet')}
                    </Text>
                  </View>
                </View>
                <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.muted} />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={findGlasses}
          style={[styles.findBtn, { backgroundColor: theme.colors.accent, ...theme.shadows.elevated }]}
        >
          <Ionicons name="volume-high" size={22} color={theme.colors.onAccent} />
          <Text style={[styles.findLabel, { color: theme.colors.onAccent }]}>{t('location.findGlasses')}</Text>
        </Pressable>
        <Text style={[styles.findHint, { color: theme.colors.muted }]}>{t('location.findHint')}</Text>
        <Text style={[styles.findHint, { color: theme.colors.textMuted }]}>{t('location.glassesGpsNote')}</Text>
      </ScrollView>
      <AlertModal {...AlertModalProps} />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 16 },
  alertBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  map: { height: 220, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 16 },
  locPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  locPillText: { fontSize: 13, fontWeight: '600' },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coords: { fontSize: 12, textAlign: 'center' },
  mapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 12,
  },
  locTitle: { fontSize: 22, fontWeight: '600' },
  locSub: { fontSize: 14, marginTop: 4 },
  targetBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  zonesCard: { borderRadius: 20, borderWidth: 1, padding: 12, gap: 10 },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  zoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneTitle: { fontSize: 16, fontWeight: '600' },
  zoneStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  miniDot: { width: 6, height: 6, borderRadius: 3 },
  zoneStatusText: { fontSize: 12, fontWeight: '600' },
  findBtn: {
    minHeight: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  findLabel: { fontSize: 16, fontWeight: '700' },
  findHint: { fontSize: 12, textAlign: 'center', marginTop: -8 },
});

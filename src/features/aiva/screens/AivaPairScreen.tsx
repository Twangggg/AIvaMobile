import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AccountSettingsSection } from '@/features/auth/components/AccountSettingsSection';
import { useAuth } from '@/features/auth/hooks';
import { useBLEConnection } from '@/hooks/useBLEConnection';
import { DEFAULT_SECRET_KEY } from '@/services/ble/ble.types';
import { setApiBaseUrl } from '@/services/http/client';
import { DeviceBridge } from '@/services/iot/device.bridge';
import { stopDeviceHub } from '@/services/signalr/deviceHub';
import { AlertModal } from '@/shared/components/AlertModal';
import { useAlert } from '@/shared/hooks/useAlert';
import { alpha } from '@/theme/colors';
import { useAppTheme } from '@/theme/theme';

import { useAivaStore } from '../aiva.store';
import { AppShell } from '../components/AppShell';
import { SoftSwitch } from '../components/SoftSwitch';
import { DEVICE_DEFAULTS } from '../device.defaults';
import { clearSavedDevice, loadSavedDevice, type SavedDevice } from '../services/device.storage';

const FRAME_PRESETS = [
  { id: 'low', framesize: 6 },
  { id: 'medium', framesize: 8 },
  { id: 'high', framesize: 13 },
] as const;

/** User-facing photo quality → JPEG compression (lower number = better looking photo). */
const QUALITY_PRESETS = [
  { id: 'low', quality: 22 },
  { id: 'medium', quality: 12 },
  { id: 'high', quality: 8 },
] as const;

function nearestQualityPreset(value: number): number {
  let best: number = QUALITY_PRESETS[1].quality;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const p of QUALITY_PRESETS) {
    const dist = Math.abs(p.quality - value);
    if (dist < bestDist) {
      best = p.quality;
      bestDist = dist;
    }
  }
  return best;
}

function nearestFramePreset(value: number): number {
  let best: number = FRAME_PRESETS[1].framesize;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const p of FRAME_PRESETS) {
    const dist = Math.abs(p.framesize - value);
    if (dist < bestDist) {
      best = p.framesize;
      bestDist = dist;
    }
  }
  return best;
}

export function AivaPairScreen() {
  const { t, i18n } = useTranslation();
  const theme = useAppTheme();
  const { logout } = useAuth();
  const { device, updateDevice } = useAivaStore();
  const { alert, AlertModalProps } = useAlert();
  const {
    scanning, devices, connecting, authenticating, error,
    config, wifiScanning, wifiNetworks,
    startScan, connectAndAuth, disconnect,
    writeConfig, sendCommand, scanWifi, clearError,
  } = useBLEConnection(alert);

  const [secretKey, setSecretKey] = useState<string>(DEVICE_DEFAULTS.secretKey);
  const [wifiSSID, setWifiSSID] = useState<string>(DEVICE_DEFAULTS.wifi.ssid);
  const [wifiPass, setWifiPass] = useState<string>(DEVICE_DEFAULTS.wifi.pass);
  const [serverUrl, setServerUrl] = useState<string>(DEVICE_DEFAULTS.server.url);
  const [serverToken, setServerToken] = useState<string>(DEVICE_DEFAULTS.server.token);
  const [appUrl, setAppUrl] = useState<string>(DEVICE_DEFAULTS.server.app_url);
  const [showWifiPass, setShowWifiPass] = useState(false);
  const [showManualSSID, setShowManualSSID] = useState(false);
  const [savingWifi, setSavingWifi] = useState(false);
  const [savingServer, setSavingServer] = useState(false);
  const [connectingWifi, setConnectingWifi] = useState(false);
  const [showWifiForm, setShowWifiForm] = useState(false);
  const [savedDevice, setSavedDevice] = useState<SavedDevice | null>(null);
  const [cameraQuality, setCameraQuality] = useState<number>(DEVICE_DEFAULTS.camera.quality);
  const [framesize, setFramesize] = useState<number>(DEVICE_DEFAULTS.camera.framesize);
  const [wakeEnabled, setWakeEnabled] = useState(false);
  const [wakePhrase, setWakePhrase] = useState('');
  const [volume, setVolume] = useState<number>(DEVICE_DEFAULTS.audio.volume);
  const [savingDevice, setSavingDevice] = useState(false);
  const [botUrl, setBotUrl] = useState(String(DEVICE_DEFAULTS.iotBotUrl));
  const [botBusy, setBotBusy] = useState(false);
  const [showTrial, setShowTrial] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const step = device.connected ? 'connected' : connecting ? 'authenticating' : scanning ? 'scanning' : 'idle';

  const wifiStatusLabels: Record<string, string> = {
    connected: t('settings.networkStatusConnected'),
    no_ssid: t('settings.networkStatusNoSsid'),
    auth_failed: t('settings.networkStatusAuthFailed'),
    disconnected: t('settings.networkStatusDisconnected'),
  };

  useEffect(() => {
    loadSavedDevice().then((saved) => {
      if (!saved) return;
      setSavedDevice(saved);
      setSecretKey(saved.secretKey || DEFAULT_SECRET_KEY);
      if (!device.connected && saved.name) {
        updateDevice({ name: saved.name, deviceId: saved.id });
      }
    });
    void DeviceBridge.getShared().hydrate().then(() => {
      const u = useAivaStore.getState().device.iotBotUrl;
      if (u) setBotUrl(u);
    });
  }, []);

  useEffect(() => {
    if (device.connected) scanWifi();
  }, [device.connected]);

  useEffect(() => {
    if (!config) return;
    const timer = setTimeout(() => {
      setWifiSSID(config.wifi?.ssid || DEVICE_DEFAULTS.wifi.ssid);
      setWifiPass(DEVICE_DEFAULTS.wifi.pass);
      setServerUrl(config.server?.url || DEVICE_DEFAULTS.server.url);
      setServerToken(config.server?.token || DEVICE_DEFAULTS.server.token);
      const url = config.server?.app_url || DEVICE_DEFAULTS.server.app_url;
      setAppUrl(url);
      if (url) updateDevice({ appUrl: url });
      setCameraQuality(nearestQualityPreset(config.camera?.quality ?? DEVICE_DEFAULTS.camera.quality));
      setFramesize(nearestFramePreset(config.camera?.framesize ?? DEVICE_DEFAULTS.camera.framesize));
      setWakeEnabled(Boolean(config.wakeword?.enabled));
      setWakePhrase(config.wakeword?.phrase || '');
      setVolume(config.audio?.volume ?? DEVICE_DEFAULTS.audio.volume);
    }, 0);
    return () => clearTimeout(timer);
  }, [config, updateDevice]);

  const handleSelectNetwork = (ssid: string) => {
    setWifiSSID(ssid);
    setShowManualSSID(false);
  };

  const handleReconnect = useCallback(async () => {
    if (!savedDevice || connecting || authenticating) return;
    await connectAndAuth(savedDevice.id, secretKey || savedDevice.secretKey, savedDevice.name);
  }, [savedDevice, connecting, authenticating, connectAndAuth, secretKey]);

  const handleForgetDevice = useCallback(async () => {
    await clearSavedDevice();
    setSavedDevice(null);
  }, []);

  const handleSaveDeviceSettings = useCallback(async () => {
    if (savingDevice) return;
    setSavingDevice(true);
    try {
      const quality = Math.min(63, Math.max(1, cameraQuality));
      const vol = Math.min(100, Math.max(0, volume));
      await writeConfig({
        camera: { framesize, quality },
        audio: { volume: vol },
        wakeword: {
          enabled: wakeEnabled,
          phrase: wakePhrase,
          cutoff: config?.wakeword?.cutoff ?? 0.5,
          sliding_window: config?.wakeword?.sliding_window ?? 5,
          cooldown_ms: config?.wakeword?.cooldown_ms ?? 2000,
          rec_silence_rms: config?.wakeword?.rec_silence_rms ?? 500,
          rec_silence_ms: config?.wakeword?.rec_silence_ms ?? 800,
          rec_min_ms: config?.wakeword?.rec_min_ms ?? 400,
          rec_max_ms: config?.wakeword?.rec_max_ms ?? 8000,
        },
      } as any);
      alert(t('common.success'), t('alerts.deviceSettingsSaved'));
    } catch (e) {
      alert(t('common.error'), (e as Error).message || t('alerts.saveFailed'));
    } finally {
      setSavingDevice(false);
    }
  }, [savingDevice, cameraQuality, framesize, volume, wakeEnabled, wakePhrase, config, writeConfig, alert, t]);

  const handleSaveServer = useCallback(async () => {
    if (savingServer) return;
    setSavingServer(true);
    try {
      const partial: any = {};
      if (serverUrl) partial.server = { url: serverUrl };
      if (serverToken) partial.server = { ...partial.server, token: serverToken };
      if (appUrl) {
        partial.server = { ...partial.server, app_url: appUrl };
        setApiBaseUrl(appUrl);
      }
      await writeConfig(partial);
      updateDevice({ serverUrl: serverUrl || '', appUrl: appUrl || '' });
      alert(t('common.success'), t('alerts.serverSaved'));
    } catch (e) {
      alert(t('common.error'), (e as Error).message || t('alerts.saveFailed'));
    } finally {
      setSavingServer(false);
    }
  }, [serverUrl, serverToken, appUrl, writeConfig, savingServer, t, updateDevice, alert]);

  const handleSaveConnectWifi = useCallback(async () => {
    if (!wifiSSID || savingWifi || connectingWifi) return;
    setSavingWifi(true);
    try {
      const partial: any = { wifi: { ssid: wifiSSID } };
      if (wifiPass) partial.wifi.pass = wifiPass;
      await writeConfig(partial);
      setConnectingWifi(true);
      // Firmware needs explicit connect after credentials are written.
      await sendCommand('connect');
      await sendCommand('status');
    } catch (e) {
      setConnectingWifi(false);
      alert(t('common.error'), (e as Error).message || t('alerts.saveFailed'));
    } finally {
      setSavingWifi(false);
    }
  }, [wifiSSID, wifiPass, savingWifi, connectingWifi, writeConfig, sendCommand, alert, t]);

  const handleReconnectWifi = useCallback(async () => {
    if (connectingWifi) return;
    setConnectingWifi(true);
    try {
      await sendCommand('connect');
      await sendCommand('status');
    } catch (e) {
      setConnectingWifi(false);
      alert(t('common.error'), (e as Error).message || t('alerts.saveFailed'));
    }
  }, [connectingWifi, sendCommand, alert, t]);

  const notifiedRef = useRef(false);
  useEffect(() => {
    if (!connectingWifi) { notifiedRef.current = false; return; }
    if (device.wifiStatus === 'connected') {
      notifiedRef.current = true;
      const t2 = setTimeout(() => { setConnectingWifi(false); setShowWifiForm(false); alert(t('common.success'), t('alerts.wifiConnected', { ip: device.ip })); }, 200);
      return () => clearTimeout(t2);
    }
    if (device.wifiStatus === 'no_ssid') {
      notifiedRef.current = true;
      const t2 = setTimeout(() => { setConnectingWifi(false); alert(t('common.error'), t('alerts.wifiNotFound')); }, 200);
      return () => clearTimeout(t2);
    }
    if (device.wifiStatus === 'auth_failed') {
      notifiedRef.current = true;
      const t2 = setTimeout(() => { setConnectingWifi(false); alert(t('common.error'), t('alerts.wifiWrongPassword')); }, 200);
      return () => clearTimeout(t2);
    }
  }, [device.wifiStatus, device.ip, connectingWifi, t]);

  useEffect(() => {
    if (!connectingWifi || notifiedRef.current) return;
    const timeout = setTimeout(() => {
      setConnectingWifi(false);
      if (!notifiedRef.current) alert(t('common.error'), t('alerts.wifiTimeout'));
    }, 25000);
    return () => clearTimeout(timeout);
  }, [connectingWifi, t]);

  const handleReboot = () => {
    alert(t('alerts.rebootTitle'), t('alerts.rebootMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('alerts.rebootConfirm'), style: 'destructive', onPress: () => sendCommand('reboot') },
    ]);
  };

  const handleReset = () => {
    alert(t('alerts.resetTitle'), t('alerts.resetMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('alerts.resetConfirm'), style: 'destructive', onPress: () => sendCommand('reset') },
    ]);
  };

  return (
    <AppShell>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: theme.colors.primary }]}>{t('settingsPage.title')}</Text>
          <Text style={[styles.pageSub, { color: theme.colors.textMuted }]}>{t('settingsPage.subtitle')}</Text>
        </View>

        <AccountSettingsSection />

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, ...theme.shadows.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{t('play.glassesSection')}</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              {(step === 'authenticating' || step === 'scanning') && (
                <Text style={[styles.statusLabel, { color: theme.colors.textMuted }]}>
                  {step === 'authenticating' ? t('settings.authenticating') : t('settings.scanning')}
                </Text>
              )}
              <Text style={[styles.statusName, { color: theme.colors.text }]}>{device.name}</Text>
              {device.ip ? <Text style={[styles.statusSub, { color: theme.colors.accent }]}>{t('statusModal.ip')}: {device.ip}</Text> : null}
              {device.wifiStatus !== 'idle' ? <Text style={[styles.statusSub, { color: device.wifiStatus === 'connected' ? theme.colors.success : theme.colors.warn }]}>{t('settings.wifi')}: {wifiStatusLabels[device.wifiStatus] || device.wifiStatus}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={[styles.badge, { color: theme.colors.textMuted }]}>{t('settings.firmwareVersion')}{device.firmware || t('common.notAvailable')}</Text>
              <Text style={[styles.badge, { color: theme.colors.textMuted }]}>{t('settings.sdStatus')}: {device.sd ? t('settings.ok') : t('common.notAvailable')}</Text>
            </View>
          </View>

          {device.wifiStatus && device.wifiStatus !== 'idle' && (
            <View style={[styles.errorBox, { backgroundColor: device.wifiStatus === 'connected' ? alpha(theme.colors.success, 0.2) : alpha(theme.colors.warn, 0.2), borderColor: device.wifiStatus === 'connected' ? alpha(theme.colors.success, 0.4) : alpha(theme.colors.warn, 0.4) }]}>
              <Text style={[styles.errorText, { color: device.wifiStatus === 'connected' ? theme.colors.success : theme.colors.warn }]}>
                {t('settings.wifi')}: {device.wifiStatus === 'connected' ? `${t('settings.wifiConnected')} (${device.ip})` : device.wifiStatus === 'no_ssid' ? t('settings.wifiNetworkNotFound') : device.wifiStatus === 'auth_failed' ? t('settings.wifiWrongPassword') : (wifiStatusLabels[device.wifiStatus] || device.wifiStatus)}
              </Text>
            </View>
          )}

          {error && (
            <Pressable
              onPress={clearError}
              style={[styles.errorBox, { backgroundColor: alpha(theme.colors.danger, 0.2), borderColor: alpha(theme.colors.danger, 0.4), flexDirection: 'row', alignItems: 'center', gap: 8 }]}
            >
              <Text style={[styles.errorText, { color: theme.colors.danger, flex: 1 }]}>{error}</Text>
              <Ionicons name="close" size={16} color={theme.colors.danger} />
            </Pressable>
          )}

          <View style={styles.sectionActions}>
            {device.connected ? (
              <Pressable onPress={disconnect} style={[styles.btnSmall, { backgroundColor: alpha(theme.colors.danger, 0.3) }]}>
                <Text style={[styles.btnSmallLabel, { color: theme.colors.danger }]}>{t('settings.disconnect')}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={startScan} disabled={scanning} style={[styles.btnSmall, { backgroundColor: theme.colors.accent, opacity: scanning ? 0.5 : 1 }]}>
                <Text style={[styles.btnSmallLabel, { color: theme.colors.onAccent }]}>{t('settings.scan')}</Text>
              </Pressable>
            )}
          </View>
        </View>

        {!device.connected && savedDevice ? (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.lastDevice')}</Text>
            <Text style={[styles.fieldDesc, { color: theme.colors.textMuted }]}>{savedDevice.name}</Text>
            <View style={styles.sectionActions}>
              <Pressable
                onPress={handleReconnect}
                disabled={connecting || authenticating}
                style={[styles.btnSmall, { backgroundColor: theme.colors.accent, opacity: connecting || authenticating ? 0.5 : 1 }]}
              >
                <Text style={[styles.btnSmallLabel, { color: theme.colors.onAccent }]}>
                  {connecting || authenticating ? t('settings.authenticating') : t('settings.reconnect')}
                </Text>
              </Pressable>
              <Pressable onPress={handleForgetDevice} style={[styles.btnSmall, { backgroundColor: alpha(theme.colors.textMuted, 0.15) }]}>
                <Text style={[styles.btnSmallLabel, { color: theme.colors.textMuted }]}>{t('settings.forgetDevice')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {devices.length > 0 && !device.connected && (
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.foundDevices')}</Text>
            {devices.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => connectAndAuth(d.id, secretKey, d.name || undefined)}
                disabled={connecting || authenticating}
                style={[styles.deviceItem, { borderColor: theme.colors.border, opacity: (connecting || authenticating) ? 0.6 : 1 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deviceName, { color: theme.colors.text }]}>{d.name || t('settings.unknown')}</Text>
                  <Text style={[styles.deviceMeta, { color: theme.colors.textMuted }]}>{t('settings.rssi')}: {d.rssi} {t('statusModal.dbm')}</Text>
                </View>
                {(connecting || authenticating) ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <Ionicons name="radio-outline" size={18} color={theme.colors.accent} />
                )}
              </Pressable>
            ))}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, ...theme.shadows.card }]}>
          <Pressable onPress={() => setShowTrial((v) => !v)} style={styles.collapseHead}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: theme.colors.primary, marginBottom: 0 }]}>{t('play.trialDevice')}</Text>
              {device.iotLinked ? (
                <Text style={[styles.statusSub, { color: theme.colors.success }]}>{t('play.trialLinked')}</Text>
              ) : null}
            </View>
            <Ionicons name={showTrial ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
          </Pressable>
          {showTrial ? (
            <>
              <Text style={[styles.pageSub, { color: theme.colors.textMuted }]}>{t('play.trialHint')}</Text>
              <TextInput
                value={botUrl}
                onChangeText={setBotUrl}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="http://192.168.0.32:8040"
                placeholderTextColor={theme.colors.muted}
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
              />
              <View style={styles.sectionActions}>
                {device.iotLinked ? (
                  <Pressable
                    onPress={() => DeviceBridge.getShared().unlinkBot()}
                    style={[styles.btnSmall, { backgroundColor: alpha(theme.colors.danger, 0.3) }]}
                  >
                    <Text style={[styles.btnSmallLabel, { color: theme.colors.danger }]}>{t('play.trialDisconnect')}</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={async () => {
                      setBotBusy(true);
                      try {
                        await DeviceBridge.getShared().linkBot(botUrl);
                      } catch {
                        alert(t('common.error'), t('play.trialFailed'));
                      } finally {
                        setBotBusy(false);
                      }
                    }}
                    style={[styles.btnSmall, { backgroundColor: theme.colors.primary }]}
                  >
                    <Text style={[styles.btnSmallLabel, { color: theme.colors.onPrimary }]}>
                      {botBusy ? t('common.saving') : t('play.trialConnect')}
                    </Text>
                  </Pressable>
                )}
              </View>
            </>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Pressable onPress={() => setShowAdvanced((v) => !v)} style={styles.collapseHead}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0, flex: 1 }]}>{t('play.advancedSettings')}</Text>
            <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
          </Pressable>
        </View>

        {showAdvanced ? (
          <>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <SectionTitle title={t('settings.bleSecretKey')} theme={theme} />
          <Text style={[styles.fieldDesc, { color: theme.colors.textMuted }]}>{t('settings.defaultKey')}</Text>
          <TextInput
            value={secretKey}
            onChangeText={setSecretKey}
            placeholder={t('settings.enterSecretKey')}
            placeholderTextColor={theme.colors.textMuted}
            style={[styles.input, { color: theme.colors.accent, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceElevated }]}
          />
        </View>

        {device.connected && (
          <>

            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <SectionTitle title={t('settings.deviceSettings')} theme={theme} />
              <Text style={[styles.fieldDesc, { color: theme.colors.textMuted }]}>{t('settings.deviceSettingsHint')}</Text>

              <Text style={[styles.controlLabel, { color: theme.colors.text }]}>{t('settings.cameraResolution')}</Text>
              <View style={styles.presetRow}>
                {FRAME_PRESETS.map((p) => {
                  const active = framesize === p.framesize;
                  const label =
                    p.id === 'low' ? t('settings.resolutionLow') : p.id === 'medium' ? t('settings.resolutionMedium') : t('settings.resolutionHigh');
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setFramesize(p.framesize)}
                      style={[
                        styles.presetBtn,
                        {
                          backgroundColor: active ? theme.colors.accent : theme.colors.surfaceElevated,
                          borderColor: active ? theme.colors.accent : theme.colors.borderStrong,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? theme.colors.onAccent : theme.colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.controlLabel, { color: theme.colors.text }]}>{t('settings.cameraQuality')}</Text>
              <View style={styles.presetRow}>
                {QUALITY_PRESETS.map((p) => {
                  const active = cameraQuality === p.quality;
                  const label =
                    p.id === 'low' ? t('settings.qualityLow') : p.id === 'medium' ? t('settings.qualityMedium') : t('settings.qualityHigh');
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => setCameraQuality(p.quality)}
                      style={[
                        styles.presetBtn,
                        {
                          backgroundColor: active ? theme.colors.accent : theme.colors.surfaceElevated,
                          borderColor: active ? theme.colors.accent : theme.colors.borderStrong,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? theme.colors.onAccent : theme.colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.controlLabel, { color: theme.colors.text }]}>{t('settings.volume')}</Text>
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => setVolume((v) => Math.max(0, v - 5))}
                  style={[styles.stepperBtn, { borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceElevated }]}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '600' }}>−</Text>
                </Pressable>
                <Text style={[styles.stepperValue, { color: theme.colors.text }]}>{volume}%</Text>
                <Pressable
                  onPress={() => setVolume((v) => Math.min(100, v + 5))}
                  style={[styles.stepperBtn, { borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceElevated }]}
                >
                  <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '600' }}>+</Text>
                </Pressable>
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.controlLabel, { color: theme.colors.text, marginBottom: 0 }]}>{t('settings.wakeword')}</Text>
                <SoftSwitch
                  value={wakeEnabled}
                  onValueChange={setWakeEnabled}
                  onColor={alpha(theme.colors.accent, 0.9)}
                  offColor={theme.colors.surface4}
                />
              </View>
              {wakeEnabled ? (
                <>
                  <Text style={[styles.fieldDesc, { color: theme.colors.textMuted }]}>{t('settings.wakewordPhrase')}</Text>
                  <TextInput
                    value={wakePhrase}
                    onChangeText={setWakePhrase}
                    placeholderTextColor={theme.colors.textMuted}
                    style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceElevated }]}
                  />
                </>
              ) : null}

              <Pressable
                onPress={handleSaveDeviceSettings}
                disabled={savingDevice}
                style={[styles.saveFullBtn, { backgroundColor: savingDevice ? theme.colors.borderStrong : theme.colors.accent, flexDirection: 'row', gap: 8 }]}
              >
                {savingDevice ? <ActivityIndicator size="small" color={theme.colors.textMuted} /> : null}
                <Text style={{ color: savingDevice ? theme.colors.textMuted : theme.colors.onAccent, fontWeight: '700', fontSize: 15 }}>
                  {savingDevice ? t('settings.savingDevice') : t('settings.saveDeviceSettings')}
                </Text>
              </Pressable>
            </View>

            {/* WiFi */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <SectionTitle title={t('settings.wifiSection')} theme={theme} />

              {device.wifiStatus === 'connected' && !showWifiForm ? (
                <>
                  <View style={[styles.connectedBox, { backgroundColor: alpha(theme.colors.success, 0.15), borderColor: alpha(theme.colors.success, 0.4) }]}>
                    <Ionicons name="wifi" size={22} color={theme.colors.success} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.success }}>{t('settings.wifiConnected')}</Text>
                      <Text style={{ fontSize: 13, color: theme.colors.text }}>{device.wifiSsid}</Text>
                      {device.ip ? <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>IP: {device.ip}</Text> : null}
                    </View>
                  </View>
                  <Pressable onPress={() => setShowWifiForm(true)} style={[styles.btnSmall, { backgroundColor: theme.colors.accent, alignSelf: 'flex-start' }]}>
                    <Text style={[styles.btnSmallLabel, { color: theme.colors.onAccent }]}>{t('settings.changeWifi')}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  {(config?.wifi?.ssid || device.wifiSsid || wifiSSID) ? (
                    <>
                      <Text style={[styles.fieldDesc, { color: theme.colors.textMuted }]}>
                        {t('settings.currentWifi')}: {config?.wifi?.ssid || device.wifiSsid || wifiSSID}
                      </Text>
                      <Pressable
                        onPress={handleReconnectWifi}
                        disabled={connectingWifi}
                        style={[
                          styles.saveFullBtn,
                          {
                            backgroundColor: connectingWifi ? theme.colors.borderStrong : theme.colors.accent,
                            flexDirection: 'row',
                            gap: 8,
                            marginBottom: 4,
                          },
                        ]}
                      >
                        {connectingWifi ? <ActivityIndicator size="small" color={theme.colors.textMuted} /> : <Ionicons name="refresh" size={18} color={theme.colors.onAccent} />}
                        <Text style={{ color: connectingWifi ? theme.colors.textMuted : theme.colors.onAccent, fontWeight: '700', fontSize: 15 }}>
                          {connectingWifi ? t('settings.connectingWifi') : t('settings.reconnectWifi')}
                        </Text>
                      </Pressable>
                    </>
                  ) : null}

                  <View style={styles.sectionActions}>
                    <Pressable
                      onPress={() => scanWifi()}
                      disabled={wifiScanning}
                      style={[styles.btnWifiScan, { backgroundColor: wifiScanning ? theme.colors.borderStrong : alpha(theme.colors.accent, 0.2), borderColor: alpha(theme.colors.accent, 0.4) }]}
                    >
                      <Ionicons name="wifi-outline" size={18} color={theme.colors.accent} />
                      <Text style={[styles.btnWifiScanLabel, { color: theme.colors.accent }]}>
                        {t('settings.scanWifi')}
                      </Text>
                      {wifiScanning && <ActivityIndicator size="small" color={theme.colors.accent} />}
                    </Pressable>
                  </View>

                  {wifiNetworks.length > 0 && (
                    <View style={styles.wifiList}>
                      {wifiNetworks
                        .filter((ap, i, arr) => i === arr.findIndex((a) => a.ssid === ap.ssid))
                        .sort((a, b) => b.rssi - a.rssi)
                        .map((ap, i) => {
                          const selected = wifiSSID === ap.ssid;
                          return (
                            <Pressable
                              key={`${ap.ssid}-${i}`}
                              onPress={() => handleSelectNetwork(ap.ssid)}
                              style={[
                                styles.wifiCard,
                                {
                                  backgroundColor: selected ? alpha(theme.colors.accent, 0.15) : alpha(theme.colors.textMuted, 0.08),
                                  borderColor: selected ? alpha(theme.colors.accent, 0.5) : theme.colors.border,
                                },
                              ]}
                            >
                              <Ionicons name={ap.enc === 0 ? 'wifi-outline' : 'lock-closed-outline'} size={20} color={selected ? theme.colors.accent : theme.colors.textMuted} />
                              <View style={styles.wifiCardInfo}>
                                <Text style={[styles.wifiCardName, { color: selected ? theme.colors.accent : theme.colors.text }]}>{ap.ssid}</Text>
                                <Text style={[styles.wifiCardMeta, { color: theme.colors.textMuted }]}>{ap.rssi} {t('statusModal.dbm')}</Text>
                              </View>
                              {selected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />}
                              {ap.enc === 0 && <Text style={[styles.wifiBadge, { color: theme.colors.success }]}>{t('settings.open')}</Text>}
                            </Pressable>
                          );
                        })}
                    </View>
                  )}

                  {wifiNetworks.length === 0 && !wifiScanning && (
                    <Text style={[styles.fieldDesc, { color: theme.colors.textMuted }]}>{t('settings.noNetworks')}</Text>
                  )}

                  <Pressable onPress={() => setShowManualSSID(!showManualSSID)} style={styles.manualToggle}>
                    <Ionicons name={showManualSSID ? 'chevron-up-outline' : 'chevron-down-outline'} size={14} color={theme.colors.textMuted} />
                    <Text style={[styles.manualToggleText, { color: theme.colors.textMuted }]}>
                      {showManualSSID ? t('settings.hideManual') : t('settings.enterSsidManual')}
                    </Text>
                  </Pressable>

                  {showManualSSID && (
                    <TextInput
                      value={wifiSSID}
                      onChangeText={setWifiSSID}
                      placeholder={t('settings.wifiSsidPlaceholder')}
                      placeholderTextColor={theme.colors.textMuted}
                      style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceElevated }]}
                    />
                  )}

                  <View style={styles.passRow}>
                    <TextInput
                      value={wifiPass}
                      onChangeText={setWifiPass}
                      placeholder={t('settings.passwordPlaceholder')}
                      secureTextEntry={!showWifiPass}
                      placeholderTextColor={theme.colors.textMuted}
                      style={[styles.input, { flex: 1, color: theme.colors.text, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceElevated }]}
                    />
                    <Pressable onPress={() => setShowWifiPass(!showWifiPass)} style={{ padding: 8 }}>
                      <Ionicons name={showWifiPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textMuted} />
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={handleSaveConnectWifi}
                    disabled={!wifiSSID || savingWifi || connectingWifi}
                    style={[styles.btnWifiScan, { backgroundColor: (!wifiSSID || savingWifi || connectingWifi) ? theme.colors.borderStrong : theme.colors.accent, borderColor: theme.colors.accent, flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'center', gap: 8 }]}
                  >
                    {(savingWifi || connectingWifi) ? (
                      <ActivityIndicator size="small" color={savingWifi ? theme.colors.onAccent : theme.colors.success} />
                    ) : (
                      <Ionicons name="wifi-outline" size={18} color={theme.colors.onAccent} />
                    )}
                    <Text style={[styles.btnWifiScanLabel, { color: (!wifiSSID || savingWifi || connectingWifi) ? theme.colors.textMuted : theme.colors.onAccent }]}>
                      {connectingWifi ? t('settings.connecting') : savingWifi ? t('settings.savingWifi') : t('settings.saveConnectWifi')}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* Server */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <SectionTitle title={t('settings.serverConfig')} theme={theme} />
              {config?.server?.url ? (
                <Text style={[styles.fieldDesc, { color: theme.colors.textMuted }]}>{t('settings.serverConfig')}: {config.server.url}</Text>
              ) : null}
              {config?.server?.app_url ? (
                <Text style={[styles.fieldDesc, { color: theme.colors.textMuted }]}>App: {config.server.app_url}</Text>
              ) : null}

              <View style={styles.fieldGroup}>
                <TextInput
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder={t('settings.serverUrlPlaceholder')}
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceElevated }]}
                />
                <TextInput
                  value={serverToken}
                  onChangeText={setServerToken}
                  placeholder={t('settings.bearerToken')}
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceElevated }]}
                />
                <TextInput
                  value={appUrl}
                  onChangeText={setAppUrl}
                  placeholder={t('settings.appUrlPlaceholder')}
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceElevated }]}
                />
              </View>

              <Pressable
                onPress={handleSaveServer}
                disabled={savingServer}
                style={[styles.btnSmall, { backgroundColor: savingServer ? theme.colors.borderStrong : theme.colors.accent, flexDirection: 'row', gap: 6 }]}
              >
                {savingServer && <ActivityIndicator size="small" color={theme.colors.onAccent} />}
                <Text style={[styles.btnSmallLabel, { color: savingServer ? theme.colors.textMuted : theme.colors.onAccent }]}>{savingServer ? t('settings.savingServer') : t('settings.saveServer')}</Text>
              </Pressable>
            </View>


            {/* Commands */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <SectionTitle title={t('settings.deviceCommands')} theme={theme} />
              <View style={styles.commandsGrid}>
                <Pressable onPress={handleReboot} style={[styles.cmdBtn, { backgroundColor: alpha(theme.colors.warn, 0.2), borderColor: alpha(theme.colors.warn, 0.3) }]}>
                  <Ionicons name="refresh-outline" size={24} color={theme.colors.warn} />
                  <Text style={[styles.cmdBtnLabel, { color: theme.colors.warn }]}>{t('settings.reboot')}</Text>
                </Pressable>
                <Pressable onPress={handleReset} style={[styles.cmdBtn, { backgroundColor: alpha(theme.colors.danger, 0.2), borderColor: alpha(theme.colors.danger, 0.3) }]}>
                  <Ionicons name="trash-outline" size={24} color={theme.colors.danger} />
                  <Text style={[styles.cmdBtnLabel, { color: theme.colors.danger }]}>{t('settings.reset')}</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
          </>
        ) : null}

        {/* Language */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.accent }]}>{t('common.language')}</Text>
          <View style={styles.langRow}>
            <Pressable
              onPress={() => i18n.changeLanguage('vi')}
              style={[styles.langOption, { backgroundColor: i18n.language === 'vi' ? alpha(theme.colors.accent, 0.2) : 'transparent', borderColor: i18n.language === 'vi' ? theme.colors.accent : theme.colors.borderStrong }]}
            >
              <Text style={[styles.langOptionText, { color: i18n.language === 'vi' ? theme.colors.accent : theme.colors.textMuted }]}>TIẾNG VIỆT</Text>
            </Pressable>
            <Pressable
              onPress={() => i18n.changeLanguage('en')}
              style={[styles.langOption, { backgroundColor: i18n.language === 'en' ? alpha(theme.colors.accent, 0.2) : 'transparent', borderColor: i18n.language === 'en' ? theme.colors.accent : theme.colors.borderStrong }]}
            >
              <Text style={[styles.langOptionText, { color: i18n.language === 'en' ? theme.colors.accent : theme.colors.textMuted }]}>ENGLISH</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={async () => {
            await stopDeviceHub().catch(() => {});
            await logout();
          }}
          style={[styles.logoutBtn, { borderColor: theme.colors.danger }]}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
          <Text style={[styles.logoutLabel, { color: theme.colors.danger }]}>{t('settings.logout')}</Text>
        </Pressable>
      </ScrollView>
      <AlertModal {...AlertModalProps} />
    </AppShell>
  );
}

function SectionTitle({ title, theme }: { title: string; theme: any }) {
  return <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: 0.4, color: theme.colors.text, marginBottom: 4 }}>{title}</Text>;
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 16 },
  pageHeader: { gap: 4, marginBottom: 4 },
  pageTitle: { fontSize: 24, fontWeight: '600' },
  pageSub: { fontSize: 14, lineHeight: 20 },
  card: { padding: 18, borderRadius: 24, borderWidth: 1, gap: 12 },
  collapseHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  statusInfo: { flex: 1, gap: 2 },
  statusLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  statusName: { fontSize: 16, fontWeight: '700' },
  statusSub: { fontSize: 12 },
  badge: { fontSize: 11 },
  errorBox: { padding: 12, borderRadius: 14, borderWidth: 1 },
  errorText: { fontSize: 12, fontWeight: '500' },
  sectionActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btnSmall: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, minHeight: 40, justifyContent: 'center' },
  btnSmallLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  sectionTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4 },
  deviceItem: { padding: 14, borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deviceName: { fontSize: 14, fontWeight: '600' },
  deviceMeta: { fontSize: 11, marginTop: 2 },
  fieldDesc: { fontSize: 12, marginBottom: 4 },
  fieldGroup: { gap: 12 },
  input: { height: 48, borderWidth: 1, borderRadius: 12, fontSize: 14, paddingHorizontal: 14 },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  btnWifiScan: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, minHeight: 44 },
  btnWifiScanLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  wifiList: { gap: 8 },
  wifiCard: { padding: 14, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  wifiCardInfo: { flex: 1, gap: 2 },
  wifiCardName: { fontSize: 15, fontWeight: '600' },
  wifiCardMeta: { fontSize: 11 },
  wifiBadge: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  manualToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  manualToggleText: { fontSize: 11, fontWeight: '600' },

  commandsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cmdBtn: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 8 },
  cmdBtnLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  connectedBox: { padding: 14, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 14, alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  controlLabel: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetBtn: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stepperBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontSize: 18, fontWeight: '700', minWidth: 64, textAlign: 'center' },
  saveFullBtn: { marginTop: 8, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  langRow: { flexDirection: 'row', gap: 10 },
  langOption: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  langOptionText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  logoutBtn: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  logoutLabel: { fontSize: 15, fontWeight: '700' },
});

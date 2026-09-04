import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAivaStore } from '@/features/aiva/aiva.store';
import { DEVICE_DEFAULTS } from '@/features/aiva/device.defaults';
import { loadSavedDevice, saveSavedDevice } from '@/features/aiva/services/device.storage';
import { devicesService } from '@/features/aiva/services/devices.service';
import { BLEService } from '@/services/ble/ble.service';
import type { AIVACommand, AIVAConfig, AIVADeviceStatus, BLEScanDevice, WifiAP } from '@/services/ble/ble.types';
import { DEFAULT_SECRET_KEY } from '@/services/ble/ble.types';
import { setApiBaseUrl } from '@/services/http/client';
import { startDeviceHub } from '@/services/signalr/deviceHub';

export function useBLEConnection(onAlert?: (title: string, message: string) => void) {
  const { updateDevice } = useAivaStore();
  const { t } = useTranslation();
  const serviceRef = useRef<BLEService | null>(null);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BLEScanDevice[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AIVAConfig | null>(null);
  const [wifiScanning, setWifiScanning] = useState(false);
  const [wifiNetworks, setWifiNetworks] = useState<WifiAP[]>([]);
  const [configLoading, setConfigLoading] = useState(false);

  useEffect(() => {
    const service = BLEService.getShared();
    serviceRef.current = service;

    service.onStatusUpdate((status: AIVADeviceStatus) => {
      updateDevice({
        wifiSsid: status.ssid,
        wifiStatus: status.wifi,
        firmware: status.fw,
        ip: status.ip,
        wifiRssi: status.rssi,
        sd: status.sd,
        mode: status.mode,
        heap: status.heap,
        playState: status.play ?? useAivaStore.getState().device.playState,
        battery: typeof status.battery === 'number' ? status.battery : useAivaStore.getState().device.battery,
      });
    });

    service.onDisconnected(() => {
      setConfig(null);
      setWifiNetworks([]);
      updateDevice({
        connected: false,
        wifiSsid: '',
        wifiRssi: 0,
        wifiStatus: 'idle',
        ip: '',
        firmware: '',
        sd: false,
        mode: 'deploy',
        heap: 0,
      });
      onAlert?.(t('alerts.disconnectTitle'), t('alerts.disconnectMessage'));
    });

    return () => {
      // Don't disconnect — other hooks may share the service
    };
  }, [updateDevice, onAlert, t]);

  const readConfig = useCallback(async (opts?: { silent?: boolean }) => {
    if (!serviceRef.current) return;
    const silent = opts?.silent !== false;
    if (!silent) setConfigLoading(true);
    try {
      // Soft read — device often returns empty while applying Wi‑Fi / config.
      const cfg = await serviceRef.current.tryReadConfig();
      if (cfg) {
        setConfig(cfg);
        return cfg;
      }
      // Don't sticky-banner a transient empty read; forms already have defaults.
      return undefined;
    } catch (e) {
      if (!silent) setError((e as Error).message);
      return undefined;
    } finally {
      if (!silent) setConfigLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const startScan = useCallback(async () => {
    if (!serviceRef.current) return;
    setScanning(true);
    setError(null);
    try {
      await serviceRef.current.requestPermissions();
      const found = await serviceRef.current.scanDevices(5000);
      setDevices(found);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScanning(false);
    }
  }, []);

  const connectAndAuth = useCallback(
    async (deviceId: string, secretKey: string = DEFAULT_SECRET_KEY, displayName?: string) => {
      if (!serviceRef.current) return;
      setConnecting(true);
      setAuthenticating(false);
      setError(null);
      try {
        await serviceRef.current.connect(deviceId);
        setAuthenticating(true);
        const authed = await serviceRef.current.authenticate(secretKey);
        if (!authed) {
          throw new Error(t('alerts.authFailed'));
        }
        const name = displayName || 'AIVA Device';
        updateDevice({
          connected: true,
          name,
          deviceId,
          serverKey: secretKey,
          appUrl: DEVICE_DEFAULTS.server.app_url,
          serverUrl: DEVICE_DEFAULTS.server.url,
        });

        let cloudDeviceId: string | undefined;
        try {
          const previous = await loadSavedDevice();
          cloudDeviceId = previous?.cloudDeviceId;
          const cloud = await devicesService.pair({
            name,
            macAddress: deviceId,
            serverKey: secretKey,
          });
          cloudDeviceId = cloud.id;
          updateDevice({ cloudDeviceId });
          void startDeviceHub(cloud.id).catch(() => {});
          void devicesService
            .updateStatus(cloud.id, {
              batteryLevel: useAivaStore.getState().device.battery || 0,
              signalStrength: (useAivaStore.getState().device.signal || 0) * 25,
              isConnected: true,
            })
            .catch(() => {});
        } catch {
          // Cloud pair is best-effort when logged in / API reachable.
        }

        await saveSavedDevice({ id: deviceId, name, secretKey, cloudDeviceId });
        setApiBaseUrl(DEVICE_DEFAULTS.server.app_url);

        // Push lab defaults so Settings forms stay filled / device is ready.
        // Wi‑Fi creds first, then explicit connect — writing alone may not reconnect.
        try {
          await serviceRef.current.writeConfig({
            wifi: {
              ssid: DEVICE_DEFAULTS.wifi.ssid,
              pass: DEVICE_DEFAULTS.wifi.pass,
            },
            server: {
              url: DEVICE_DEFAULTS.server.url,
              token: DEVICE_DEFAULTS.server.token,
              app_url: DEVICE_DEFAULTS.server.app_url,
            },
            camera: {
              framesize: DEVICE_DEFAULTS.camera.framesize,
              quality: DEVICE_DEFAULTS.camera.quality,
            },
            audio: {
              volume: DEVICE_DEFAULTS.audio.volume,
            },
          } as Partial<AIVAConfig>);
          await serviceRef.current.sendCommand('connect');
          await serviceRef.current.sendCommand('status');
        } catch {
          // Defaults are best-effort; UI can still edit manually.
        }

        serviceRef.current
          .waitForStatus(8000)
          .then(async (s) => {
            const nextName = `AIVA ${s.fw}`;
            updateDevice({
              name: nextName,
              wifiSsid: s.ssid,
              firmware: s.fw,
              mode: s.mode,
              ip: s.ip,
              sd: s.sd,
              wifiStatus: s.wifi,
              wifiRssi: s.rssi,
              heap: s.heap,
            });
            await saveSavedDevice({
              id: deviceId,
              name: nextName,
              secretKey,
              cloudDeviceId: useAivaStore.getState().device.cloudDeviceId || undefined,
            });
            // If still offline after first connect, nudge once more.
            if (s.wifi !== 'connected') {
              try {
                await serviceRef.current?.sendCommand('connect');
                await serviceRef.current?.sendCommand('status');
              } catch {
                // ignore
              }
            }
          })
          .catch(() => {});
        // Wait for Wi‑Fi/status settle, then soft-read config (never sticky-error).
        void (async () => {
          await new Promise((r) => setTimeout(r, 2500));
          const cfg = await readConfig({ silent: true });
          if (cfg?.server?.app_url) {
            setApiBaseUrl(cfg.server.app_url);
            updateDevice({ appUrl: cfg.server.app_url });
          } else {
            setApiBaseUrl(DEVICE_DEFAULTS.server.app_url);
            updateDevice({ appUrl: DEVICE_DEFAULTS.server.app_url });
          }
        })();
      } catch (e) {
        setError((e as Error).message);
        updateDevice({ connected: false });
      } finally {
        setConnecting(false);
        setAuthenticating(false);
      }
    },
    [updateDevice, readConfig, t],
  );

  const disconnect = useCallback(async () => {
    if (!serviceRef.current) return;
    await serviceRef.current.disconnect();
    setConfig(null);
    setWifiNetworks([]);
    updateDevice({ connected: false });
  }, [updateDevice]);

  const writeConfig = useCallback(async (partial: Partial<AIVAConfig>) => {
    if (!serviceRef.current) throw new Error('Not connected');
    await serviceRef.current.writeConfig(partial);
    // Soft refresh later — empty reads while firmware applies are normal.
    const service = serviceRef.current;
    void (async () => {
      await new Promise((r) => setTimeout(r, 1500));
      const cfg = await service.tryReadConfig(6);
      if (cfg) setConfig(cfg);
    })();
  }, []);

  const sendCommand = useCallback(async (command: AIVACommand) => {
    if (!serviceRef.current) throw new Error('Not connected');
    await serviceRef.current.sendCommand(command);
  }, []);

  const scanWifi = useCallback(async () => {
    if (!serviceRef.current) return;
    setWifiScanning(true);
    setError(null);
    try {
      const result = await serviceRef.current.scanWifi(10000);
      setWifiNetworks(result.aps);
      return result;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWifiScanning(false);
    }
  }, []);

  // Auto-dismiss sticky errors so they don't linger forever.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(t);
  }, [error]);

  return {
    scanning,
    devices,
    connecting,
    authenticating,
    error,
    config,
    configLoading,
    wifiScanning,
    wifiNetworks,
    startScan,
    connectAndAuth,
    disconnect,
    readConfig,
    writeConfig,
    sendCommand,
    scanWifi,
    clearError,
  };
}

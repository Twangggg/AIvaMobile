import { useCallback, useEffect, useRef, useState } from 'react';

import { BLEService } from '@/services/ble/ble.service';
import type { AIVAConfig, AIVADeviceStatus, WifiScanResult } from '@/services/ble/ble.types';
import { DEFAULT_SECRET_KEY } from '@/services/ble/ble.types';

export function useBLEStatus() {
  const serviceRef = useRef<BLEService | null>(null);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<AIVADeviceStatus | null>(null);
  const [config, setConfig] = useState<AIVAConfig | null>(null);
  const [wifiNetworks, setWifiNetworks] = useState<WifiScanResult | null>(null);

  const connect = useCallback(async (deviceId: string, secretKey: string = DEFAULT_SECRET_KEY) => {
    const service = new BLEService();
    serviceRef.current = service;

    await service.requestPermissions();
    await service.connect(deviceId);
    const authed = await service.authenticate(secretKey);
    if (!authed) throw new Error('Auth failed');

    const initial = await service.waitForStatus(5000);
    setStatus(initial);
    setConnected(true);

    service.onStatusUpdate((s) => setStatus(s));
    service.onWifiScanResult((r) => setWifiNetworks(r));
  }, []);

  const refreshConfig = useCallback(async () => {
    if (!serviceRef.current) return;
    const cfg = await serviceRef.current.readConfig();
    setConfig(cfg);
  }, []);

  const updateConfig = useCallback(async (partial: Partial<AIVAConfig>) => {
    if (!serviceRef.current) return;
    await serviceRef.current.writeConfig(partial);
  }, []);

  const sendCommand = useCallback(async (command: 'scan' | 'connect' | 'reboot' | 'reset' | 'status') => {
    if (!serviceRef.current) return;
    await serviceRef.current.sendCommand(command);
  }, []);

  const disconnect = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.disconnect();
      serviceRef.current.destroy();
      serviceRef.current = null;
    }
    setConnected(false);
    setStatus(null);
    setConfig(null);
    setWifiNetworks(null);
  }, []);

  useEffect(() => {
    return () => {
      disconnect().catch(() => {});
    };
  }, [disconnect]);

  return {
    connected,
    status,
    config,
    wifiNetworks,
    connect,
    refreshConfig,
    updateConfig,
    sendCommand,
    disconnect,
  };
}

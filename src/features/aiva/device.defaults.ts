import { DEFAULT_SECRET_KEY } from '@/services/ble/ble.types';

/**
 * Lab / local defaults — applied after BLE auth so you don't fill Settings by hand.
 * Update here when the network or PC IP changes.
 */
export const DEVICE_DEFAULTS = {
  secretKey: DEFAULT_SECRET_KEY,
  wifi: {
    ssid: 'Pi Kafe 1',
    pass: '79797979',
  },
  server: {
    url: 'http://127.0.0.1:8000/v1/assist',
    token: '',
    app_url: 'http://127.0.0.1:8080',
  },
  camera: {
    framesize: 8,
    quality: 12,
  },
  audio: {
    volume: 70,
  },
  iotBotUrl: 'http://127.0.0.1:8040',
} as const;

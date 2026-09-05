import { ENV } from '@/config/env';
import { DEFAULT_SECRET_KEY } from '@/services/ble/ble.types';

/**
 * Resolves the URL ESP should POST heartbeats to.
 * Must be reachable from the device (not 127.0.0.1 / localhost).
 */
function resolveDeviceAppUrl(): string {
  const dedicated = (process.env.EXPO_PUBLIC_DEVICE_APP_URL || '').trim().replace(/\/$/, '');
  if (dedicated) return dedicated;

  const api = ENV.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (api.includes('127.0.0.1') || api.includes('localhost')) {
    // Phone/PC loopback is unreachable from ESP — leave empty; app still reports IP to Supabase.
    return '';
  }
  return api;
}

function resolveAssistUrl(): string {
  const dedicated = (process.env.EXPO_PUBLIC_ASSIST_URL || '').trim();
  if (dedicated) return dedicated;
  // Lab assist default only when API is on LAN (not loopback).
  const api = ENV.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (api.includes('127.0.0.1') || api.includes('localhost')) return '';
  try {
    const u = new URL(api);
    return `${u.protocol}//${u.hostname}:8000/v1/assist`;
  } catch {
    return '';
  }
}

/**
 * Defaults pushed over BLE after auth.
 * Wi‑Fi SSID/pass stay empty in production builds — user picks network in the pair UI.
 * app_url is filled from env so ESP can heartbeat without the user typing URLs.
 */
export const DEVICE_DEFAULTS = {
  secretKey: DEFAULT_SECRET_KEY,
  wifi: {
    ssid: ENV.EXPO_PUBLIC_APP_ENV === 'development' ? 'Pi Kafe 1' : '',
    pass: ENV.EXPO_PUBLIC_APP_ENV === 'development' ? '79797979' : '',
  },
  server: {
    url: resolveAssistUrl(),
    token: '',
    /** AIva.Api or AIvaWeb `/api/devices/heartbeat` — must be LAN/public reachable from ESP. */
    app_url: resolveDeviceAppUrl(),
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

import { create } from 'zustand';

import i18n from '@/i18n';

import { DEVICE_DEFAULTS } from './device.defaults';
import type { QueryKind, QueryRecord, QuerySource } from './services/queries.service';

export type WiFiState = 'connected' | 'disconnected' | 'idle' | 'no_ssid' | 'auth_failed' | 'unknown';

export type DeviceState = {
  name: string;
  connected: boolean;
  battery: number;
  signal: 0 | 1 | 2 | 3 | 4;
  wifiSsid: string;
  wifiRssi: number;
  wifiStatus: WiFiState;
  serverKey: string;
  serverUrl: string;
  appUrl: string;
  deviceId: string;
  /** Backend Devices.Id (GUID) when paired to cloud. */
  cloudDeviceId: string;
  firmware: string;
  sd: boolean;
  mode: 'test' | 'deploy';
  ip: string;
  heap: number;
  iotBotUrl: string;
  iotLinked: boolean;
  playState: 'idle' | 'listening' | 'speaking' | 'capturing' | 'quiet';
  /** Device speaker volume 0–100 (synced from STATUS / config / UI). */
  volume: number;
};

export type ActivityKind = QueryKind;

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  context: string;
  source: QuerySource;
  at: number;
  status?: string;
  result?: string | null;
};

const defaultDevice: DeviceState = {
  name: i18n.t('store.defaultName'),
  connected: false,
  battery: 0,
  signal: 0,
  wifiSsid: '',
  wifiRssi: 0,
  wifiStatus: 'idle',
  serverKey: '',
  serverUrl: '',
  appUrl: '',
  deviceId: '',
  cloudDeviceId: '',
  firmware: '',
  sd: false,
  mode: 'deploy',
  ip: '',
  heap: 0,
  iotBotUrl: '',
  iotLinked: false,
  playState: 'idle',
  volume: DEVICE_DEFAULTS.audio.volume,
};

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return i18n.t('store.timeJustNow');
  if (mins < 60) return `${mins} ${i18n.t('store.timeMinutes')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${i18n.t('store.timeHours')}`;
  const days = Math.floor(hours / 24);
  if (days === 1) return i18n.t('store.timeYesterday');
  return `${days} ${i18n.t('store.timeDays')}`;
}

export function queryToActivity(q: QueryRecord): ActivityItem {
  return {
    id: q.id,
    kind: (q.kind as ActivityKind) || 'question',
    title: q.title,
    context: q.context || q.result?.slice(0, 120) || '',
    source: (q.source as QuerySource) || 'phone',
    at: new Date(q.createdAt).getTime(),
    status: q.status,
    result: q.result,
  };
}

type AivaStore = {
  device: DeviceState;
  activities: ActivityItem[];
  activitiesSyncedAt: number | null;
  updateDevice: (patch: Partial<DeviceState>) => void;
  addActivity: (item: Omit<ActivityItem, 'id' | 'at'> & { id?: string; at?: number }) => void;
  upsertActivityFromQuery: (item: ActivityItem) => void;
  setActivities: (items: ActivityItem[]) => void;
  clearActivities: () => void;
};

export const useAivaStore = create<AivaStore>((set) => ({
  device: defaultDevice,
  activities: [],
  activitiesSyncedAt: null,

  updateDevice: (patch) =>
    set((state) => ({ device: { ...state.device, ...patch } })),

  addActivity: (item) =>
    set((state) => ({
      activities: [
        {
          ...item,
          id: item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          at: item.at ?? Date.now(),
        },
        ...state.activities.filter((a) => a.id !== item.id),
      ].slice(0, 50),
    })),

  upsertActivityFromQuery: (item) =>
    set((state) => {
      const exists = state.activities.some((a) => a.id === item.id);
      return {
        activities: exists
          ? state.activities.map((a) => (a.id === item.id ? { ...a, ...item } : a))
          : [item, ...state.activities].slice(0, 50),
      };
    }),

  setActivities: (items) => set({ activities: items, activitiesSyncedAt: Date.now() }),

  clearActivities: () => set({ activities: [], activitiesSyncedAt: null }),
}));

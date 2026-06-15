import { create } from 'zustand';

export type DeviceState = {
  name: string;
  connected: boolean;
  battery: number;
  signal: 0 | 1 | 2 | 3 | 4;
  wifiSsid: string;
  serverKey: string;
  firmware: string;
};

export type ActivityKind = 'question' | 'lookup' | 'camera';

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  context: string;
  source: 'glass' | 'phone';
  at: number;
};

const defaultDevice: DeviceState = {
  name: 'AIva Glass Gen 1',
  connected: true,
  battery: 68,
  signal: 3,
  wifiSsid: 'Home_Alpha_5G',
  serverKey: 'AIVA-7F2K-9XQ1-LM34',
  firmware: '1.4.2',
};

const defaultActivity: ActivityItem[] = [
  { id: 'a1', kind: 'lookup', title: 'Đã tra cứu lò vi sóng', context: 'Tại Nhà', source: 'glass', at: Date.now() - 1000 * 60 * 42 },
  { id: 'a2', kind: 'question', title: 'Đã hỏi cách dùng máy ảnh', context: 'Studio', source: 'glass', at: Date.now() - 1000 * 60 * 60 * 22 },
  { id: 'a3', kind: 'camera', title: 'Chụp menu nhà hàng', context: 'Quán cà phê mới', source: 'phone', at: Date.now() - 1000 * 60 * 60 * 30 },
];

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hôm qua';
  return `${days} ngày trước`;
}

type AivaStore = {
  device: DeviceState;
  activities: ActivityItem[];
  updateDevice: (patch: Partial<DeviceState>) => void;
  addActivity: (item: Omit<ActivityItem, 'id' | 'at'>) => void;
  clearActivities: () => void;
};

export const useAivaStore = create<AivaStore>((set) => ({
  device: defaultDevice,
  activities: defaultActivity,

  updateDevice: (patch) =>
    set((state) => ({ device: { ...state.device, ...patch } })),

  addActivity: (item) =>
    set((state) => ({
      activities: [
        { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, at: Date.now() },
        ...state.activities,
      ].slice(0, 30),
    })),

  clearActivities: () => set({ activities: [] }),
}));

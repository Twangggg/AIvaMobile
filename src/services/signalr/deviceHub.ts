import { useAivaStore } from '@/features/aiva/aiva.store';
import { useAuthStore } from '@/features/auth/auth.store';
import { supabase } from '@/lib/supabase';

type RealtimeChannel = ReturnType<typeof supabase.channel>;

let channel: RealtimeChannel | null = null;
let joinedDeviceId: string | null = null;

function mapSignal(value?: number): 0 | 1 | 2 | 3 | 4 {
  if (value == null) return 0;
  if (value >= 80) return 4;
  if (value >= 60) return 3;
  if (value >= 40) return 2;
  if (value >= 20) return 1;
  return 0;
}

export async function startDeviceHub(deviceId?: string) {
  const token = useAuthStore.getState().tokens?.accessToken;
  if (!token) return;

  if (channel && joinedDeviceId === (deviceId ?? null)) return;

  await stopDeviceHub();

  const topic = deviceId ? `device:${deviceId}` : 'devices:mine';
  channel = supabase.channel(topic);

  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'devices',
      ...(deviceId ? { filter: `id=eq.${deviceId}` } : {}),
    },
    (payload) => {
      const row = payload.new as {
        battery_level?: number;
        signal_strength?: number;
        is_connected?: boolean;
      };
      useAivaStore.getState().updateDevice({
        battery: row.battery_level ?? useAivaStore.getState().device.battery,
        signal: mapSignal(row.signal_strength),
        connected: row.is_connected ?? useAivaStore.getState().device.connected,
      });
    },
  );

  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'queries',
      ...(deviceId ? { filter: `device_id=eq.${deviceId}` } : {}),
    },
    (payload) => {
      const row = payload.new as {
        id?: string;
        result?: string | null;
        status?: string;
        title?: string;
      } | null;
      if (!row?.id || row.status === 'processing' || row.status === 'pending') return;
      useAivaStore.getState().upsertActivityFromQuery({
        id: row.id,
        kind: 'question',
        title: row.title || 'Query completed',
        context: row.result?.slice(0, 120) ?? '',
        source: 'glass',
        at: Date.now(),
      });
    },
  );

  await channel.subscribe();
  joinedDeviceId = deviceId ?? null;
}

export async function stopDeviceHub() {
  if (channel) {
    await supabase.removeChannel(channel);
    channel = null;
  }
  joinedDeviceId = null;
}

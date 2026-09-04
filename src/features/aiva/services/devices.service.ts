import { supabase } from '@/lib/supabase';
import { ApiError } from '@/services/http/errors';

export type CloudDevice = {
  id: string;
  name: string;
  macAddress: string;
  firmwareVersion: string;
  batteryLevel: number;
  signalStrength: number;
  wifiSsid: string;
  isConnected: boolean;
  lastSeenAt: string;
  pairedAt: string;
};

type DeviceRow = {
  id: string;
  name: string;
  mac_address: string;
  firmware_version: string;
  battery_level: number;
  signal_strength: number;
  wifi_ssid: string;
  is_connected: boolean;
  last_seen_at: string;
  paired_at: string;
  server_key?: string;
};

function mapDevice(row: DeviceRow): CloudDevice {
  return {
    id: row.id,
    name: row.name,
    macAddress: row.mac_address,
    firmwareVersion: row.firmware_version,
    batteryLevel: row.battery_level,
    signalStrength: row.signal_strength,
    wifiSsid: row.wifi_ssid,
    isConnected: row.is_connected,
    lastSeenAt: row.last_seen_at,
    pairedAt: row.paired_at,
  };
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ApiError('Not authenticated', 401);
  return data.user.id;
}

export const devicesService = {
  async pair(payload: { name: string; macAddress: string; serverKey: string }) {
    const userId = await requireUserId();
    const { data: existing } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .eq('mac_address', payload.macAddress)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('devices')
        .update({
          name: payload.name,
          server_key: payload.serverKey,
          is_connected: true,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw new ApiError(error.message, 400);
      return mapDevice(data as DeviceRow);
    }

    const { data, error } = await supabase
      .from('devices')
      .insert({
        user_id: userId,
        name: payload.name,
        mac_address: payload.macAddress,
        server_key: payload.serverKey,
        is_connected: true,
        last_seen_at: new Date().toISOString(),
        paired_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw new ApiError(error.message, 400);
    return mapDevice(data as DeviceRow);
  },

  async list() {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .order('paired_at', { ascending: false });
    if (error) throw new ApiError(error.message, 400);
    return (data as DeviceRow[]).map(mapDevice);
  },

  async updateStatus(
    id: string,
    payload: { batteryLevel: number; signalStrength: number; isConnected: boolean },
  ) {
    const { data, error } = await supabase
      .from('devices')
      .update({
        battery_level: payload.batteryLevel,
        signal_strength: payload.signalStrength,
        is_connected: payload.isConnected,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new ApiError(error.message, 400);
    return mapDevice(data as DeviceRow);
  },

  async unpair(id: string) {
    const { error } = await supabase.from('devices').delete().eq('id', id);
    if (error) throw new ApiError(error.message, 400);
  },
};

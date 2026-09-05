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
  lanIp?: string;
  httpPort?: number;
  wsPort?: number;
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
  lan_ip?: string;
  http_port?: number;
  ws_port?: number;
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
    lanIp: row.lan_ip || '',
    httpPort: row.http_port ?? 8040,
    wsPort: row.ws_port ?? 8041,
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

  /**
   * Push LAN IP from BLE status so AIvaWeb can show Online without waiting for ESP→API heartbeat.
   */
  async reportPresence(payload: {
    serverKey: string;
    lanIp: string;
    httpPort?: number;
    wsPort?: number;
    fw?: string;
    wifiSsid?: string;
    battery?: number;
    mac?: string;
  }) {
    const lanIp = payload.lanIp.trim();
    const serverKey = payload.serverKey.trim();
    if (!lanIp || !serverKey) return null;

    const { data: rpcData, error: rpcError } = await supabase.rpc('device_heartbeat', {
      p_server_key: serverKey,
      p_lan_ip: lanIp,
      p_http_port: payload.httpPort ?? 8040,
      p_ws_port: payload.wsPort ?? 8041,
      p_fw: payload.fw ?? null,
      p_wifi_ssid: payload.wifiSsid ?? null,
      p_battery: payload.battery ?? null,
      p_mac: payload.mac ?? null,
    });

    if (!rpcError && rpcData && (rpcData as { ok?: boolean }).ok !== false) {
      return rpcData;
    }

    try {
      const userId = await requireUserId();
      const { error } = await supabase
        .from('devices')
        .update({
          lan_ip: lanIp,
          http_port: payload.httpPort ?? 8040,
          ws_port: payload.wsPort ?? 8041,
          firmware_version: payload.fw || undefined,
          wifi_ssid: payload.wifiSsid || undefined,
          battery_level: payload.battery,
          mac_address: payload.mac || undefined,
          is_connected: true,
          last_seen_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('server_key', serverKey);
      if (error) return null;
      return { ok: true, lan_ip: lanIp };
    } catch {
      return null;
    }
  },

  async unpair(id: string) {
    const { error } = await supabase.from('devices').delete().eq('id', id);
    if (error) throw new ApiError(error.message, 400);
  },
};

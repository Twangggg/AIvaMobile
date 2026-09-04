export const AIVA_SERVICE_UUID = '5f1d0000-1111-2222-3333-444455556666';

export const AIVA_CHARACTERISTICS = {
  STATUS: '5f1d0001-1111-2222-3333-444455556666',
  CONFIG: '5f1d0002-1111-2222-3333-444455556666',
  COMMAND: '5f1d0003-1111-2222-3333-444455556666',
  WIFISCAN: '5f1d0004-1111-2222-3333-444455556666',
  AUTH: '5f1d0005-1111-2222-3333-444455556666',
} as const;

export const DEFAULT_SECRET_KEY = 'AIVA-2024';
export const CONFIG_CHUNK_SIZE = 180;

export type AIVACommand =
  | 'scan'
  | 'connect'
  | 'reboot'
  | 'reset'
  | 'status'
  | 'assist_test'
  | 'quiet'
  | 'find'
  | 'heartbeat'
  | 'end_session';

export type AIVADeviceStatus = {
  fw: string;
  sd: boolean;
  wifi: 'connected' | 'disconnected' | 'idle' | 'no_ssid' | 'auth_failed' | 'unknown';
  ssid: string;
  ip: string;
  rssi: number;
  mode: 'test' | 'deploy';
  model: boolean;
  heap: number;
  play?: 'idle' | 'listening' | 'speaking' | 'capturing' | 'quiet';
  session_id?: string | null;
  battery?: number;
  volume?: number;
  camera_on?: boolean;
  wakeword_on?: boolean;
  last_spoken?: string;
  expect_labels?: string[];
  finding?: boolean;
  evt?: string;
  evt_id?: string;
  evt_payload?: Record<string, unknown>;
};

export type AIVAConfig = {
  version: number;
  device: {
    name: string;
    mode: 'test' | 'deploy';
  };
  wifi: {
    ssid: string;
    pass: string;
  };
  server: {
    url: string;
    token: string;
    app_url: string;
  };
  camera: {
    framesize: number;
    quality: number;
  };
  audio: {
    volume: number;
  };
  sd: {
    max_captures: number;
  };
  wakeword: {
    enabled: boolean;
    phrase: string;
    cutoff: number;
    sliding_window: number;
    cooldown_ms: number;
    rec_silence_rms: number;
    rec_silence_ms: number;
    rec_min_ms: number;
    rec_max_ms: number;
  };
  system: {
    model_path: string;
    capture_dir: string;
    secret_key: string;
    ack_pin: number;
    ack_beep_ms: number;
    debug_print_prob: number;
  };
  play?: {
    session_minutes: number;
    volume_max: number;
    camera_enabled: boolean;
    wakeword_on: boolean;
    persona: string;
    language: string;
    child_display_name: string;
    activity_id: string;
    activity_kind: string;
    beep_level: number;
  };
};

export type WifiAP = {
  ssid: string;
  rssi: number;
  enc: number;
};

export type WifiScanResult = {
  aps: WifiAP[];
};

export type AuthResult = {
  authed: boolean;
};

export type BLEScanDevice = {
  id: string;
  name: string | null;
  rssi: number;
};

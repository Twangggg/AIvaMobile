export type PlayKind = 'hunt' | 'cards' | 'quiz' | 'story';

export type DevicePlayState = 'idle' | 'listening' | 'speaking' | 'capturing' | 'quiet';

export type PersonaWire = 'robot' | 'bear' | 'mentor';

export type ChildDeviceProfile = {
  child_display_name: string;
  persona: PersonaWire;
  language: 'vi' | 'en';
  volume: number;
  volume_max: number;
  wakeword_on: boolean;
  camera_enabled: boolean;
  session_minutes: number;
  beep_level: number;
  activity_id: string;
  activity_kind: PlayKind | '';
};

export type DeviceCommand =
  | { cmd: 'start_session'; id: string; session_id: string; profile: ChildDeviceProfile }
  | { cmd: 'end_session'; id: string }
  | { cmd: 'speak'; id: string; text: string; interrupt?: boolean }
  | { cmd: 'announce'; id: string; text: string }
  | { cmd: 'set_volume'; id: string; volume: number }
  | { cmd: 'set_target'; id: string; labels: string[]; prompt?: string }
  | { cmd: 'capture'; id: string; expect_labels?: string[]; activity_kind?: PlayKind }
  | { cmd: 'quiet'; id: string }
  | { cmd: 'find'; id: string }
  | { cmd: 'heartbeat'; id: string };

export type DeviceEventName =
  | 'ack'
  | 'speak_done'
  | 'capture_done'
  | 'capture_match'
  | 'session_timeout'
  | 'button'
  | 'error';

export type DeviceEvent = {
  type: 'event';
  event: DeviceEventName;
  id: string;
  session_id?: string | null;
  payload?: {
    matched?: boolean;
    label?: string;
    button?: 'sos' | 'stop' | 'talk' | string;
    url?: string;
    message?: string;
    minutes?: number;
  };
};

export type DeviceStatusExt = {
  play?: DevicePlayState;
  session_id?: string | null;
  battery?: number;
  volume?: number;
  camera_on?: boolean;
  wakeword_on?: boolean;
  last_spoken?: string;
  expect_labels?: string[];
  finding?: boolean;
  evt?: DeviceEventName;
  evt_id?: string;
  evt_payload?: DeviceEvent['payload'];
};

export function newCmdId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

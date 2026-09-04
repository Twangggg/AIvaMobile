import * as SecureStore from 'expo-secure-store';

export type PersonaId = 'robot' | 'bear' | 'mentor';

export type SafetySettings = {
  dailyLimitMinutes: number;
  bedtime: boolean;
  bedtimeStart: string;
  bedtimeEnd: string;
  schoolMode: boolean;
  toxicBlock: boolean;
  ageVoice: boolean;
  safeSearch: boolean;
  persona: PersonaId;
  classroomMode: boolean;
  usageMinutesToday: number;
  usageDate: string;
};

const STORAGE_KEY = 'aiva_safety_settings';

export const DEFAULT_SAFETY: SafetySettings = {
  dailyLimitMinutes: 120,
  bedtime: true,
  bedtimeStart: '20:00',
  bedtimeEnd: '07:00',
  schoolMode: false,
  toxicBlock: true,
  ageVoice: true,
  safeSearch: true,
  persona: 'robot',
  classroomMode: false,
  usageMinutesToday: 0,
  usageDate: new Date().toISOString().slice(0, 10),
};

export async function loadSafetySettings(): Promise<SafetySettings> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return DEFAULT_SAFETY;
    const parsed = { ...DEFAULT_SAFETY, ...(JSON.parse(raw) as Partial<SafetySettings>) };
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.usageDate !== today) {
      parsed.usageDate = today;
      parsed.usageMinutesToday = 0;
    }
    return parsed;
  } catch {
    return DEFAULT_SAFETY;
  }
}

export async function saveSafetySettings(settings: SafetySettings): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
  void import('./preferences.sync').then((m) => m.pushPreferencesToCloud()).catch(() => {});
}

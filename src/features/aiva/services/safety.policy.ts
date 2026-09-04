import type { SafetySettings } from './safety.storage';
import { loadSafetySettings, saveSafetySettings } from './safety.storage';

export type SafetyBlockReason = 'bedtime' | 'school' | 'dailyLimit' | null;

export type SafetyGateResult = {
  allowed: boolean;
  reason: SafetyBlockReason;
  messageKey: string;
};

export async function evaluateSafetyGate(_action: 'ask' | 'capture' | 'voice'): Promise<SafetyGateResult> {
  return { allowed: true, reason: null, messageKey: '' };
}

export async function recordUsageMinutes(minutes: number): Promise<SafetySettings> {
  const settings = await loadSafetySettings();
  const today = new Date().toISOString().slice(0, 10);
  const next: SafetySettings = {
    ...settings,
    usageDate: today,
    usageMinutesToday:
      settings.usageDate === today ? settings.usageMinutesToday + Math.max(1, minutes) : Math.max(1, minutes),
  };
  await saveSafetySettings(next);
  return next;
}

export function personaToAgentMode(_persona: SafetySettings['persona']): 'child_companion' | 'vneid_guidance' {
  return 'child_companion';
}

import * as SecureStore from 'expo-secure-store';

import { BUILTIN_PACKS } from './play.packs';
import { DEFAULT_SCORE_RULES, type PlayPack, type ScoreRules } from './play.types';

const PACKS_KEY = 'aiva_play_packs_custom';
const RULES_KEY = 'aiva_play_rules';
const JAR_KEY = 'aiva_play_jar';

export type JarState = {
  date: string;
  stars: number;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function loadCustomPacks(): Promise<PlayPack[]> {
  try {
    const raw = await SecureStore.getItemAsync(PACKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlayPack[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCustomPacks(packs: PlayPack[]): Promise<void> {
  await SecureStore.setItemAsync(PACKS_KEY, JSON.stringify(packs));
}

export async function upsertCustomPack(pack: PlayPack): Promise<PlayPack[]> {
  const packs = await loadCustomPacks();
  const next = packs.some((p) => p.id === pack.id) ? packs.map((p) => (p.id === pack.id ? pack : p)) : [...packs, pack];
  await saveCustomPacks(next);
  return next;
}

export async function allPacks(): Promise<PlayPack[]> {
  const custom = await loadCustomPacks();
  const customIds = new Set(custom.map((p) => p.id));
  return [...custom, ...BUILTIN_PACKS.filter((p) => !customIds.has(p.id))];
}

export async function loadScoreRules(): Promise<ScoreRules> {
  try {
    const raw = await SecureStore.getItemAsync(RULES_KEY);
    if (!raw) return DEFAULT_SCORE_RULES;
    return { ...DEFAULT_SCORE_RULES, ...(JSON.parse(raw) as Partial<ScoreRules>) };
  } catch {
    return DEFAULT_SCORE_RULES;
  }
}

export async function saveScoreRules(rules: ScoreRules): Promise<void> {
  await SecureStore.setItemAsync(RULES_KEY, JSON.stringify(rules));
}

export async function loadJar(): Promise<JarState> {
  try {
    const raw = await SecureStore.getItemAsync(JAR_KEY);
    if (!raw) return { date: today(), stars: 0 };
    const parsed = JSON.parse(raw) as JarState;
    if (parsed.date !== today()) return { date: today(), stars: 0 };
    return parsed;
  } catch {
    return { date: today(), stars: 0 };
  }
}

export async function saveJar(jar: JarState): Promise<void> {
  await SecureStore.setItemAsync(JAR_KEY, JSON.stringify(jar));
}

export async function addJarStars(delta: number): Promise<JarState> {
  const jar = await loadJar();
  const next = { date: today(), stars: Math.max(0, jar.stars + delta) };
  await saveJar(next);
  return next;
}

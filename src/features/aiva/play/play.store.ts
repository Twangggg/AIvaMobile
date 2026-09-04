import { create } from 'zustand';

import { getActiveChild } from '@/features/aiva/services/children.storage';
import { loadSafetySettings } from '@/features/aiva/services/safety.storage';
import { synthesizeSpeech } from '@/features/aiva/services/tts.service';
import { useAuthStore } from '@/features/auth/auth.store';
import { roleFromTokens } from '@/features/auth/auth.types';
import { DeviceBridge } from '@/services/iot/device.bridge';
import { newCmdId } from '@/services/iot/protocol';

import { defaultPackFor } from './play.packs';
import { starsForCorrect } from './play.scoring';
import { addJarStars, loadJar, loadScoreRules } from './play.storage';
import {
  DEFAULT_TEAMS,
  type PlayPack,
  type ScoreRules,
  SOLO_TEAM,
  type TeamDef,
  type TeamId,
} from './play.types';

export type PlayMode = 'solo' | 'teams';

export type LiveState = {
  running: boolean;
  mode: PlayMode;
  pack: PlayPack;
  teams: TeamDef[];
  scores: Record<TeamId, number>;
  jarStars: number;
  rules: ScoreRules;
  index: number;
  storyNodeId: string;
  attempt: 1 | 2;
  promptAt: number;
  turnTeamId: TeamId;
  pendingMatch: boolean;
  sessionId: string;
  lastMessage: string;
  finished: boolean;
  winnerId: TeamId | null;
  phoneOnly: boolean;
};

function nextTeam(teams: TeamDef[], current: TeamId): TeamId {
  const i = teams.findIndex((t) => t.id === current);
  return teams[(i + 1) % Math.max(teams.length, 1)]?.id ?? teams[0]?.id ?? current;
}

export function currentPrompt(state: Pick<LiveState, 'pack' | 'index' | 'storyNodeId'>): string {
  const { pack } = state;
  if (pack.kind === 'quiz') return pack.quiz?.[state.index]?.prompt ?? '';
  if (pack.kind === 'story') {
    return pack.story?.find((n) => n.id === state.storyNodeId)?.text ?? '';
  }
  return pack.items?.[state.index]?.prompt ?? '';
}

export function currentHint(state: Pick<LiveState, 'pack' | 'index'>): string {
  if (state.pack.kind === 'quiz') {
    const q = state.pack.quiz?.[state.index];
    return q ? `Đáp án gợi ý: ${q.answers[q.correctIndex] ?? ''}` : '';
  }
  return state.pack.items?.[state.index]?.hint ?? '';
}

export function progressTotal(pack: PlayPack): number {
  if (pack.kind === 'quiz') return pack.quiz?.length ?? 0;
  if (pack.kind === 'story') return 0;
  return pack.items?.length ?? 0;
}

async function speakText(text: string, phoneOnly: boolean): Promise<void> {
  if (!text) return;
  const bridge = DeviceBridge.getShared();
  if (bridge.ready) {
    try {
      await bridge.speak(text);
      return;
    } catch {
      // fall through to phone TTS
    }
  }
  if (!phoneOnly && !bridge.ready) return;
  try {
    const audio = await synthesizeSpeech(text);
    if (!audio) return;
    const { createAudioPlayer } = await import('expo-audio');
    const player = createAudioPlayer(audio.uri);
    player.play();
  } catch {
    // teacher can read aloud
  }
}

async function pushPrompt(state: LiveState): Promise<string> {
  const text = currentPrompt(state);
  await speakText(text, state.phoneOnly);
  if ((state.pack.kind === 'hunt' || state.pack.kind === 'cards') && DeviceBridge.getShared().ready) {
    const item = state.pack.items?.[state.index];
    if (item) {
      try {
        await DeviceBridge.getShared().setTarget([item.label, ...item.aliases], item.prompt);
      } catch {
        // ignore
      }
    }
  }
  return text;
}

/** Soft device ops — never throw to UI for missing hardware mid-round. */
async function softDevice(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    // ignore
  }
}

type PlayStore = LiveState & {
  start: (opts: { mode: PlayMode; pack: PlayPack; teams?: TeamDef[]; phoneOnly?: boolean }) => Promise<void>;
  stop: (opts?: { sessionId?: string }) => Promise<void>;
  advance: () => Promise<void>;
  markCorrect: (teamId: TeamId, opts?: { quiet?: boolean }) => Promise<void>;
  markWrong: () => Promise<void>;
  chooseStory: (nextId: string) => Promise<void>;
  capture: () => Promise<void>;
  speakAgain: () => Promise<void>;
  onDeviceMatch: (matched: boolean) => Promise<void>;
  hydrateJar: () => Promise<void>;
  restart: () => Promise<void>;
};

const seedPack = defaultPackFor('hunt');

export const usePlayStore = create<PlayStore>((set, get) => ({
  running: false,
  mode: 'solo',
  pack: seedPack,
  teams: [SOLO_TEAM],
  scores: { [SOLO_TEAM.id]: 0 },
  jarStars: 0,
  rules: {
    speedBonus: true,
    speedWindowMs: 5000,
    roundGoal: 7,
    jarEnabled: true,
    jarGoal: 15,
  },
  index: 0,
  storyNodeId: 'start',
  attempt: 1,
  promptAt: 0,
  turnTeamId: SOLO_TEAM.id,
  pendingMatch: false,
  sessionId: '',
  lastMessage: '',
  finished: false,
  winnerId: null,
  phoneOnly: false,

  hydrateJar: async () => {
    const jar = await loadJar();
    const rules = await loadScoreRules();
    set({ jarStars: jar.stars, rules });
  },

  start: async ({ mode, pack, teams, phoneOnly }) => {
    const rules = await loadScoreRules();
    const jar = await loadJar();
    const list = mode === 'solo' ? [SOLO_TEAM] : teams?.length ? teams : DEFAULT_TEAMS;
    const scores: Record<TeamId, number> = {};
    for (const t of list) scores[t.id] = 0;
    const sessionId = newCmdId();
    const usePhoneOnly = Boolean(phoneOnly) || !DeviceBridge.getShared().ready;
    const isParent = roleFromTokens(useAuthStore.getState().tokens) === 'parent';
    const childName = isParent ? (await getActiveChild()).name : 'Lớp';
    const safety = await loadSafetySettings();

    if (!usePhoneOnly) {
      await softDevice(async () => {
        await DeviceBridge.getShared().send({
          cmd: 'start_session',
          id: newCmdId(),
          session_id: sessionId,
          profile: {
            child_display_name: childName,
            persona: isParent ? safety.persona : 'mentor',
            language: 'vi',
            volume: 55,
            volume_max: 70,
            wakeword_on: false,
            camera_enabled: pack.kind === 'hunt' || pack.kind === 'cards',
            session_minutes: 7,
            beep_level: 40,
            activity_id: pack.id,
            activity_kind: pack.kind,
          },
        });
      });
    }

    const live: LiveState = {
      running: true,
      mode,
      pack,
      teams: list,
      scores,
      jarStars: jar.stars,
      rules,
      index: 0,
      storyNodeId: pack.storyStartId || pack.story?.[0]?.id || 'start',
      attempt: 1,
      promptAt: Date.now(),
      turnTeamId: list[0].id,
      pendingMatch: false,
      sessionId,
      lastMessage: '',
      finished: false,
      winnerId: null,
      phoneOnly: usePhoneOnly,
    };
    set(live);
    const text = await pushPrompt(live);
    // Ignore stale completion if a newer session started.
    if (get().sessionId !== sessionId) return;
    set({ lastMessage: text, promptAt: Date.now() });
  },

  stop: async (opts) => {
    const current = get().sessionId;
    if (opts?.sessionId && opts.sessionId !== current) return;
    const sid = current;
    if (!get().phoneOnly && sid) {
      await softDevice(async () => {
        await DeviceBridge.getShared().send('end_session');
      });
    }
    // Only clear if still same session.
    if (get().sessionId !== sid) return;
    set({
      running: false,
      finished: true,
      pendingMatch: false,
      sessionId: '',
      lastMessage: '',
    });
  },

  restart: async () => {
    const s = get();
    await get().start({ mode: s.mode, pack: s.pack, teams: s.teams, phoneOnly: s.phoneOnly });
  },

  advance: async () => {
    const s = get();
    if (s.pack.kind === 'story') return;
    const total = progressTotal(s.pack);
    const nextIndex = s.index + 1;
    if (nextIndex >= total) {
      set({ finished: true, lastMessage: 'Hết bài.' });
      await softDevice(async () => {
        await DeviceBridge.getShared().announce('Hết bài rồi. Giỏi lắm!');
      });
      return;
    }
    const patch: Partial<LiveState> = {
      index: nextIndex,
      attempt: 1,
      pendingMatch: false,
      turnTeamId: nextTeam(s.teams, s.turnTeamId),
    };
    set(patch);
    const text = await pushPrompt({ ...get(), ...patch } as LiveState);
    if (get().sessionId !== s.sessionId) return;
    set({ lastMessage: text, promptAt: Date.now() });
  },

  markCorrect: async (teamId, opts) => {
    const s = get();
    if (!s.running || s.finished) return;
    const gained = starsForCorrect({
      attempt: s.attempt,
      elapsedMs: Date.now() - s.promptAt,
      rules: s.rules,
    });
    const scores = { ...s.scores, [teamId]: (s.scores[teamId] ?? 0) + gained };
    let jarStars = s.jarStars;
    if (s.rules.jarEnabled) {
      jarStars = (await addJarStars(gained)).stars;
    }
    const winner = Object.entries(scores).find(([, n]) => n >= s.rules.roundGoal)?.[0] ?? null;
    if (!opts?.quiet) {
      await softDevice(async () => {
        await DeviceBridge.getShared().announce('Đúng rồi!');
      });
    }
    set({ scores, jarStars, pendingMatch: false, lastMessage: `+${gained} ★` });
    if (winner) {
      set({ finished: true, winnerId: winner });
      await softDevice(async () => {
        await DeviceBridge.getShared().announce('Hết ván. Giỏi lắm!');
      });
      return;
    }
    if (s.pack.kind !== 'story') await get().advance();
  },

  markWrong: async () => {
    const s = get();
    if (!s.running || s.finished) return;
    if (s.attempt === 1) {
      const hint = currentHint(s);
      set({ attempt: 2, lastMessage: hint || 'Thử lại nhé.' });
      await speakText(hint ? `Thử lại. ${hint}` : 'Thử lại nhé.', s.phoneOnly);
      return;
    }
    await softDevice(async () => {
      await DeviceBridge.getShared().announce('Câu sau nhé.');
    });
    await get().advance();
  },

  chooseStory: async (nextId) => {
    const s = get();
    if (s.pack.kind !== 'story' || !s.running || s.finished) return;
    const node = s.pack.story?.find((n) => n.id === nextId);
    if (!node) return;
    // Quiet star award — no "Đúng rồi" every branch.
    await get().markCorrect(s.turnTeamId, { quiet: true });
    if (get().finished) {
      set({ storyNodeId: nextId, lastMessage: node.text });
      await speakText(node.text, get().phoneOnly);
      return;
    }
    set({
      storyNodeId: nextId,
      attempt: 1,
      promptAt: Date.now(),
      turnTeamId: nextTeam(s.teams, s.turnTeamId),
      lastMessage: node.text,
    });
    await speakText(node.text, get().phoneOnly);
    if (node.end) {
      set({ finished: true });
      await softDevice(async () => {
        await DeviceBridge.getShared().announce('Hết chuyện. Giỏi lắm!');
      });
    }
  },

  capture: async () => {
    const s = get();
    const item = s.pack.items?.[s.index];
    if (!item) return;
    if (!DeviceBridge.getShared().ready) {
      set({ lastMessage: 'Chưa gắn máy — hãy chấm Đúng/Sai tay.' });
      return;
    }
    await softDevice(async () => {
      await DeviceBridge.getShared().captureFor(s.pack.kind === 'cards' ? 'cards' : 'hunt', [
        item.label,
        ...item.aliases,
      ]);
    });
    set({ lastMessage: 'Đang nhìn…' });
  },

  speakAgain: async () => {
    const s = get();
    await speakText(currentPrompt(s), s.phoneOnly);
  },

  onDeviceMatch: async (matched) => {
    const s = get();
    if (!s.running || s.finished) return;
    if (!matched) {
      await get().markWrong();
      return;
    }
    if (s.mode === 'solo') {
      await get().markCorrect(s.teams[0].id);
      return;
    }
    set({ pendingMatch: true, lastMessage: 'Đội nào khớp?' });
  },
}));

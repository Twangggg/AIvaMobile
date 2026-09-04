import type { PlayKind } from '@/services/iot/protocol';

export type TeamId = string;

export type TeamDef = {
  id: TeamId;
  name: string;
  emoji: string;
};

export type HuntItem = {
  id: string;
  label: string;
  prompt: string;
  hint: string;
  aliases: string[];
};

export type QuizItem = {
  id: string;
  prompt: string;
  emoji: string;
  imageUri?: string;
  answers: string[];
  correctIndex: number;
};

export type StoryChoice = {
  label: string;
  nextId: string;
};

export type StoryNode = {
  id: string;
  text: string;
  choices: StoryChoice[];
  end?: boolean;
};

export type PlayPack = {
  id: string;
  kind: PlayKind;
  title: string;
  items?: HuntItem[];
  quiz?: QuizItem[];
  storyStartId?: string;
  story?: StoryNode[];
};

export type ScoreRules = {
  speedBonus: boolean;
  speedWindowMs: number;
  roundGoal: number;
  jarEnabled: boolean;
  jarGoal: number;
};

export const DEFAULT_TEAMS: TeamDef[] = [
  { id: 'fox', name: 'Cáo', emoji: '🦊' },
  { id: 'rabbit', name: 'Thỏ', emoji: '🐰' },
];

export const SOLO_TEAM: TeamDef = { id: 'solo', name: 'Bé', emoji: '⭐' };

export const DEFAULT_SCORE_RULES: ScoreRules = {
  speedBonus: true,
  speedWindowMs: 5000,
  roundGoal: 7,
  jarEnabled: true,
  jarGoal: 15,
};

export function labelsFor(item: HuntItem): string[] {
  return [item.label, ...item.aliases].map((s) => s.trim().toLowerCase()).filter(Boolean);
}

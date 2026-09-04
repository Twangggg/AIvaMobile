import type { ScoreRules } from './play.types';

export const SPEED_WINDOW_MS = 5000;

export function starsForCorrect(opts: {
  attempt: 1 | 2;
  elapsedMs: number;
  rules: ScoreRules;
}): number {
  if (opts.attempt !== 1 && opts.attempt !== 2) return 1;
  let stars = 1;
  if (opts.rules.speedBonus && opts.attempt === 1 && opts.elapsedMs <= opts.rules.speedWindowMs) {
    stars += 1;
  }
  return stars;
}

// Game rules shared (copied) with client/src/game/gameLogic.js.
// The server uses them to sanity-check results sent by the browser.
export const TOTAL_ROUNDS = 9; // 3 levels x 3 rounds
export const POINTS_PER_TARGET = 10;
export const BOMB_PENALTY = 5;
export const TIME_BONUS_PER_SEC = 2;

export function roundConfig(r) {
  const level = Math.floor(r / 3) + 1;
  const inLevel = r % 3;
  return {
    round: r + 1,
    level,
    targets: 4 + level * 2 + inLevel,
    bombs: level + inLevel,
    time: 32 - level * 3 - inLevel * 2,
    speed: +(0.6 + 0.25 * level + 0.1 * inLevel).toFixed(2),
  };
}

export const levelForRounds = (completed) =>
  Math.floor(Math.min(completed, TOTAL_ROUNDS - 1) / 3) + 1;

// Highest score reachable after `completed` finished rounds (+ an unfinished one).
export function maxScoreFor(completed) {
  let max = 0;
  for (let r = 0; r < Math.min(completed, TOTAL_ROUNDS); r++) {
    const c = roundConfig(r);
    max += c.targets * POINTS_PER_TARGET + c.time * TIME_BONUS_PER_SEC;
  }
  if (completed < TOTAL_ROUNDS) max += (roundConfig(completed).targets - 1) * POINTS_PER_TARGET;
  return max;
}

export function minHitsFor(completed) {
  let n = 0;
  for (let r = 0; r < Math.min(completed, TOTAL_ROUNDS); r++) n += roundConfig(r).targets;
  return n;
}

export function maxHitsFor(completed) {
  if (completed >= TOTAL_ROUNDS) return minHitsFor(TOTAL_ROUNDS);
  return minHitsFor(completed) + roundConfig(completed).targets - 1;
}

// Pure game-state logic (no React, no Three.js) so it is easy to test.
// The rules below are mirrored on the server in server/src/gameRules.js.
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

export const levelForRounds = (completed) => Math.floor(Math.min(completed, TOTAL_ROUNDS - 1) / 3) + 1;

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// roundKey only ever increases: the Three.js scene spawns new objects whenever it changes
export const initialState = (roundKey = 0) => ({
  status: 'ready', // ready | playing | paused | roundComplete | gameOver | results
  sessionId: newId(),
  round: 0,
  roundKey,
  collected: 0,
  timeLeft: roundConfig(0).time,
  score: 0,
  hits: 0,
  bombHits: 0,
  misses: 0,
  roundsCompleted: 0,
  elapsed: 0,
  lastBonus: 0,
  won: false,
});

export function gameReducer(state, action) {
  const playing = state.status === 'playing';
  switch (action.type) {
    case 'START':
      if (state.status !== 'ready') return state;
      return { ...state, status: 'playing', round: 0, roundKey: state.roundKey + 1, collected: 0, timeLeft: roundConfig(0).time };

    case 'HIT': {
      if (!playing) return state;
      const cfg = roundConfig(state.round);
      const hits = state.hits + 1;
      const collected = state.collected + 1;
      let score = state.score + POINTS_PER_TARGET;
      if (collected < cfg.targets) return { ...state, hits, collected, score };
      const lastBonus = state.timeLeft * TIME_BONUS_PER_SEC;
      score += lastBonus;
      const roundsCompleted = state.roundsCompleted + 1;
      const won = roundsCompleted >= TOTAL_ROUNDS;
      return { ...state, hits, collected, score, lastBonus, roundsCompleted, won, status: won ? 'gameOver' : 'roundComplete' };
    }

    case 'BOMB':
      if (!playing) return state;
      return { ...state, bombHits: state.bombHits + 1, score: Math.max(0, state.score - BOMB_PENALTY) };

    case 'MISS':
      return playing ? { ...state, misses: state.misses + 1 } : state;

    case 'TICK': {
      if (!playing) return state;
      const timeLeft = state.timeLeft - 1;
      const elapsed = state.elapsed + 1;
      return timeLeft <= 0
        ? { ...state, timeLeft: 0, elapsed, status: 'gameOver', won: false }
        : { ...state, timeLeft, elapsed };
    }

    case 'PAUSE': return playing ? { ...state, status: 'paused' } : state;
    case 'RESUME': return state.status === 'paused' ? { ...state, status: 'playing' } : state;

    case 'NEXT_ROUND': {
      if (state.status !== 'roundComplete') return state;
      const round = state.round + 1;
      return { ...state, status: 'playing', round, roundKey: state.roundKey + 1, collected: 0, timeLeft: roundConfig(round).time };
    }

    case 'SHOW_RESULTS': return state.status === 'gameOver' ? { ...state, status: 'results' } : state;
    case 'RESET': return initialState(state.roundKey);
    default: return state;
  }
}

export const accuracy = (s) => {
  const total = s.hits + s.bombHits + s.misses;
  return total ? Math.round((s.hits / total) * 100) : 0;
};

// Payload sent to the backend (also what the dashboard stores)
export const toResult = (s) => ({
  clientSessionId: s.sessionId,
  score: s.score,
  roundsCompleted: s.roundsCompleted,
  levelReached: levelForRounds(s.roundsCompleted),
  hits: s.hits,
  bombHits: s.bombHits,
  durationSec: s.elapsed,
});

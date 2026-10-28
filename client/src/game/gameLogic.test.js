import test from 'node:test';
import assert from 'node:assert/strict';
import { gameReducer as red, initialState, roundConfig, toResult, accuracy, TOTAL_ROUNDS } from './gameLogic.js';

const run = (s, ...types) => types.reduce((st, t) => red(st, { type: t }), s);
const clearRound = (s) => { for (let i = roundConfig(s.round).targets; i > 0; i--) s = red(s, { type: 'HIT' }); return s; };

test('starts in ready; HIT/TICK are ignored before start', () => {
  const s = initialState();
  assert.equal(run(s, 'HIT', 'TICK', 'BOMB').score, 0);
  assert.equal(run(s, 'HIT', 'TICK'), s);
});
test('START -> playing; second START is ignored', () => {
  const s = run(initialState(), 'START');
  assert.equal(s.status, 'playing');
  assert.equal(red(s, { type: 'START' }), s);
});
test('HIT scores 10, BOMB subtracts 5 but never below 0', () => {
  let s = run(initialState(), 'START', 'HIT');
  assert.equal(s.score, 10);
  s = run(s, 'BOMB', 'BOMB', 'BOMB');
  assert.equal(s.score, 0);
  assert.equal(s.bombHits, 3);
});
test('clearing a round gives a time bonus and goes to roundComplete', () => {
  let s = run(initialState(), 'START');
  const cfg = roundConfig(0);
  s = clearRound(s);
  assert.equal(s.status, 'roundComplete');
  assert.equal(s.score, cfg.targets * 10 + cfg.time * 2);
  assert.equal(s.roundsCompleted, 1);
  assert.equal(run(s, 'HIT').score, s.score); // no scoring after round end
});
test('NEXT_ROUND increases difficulty and bumps roundKey', () => {
  let s = clearRound(run(initialState(), 'START'));
  const key = s.roundKey;
  s = run(s, 'NEXT_ROUND');
  assert.equal(s.round, 1);
  assert.ok(s.roundKey > key);
  assert.equal(s.timeLeft, roundConfig(1).time);
});
test('timer expiry ends the game; no scoring afterwards', () => {
  let s = run(initialState(), 'START');
  for (let i = 0; i < roundConfig(0).time; i++) s = run(s, 'TICK');
  assert.equal(s.status, 'gameOver');
  assert.equal(s.won, false);
  assert.equal(run(s, 'HIT', 'TICK').score, s.score);
});
test('pause stops the timer, resume continues', () => {
  let s = run(initialState(), 'START', 'PAUSE');
  assert.equal(run(s, 'TICK', 'HIT').timeLeft, s.timeLeft);
  assert.equal(run(s, 'RESUME').status, 'playing');
});
test('full game: 9 rounds -> won -> results, result payload matches the rules', () => {
  let s = run(initialState(), 'START');
  for (let r = 0; r < TOTAL_ROUNDS; r++) { s = clearRound(s); if (r < TOTAL_ROUNDS - 1) s = run(s, 'NEXT_ROUND'); }
  assert.equal(s.status, 'gameOver'); assert.equal(s.won, true);
  s = run(s, 'SHOW_RESULTS');
  assert.equal(s.status, 'results');
  const r = toResult(s);
  assert.equal(r.roundsCompleted, 9); assert.equal(r.levelReached, 3);
});
test('RESET gives a clean session with a new id, keeps roundKey increasing', () => {
  const a = run(initialState(), 'START', 'HIT', 'MISS');
  const b = red(a, { type: 'RESET' });
  assert.equal(b.score, 0); assert.equal(b.hits, 0); assert.equal(b.status, 'ready');
  assert.notEqual(b.sessionId, a.sessionId);
  assert.equal(b.roundKey, a.roundKey);
});
test('accuracy counts hits vs bombs and misses', () => {
  let s = run(initialState(), 'START', 'HIT', 'HIT', 'BOMB', 'MISS');
  assert.equal(accuracy(s), 50);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegister, validateLogin, validateResult } from '../src/validate.js';
import { roundConfig, maxScoreFor, TOTAL_ROUNDS } from '../src/gameRules.js';

const good = { clientSessionId: 'abcd-1234-efgh', score: 120, roundsCompleted: 1, levelReached: 1, hits: 6, bombHits: 1, durationSec: 20 };

test('register: accepts valid input and lowercases email', () => {
  const r = validateRegister({ username: 'Player_1', email: ' A@B.com ', password: 'abcdefg1' });
  assert.equal(r.value.email, 'a@b.com');
});
test('register: rejects weak password, bad email, bad username', () => {
  const r = validateRegister({ username: 'a!', email: 'nope', password: 'short' });
  assert.ok(r.errors.username && r.errors.email && r.errors.password);
});
test('register/login: reject NoSQL-injection objects', () => {
  assert.ok(validateRegister({ username: { $gt: '' }, email: 'a@b.com', password: 'abcdefg1' }).errors.username);
  assert.ok(validateLogin({ identifier: { $gt: '' }, password: 'x' }).errors.form);
});
test('result: accepts a plausible result', () => {
  assert.deepEqual(validateResult(good).errors, []);
});
test('result: rejects impossible score', () => {
  assert.ok(validateResult({ ...good, score: 99999 }).errors.length);
});
test('result: rejects wrong level, wrong types, bad session id', () => {
  assert.ok(validateResult({ ...good, levelReached: 3 }).errors.length);
  assert.ok(validateResult({ ...good, score: '120' }).errors.length);
  assert.ok(validateResult({ ...good, clientSessionId: '../x' }).errors.length);
});
test('result: rejects hits inconsistent with rounds completed', () => {
  assert.ok(validateResult({ ...good, hits: 1 }).errors.length);
});
test('rules: difficulty increases and 9 rounds exist', () => {
  assert.equal(TOTAL_ROUNDS, 9);
  assert.ok(roundConfig(8).targets > roundConfig(0).targets);
  assert.ok(roundConfig(8).time < roundConfig(0).time);
  assert.ok(maxScoreFor(9) > maxScoreFor(1));
});

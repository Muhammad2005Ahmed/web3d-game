// Integration tests. Start the server first (npm run dev), then: npm run test:api
// Optional: API_URL=https://your-api.onrender.com/api
import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_URL || 'http://localhost:5000/api';
const call = (path, { method = 'GET', body, token } = {}) =>
  fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, data: await r.json().catch(() => ({})) }));

const id = Date.now().toString(36);
const creds = { username: `user_${id}`, email: `user_${id}@test.com`, password: 'Passw0rdTest' };
let token;
// Round 1 has 6 targets, so an unfinished game can have at most 5 hits (score 50)
const result = { clientSessionId: `sess-${id}-0001`, score: 50, roundsCompleted: 0, levelReached: 1, hits: 5, bombHits: 0, durationSec: 12 };

test('register succeeds, duplicate fails', async () => {
  const a = await call('/auth/register', { method: 'POST', body: creds });
  assert.equal(a.status, 201); token = a.data.token;
  assert.equal(a.data.user.passwordHash, undefined);
  const b = await call('/auth/register', { method: 'POST', body: creds });
  assert.equal(b.status, 409);
});
test('login rejects wrong password, accepts right one', async () => {
  assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: creds.email, password: 'wrong' } })).status, 401);
  assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: creds.username, password: creds.password } })).status, 200);
});
test('protected routes need a token', async () => {
  assert.equal((await call('/games/stats')).status, 401);
  assert.equal((await call('/games/stats', { token: 'garbage' })).status, 401);
});
test('result is saved once, tampered score is rejected, stats update', async () => {
  assert.equal((await call('/games', { method: 'POST', token, body: result })).status, 201);
  assert.equal((await call('/games', { method: 'POST', token, body: result })).data.duplicate, true);
  assert.equal((await call('/games', { method: 'POST', token, body: { ...result, clientSessionId: `sess-${id}-0002`, score: 99999 } })).status, 400);
  const stats = await call('/games/stats', { token });
  assert.equal(stats.data.totalGames, 1);
  assert.equal(stats.data.bestScore, 50);
});

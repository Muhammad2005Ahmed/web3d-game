import { TOTAL_ROUNDS, levelForRounds, maxScoreFor, minHitsFor, maxHitsFor } from './gameRules.js';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const USER_RE = /^[A-Za-z0-9_]{3,20}$/;
const isStr = (v) => typeof v === 'string'; // blocks NoSQL-injection objects like {"$gt":""}
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

export function validateRegister(b) {
  const errors = {};
  if (!isStr(b?.username) || !USER_RE.test(b.username))
    errors.username = '3-20 characters: letters, numbers or underscore';
  if (!isStr(b?.email) || b.email.length > 254 || !EMAIL_RE.test(b.email.trim()))
    errors.email = 'Enter a valid email address';
  if (!isStr(b?.password) || b.password.length < 8 || b.password.length > 72 ||
      !/[A-Za-z]/.test(b.password) || !/\d/.test(b.password))
    errors.password = '8-72 characters with at least one letter and one number';
  if (Object.keys(errors).length) return { errors };
  return { errors, value: { username: b.username, email: b.email.trim().toLowerCase(), password: b.password } };
}

export function validateLogin(b) {
  if (!isStr(b?.identifier) || !b.identifier.trim() || b.identifier.length > 254 ||
      !isStr(b?.password) || !b.password || b.password.length > 72)
    return { errors: { form: 'Enter your email/username and password' } };
  return { errors: {}, value: { identifier: b.identifier.trim().toLowerCase(), password: b.password } };
}

export function validateResult(b) {
  const errors = [];
  if (!b || typeof b !== 'object') return { errors: ['Invalid request body'] };
  const { clientSessionId, score, roundsCompleted, levelReached, hits, bombHits, durationSec } = b;
  if (!isStr(clientSessionId) || !/^[A-Za-z0-9-]{8,64}$/.test(clientSessionId)) errors.push('clientSessionId is invalid');
  if (!isInt(roundsCompleted, 0, TOTAL_ROUNDS)) errors.push('roundsCompleted out of range');
  if (!isInt(levelReached, 1, 3)) errors.push('levelReached out of range');
  if (!isInt(score, 0, 100000)) errors.push('score out of range');
  if (!isInt(hits, 0, 500)) errors.push('hits out of range');
  if (!isInt(bombHits, 0, 500)) errors.push('bombHits out of range');
  if (!isInt(durationSec, 0, 3600)) errors.push('durationSec out of range');
  if (errors.length) return { errors };

  // Cross-checks against the game rules (don't trust the client blindly)
  if (levelReached !== levelForRounds(roundsCompleted)) errors.push('levelReached does not match roundsCompleted');
  if (score > maxScoreFor(roundsCompleted)) errors.push('score exceeds the maximum possible');
  if (hits < minHitsFor(roundsCompleted) || hits > maxHitsFor(roundsCompleted)) errors.push('hits do not match rounds completed');
  if (errors.length) return { errors };
  return { errors, value: { clientSessionId, score, roundsCompleted, levelReached, hits, bombHits, durationSec } };
}

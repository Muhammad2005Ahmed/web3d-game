import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSignup, validateLogin } from './validators.js';

test('signup: valid values pass', () => {
  assert.deepEqual(validateSignup({ username: 'abc_1', email: 'a@b.co', password: 'abcdefg1', confirm: 'abcdefg1' }), {});
});
test('signup: catches every bad field', () => {
  const e = validateSignup({ username: 'a', email: 'x', password: 'short', confirm: 'other' });
  assert.deepEqual(Object.keys(e).sort(), ['confirm', 'email', 'password', 'username']);
});
test('login: requires both fields', () => {
  assert.equal(Object.keys(validateLogin({ identifier: ' ', password: '' })).length, 2);
});

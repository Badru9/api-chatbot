import test from 'node:test';
import assert from 'node:assert';
import { hashPassword, verifyPassword, login, logout, getSession } from '../services/auth.js';

test('Password hashing with bcrypt', async () => {
  const rawPassword = 'mySecurePassword123';
  const hashed = await hashPassword(rawPassword);

  assert.notStrictEqual(hashed, rawPassword);
  assert.strictEqual(typeof hashed, 'string');

  const isValid = await verifyPassword(rawPassword, hashed);
  assert.strictEqual(isValid, true);

  const isInvalid = await verifyPassword('wrongPassword', hashed);
  assert.strictEqual(isInvalid, false);
});

test('Session token management functions exist', () => {
  assert.strictEqual(typeof login, 'function');
  assert.strictEqual(typeof logout, 'function');
  assert.strictEqual(typeof getSession, 'function');
});

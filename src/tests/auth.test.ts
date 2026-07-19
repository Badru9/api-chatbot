import test from 'node:test';
import assert from 'node:assert';
import { auth } from '../services/auth';

test('Auth service should be initialized correctly', () => {
  assert.ok(auth);
  assert.strictEqual(typeof auth.handler, 'function');
  assert.ok(auth.api);
});

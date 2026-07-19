import test from 'node:test';
import assert from 'node:assert';
const { auth } = require('../services/auth');

test('Auth service should be initialized correctly', () => {
  assert.ok(auth);
  assert.strictEqual(typeof auth.handler, 'function');
  assert.ok(auth.api);
});

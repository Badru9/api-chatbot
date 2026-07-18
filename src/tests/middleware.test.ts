import test from 'node:test';
import assert from 'node:assert';
const { requireAuth } = require('../middleware/requireAuth');
const { requireAdmin } = require('../middleware/requireAdmin');

test('Middleware exports should exist', () => {
  assert.strictEqual(typeof requireAuth, 'function');
  assert.strictEqual(typeof requireAdmin, 'function');
});

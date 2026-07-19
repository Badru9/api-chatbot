import test from 'node:test';
import assert from 'node:assert';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

test('Middleware exports should exist', () => {
  assert.strictEqual(typeof requireAuth, 'function');
  assert.strictEqual(typeof requireAdmin, 'function');
});

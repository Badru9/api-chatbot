import test from 'node:test';
import assert from 'node:assert';
import { requireAuth } from '../middleware/requireAuth';
import { requireAdmin } from '../middleware/requireAdmin';

test('Middleware exports should exist', () => {
  assert.strictEqual(typeof requireAuth, 'function');
  assert.strictEqual(typeof requireAdmin, 'function');
});

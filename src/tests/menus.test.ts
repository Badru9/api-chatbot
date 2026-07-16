import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
// @ts-ignore
import menusRouter from '../routes/menus.js';
import { prisma } from '../services/database.js';

test('Menus API TDD tests', async (t) => {
  // Clean up any existing test menus
  try {
    await prisma.portalMenu.deleteMany({
      where: {
        OR: [
          { createdBy: 'test-admin-id' },
          { createdBy: 'system' }
        ]
      }
    });
  } catch (err) {
    console.error('Clean up failed:', err);
  }

  const app = express();
  app.use(express.json());
  
  // Mount the menus router directly for integration testing
  // In the test, we mock req.session to simulate logged-in admin/dosen
  app.use((req, res, next) => {
    // Default to test-admin session
    (req as any).session = {
      user: {
        id: 'test-admin-id',
        role: 'admin',
        email: 'admin@test.com',
      }
    };
    next();
  });
  app.use('/api/menus', menusRouter);

  // Start temporary server
  const server = app.listen(4099);
  const baseUrl = 'http://localhost:4099/api/menus';

  await t.test('GET /api/menus should auto-seed default menus when database is empty', async () => {
    const res = await fetch(baseUrl);
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any[];
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 5);
    assert.strictEqual(data[0].title, 'Monitoring Kinerja');
    assert.strictEqual(data[0].order, 1);
  });

  await t.test('POST /api/menus should create a new menu', async () => {
    const payload = {
      title: 'Menu Pengujian TDD',
      description: 'Deskripsi menu pengujian TDD',
      icon: 'Gear',
      href: '/test-route',
      visibleToRoles: ['admin'],
      order: 10
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json() as any;
    assert.strictEqual(data.title, payload.title);
    assert.strictEqual(data.createdBy, 'test-admin-id');
    assert.ok(data.id);
  });

  // Close server and cleanup
  server.close();
  try {
    await prisma.portalMenu.deleteMany({
      where: {
        OR: [
          { createdBy: 'test-admin-id' },
          { createdBy: 'system' }
        ]
      }
    });
  } catch (err) {}
});

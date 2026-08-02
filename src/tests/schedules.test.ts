import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
// @ts-ignore
import schedulesRouter from '../routes/schedules.js';
import { prisma } from '../services/database.js';

test('Schedules API TDD tests', async (t) => {
  // Setup: create dummy user first to satisfy foreign key constraint
  try {
    await prisma.user.upsert({
      where: { id: 'test-user-id' },
      update: {},
      create: {
        id: 'test-user-id',
        name: 'Test Dosen',
        email: 'dosen@test.com',
        role: 'dosen',
      }
    });
  } catch (err) {
    console.error('Setup user failed:', err);
  }

  // Cleanup test schedules
  try {
    await prisma.schedule.deleteMany({
      where: { userId: 'test-user-id' }
    });
  } catch (err) {}

  const app = express();
  app.use(express.json());
  app.use((req: any, res: any, next: any) => {
    req.session = {
      user: {
        id: 'test-user-id',
        role: 'dosen',
        email: 'dosen@test.com',
      }
    };
    next();
  });
  app.use('/api/schedules', schedulesRouter);

  const server = app.listen(4097);
  const baseUrl = 'http://localhost:4097/api/schedules';

  await t.test('GET /api/schedules should return empty array when no schedules', async () => {
    const res = await fetch(baseUrl);
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any[];
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 0);
  });

  await t.test('DELETE /api/schedules should clear all user schedules', async () => {
    // Seed manual
    await prisma.schedule.create({
      data: {
        userId: 'test-user-id',
        day: 'Senin',
        startTime: '08:00',
        endTime: '09:40',
        courseName: 'Dasar AI',
        className: 'IF-A',
        room: 'R.302',
        sks: 2
      }
    });

    const deleteRes = await fetch(baseUrl, { method: 'DELETE' });
    assert.strictEqual(deleteRes.status, 200);

    const checkRes = await fetch(baseUrl);
    const data = await checkRes.json() as any[];
    assert.strictEqual(data.length, 0);
  });

  server.close();
  try {
    await prisma.schedule.deleteMany({ where: { userId: 'test-user-id' } });
    await prisma.user.delete({ where: { id: 'test-user-id' } });
  } catch (err) {}
});

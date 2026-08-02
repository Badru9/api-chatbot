import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
// @ts-ignore
import chatRouter from '../routes/chat.js';
import { prisma, insertPdfChunk } from '../services/database.js';

test('Chat Schedules Parsing integration tests', async (t) => {
  const documentId = 'test-doc-schedule-id';
  const userId = 'test-dosen-id';

  // Setup: create dummy user
  try {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        name: 'Test Dosen',
        email: 'dosen-chat@test.com',
        role: 'dosen',
      }
    });
  } catch (err) {}

  // Seed dummy PDF chunk
  await prisma.pdfChunk.deleteMany({ where: { documentId } });
  await prisma.schedule.deleteMany({ where: { userId } });

  await insertPdfChunk({
    documentId,
    documentName: 'Jadwal_Dosen.pdf',
    documentHash: 'hash-abc',
    pageNumber: 1,
    chunkIndex: 0,
    chunkText: 'Senin jam 08:00-09:40 mengajar Pemrograman Web kelas IF-B di ruang R.302',
    tokenCount: 15,
    metadata: { userId }
  }, Array(1024).fill(0.0));

  const app = express();
  app.use(express.json());
  app.use((req: any, res: any, next: any) => {
    req.session = {
      user: {
        id: userId,
        role: 'dosen',
        email: 'dosen-chat@test.com',
      }
    };
    next();
  });
  app.use('/api/chat', chatRouter);

  const server = app.listen(4095);
  const baseUrl = 'http://localhost:4095/api/chat';

  // We mock the global fetch to return a mock response for Ollama's parse prompt.
  const originalFetch = global.fetch;
  global.fetch = async (url: any, options: any) => {
    const urlStr = String(url);
    if (urlStr.includes('11434')) {
      const body = JSON.parse(options.body);
      // Check if it's the schedule parsing prompt
      if (body.messages?.[0]?.content?.includes('Ekstrak jadwal mengajar')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: {
              role: 'assistant',
              content: JSON.stringify([
                {
                  day: 'Senin',
                  startTime: '08:00',
                  endTime: '09:40',
                  courseName: 'Pemrograman Web',
                  courseCode: 'IF123',
                  className: 'IF-B',
                  room: 'R.302',
                  sks: 2
                }
              ])
            }
          })
        } as any;
      }
      
      // Fallback stream response for standard chat
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ message: { content: 'Sukses' } })));
          controller.close();
        }
      });
      return {
        ok: true,
        status: 200,
        body: stream
      } as any;
    }
    return originalFetch(url, options);
  };

  await t.test('POST /api/chat with activeTools: ["jadwal"] should parse PDF chunks and insert schedules', async () => {
    const payload = {
      prompt: 'Tolong parse jadwal saya dari file ini',
      documentIds: [documentId],
      messages: [{ role: 'user', content: 'Tolong parse jadwal saya dari file ini' }],
      activeTools: ['jadwal']
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 200);

    // Verify it saved schedules to database
    const savedSchedules = await prisma.schedule.findMany({
      where: { userId }
    });

    assert.strictEqual(savedSchedules.length, 1);
    assert.strictEqual(savedSchedules[0].courseName, 'Pemrograman Web');
    assert.strictEqual(savedSchedules[0].className, 'IF-B');
    assert.strictEqual(savedSchedules[0].room, 'R.302');
  });

  // Restore fetch and close server
  global.fetch = originalFetch;
  server.close();

  // Cleanup
  await prisma.pdfChunk.deleteMany({ where: { documentId } });
  await prisma.schedule.deleteMany({ where: { userId } });
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (err) {}
});

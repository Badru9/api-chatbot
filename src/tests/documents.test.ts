import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
// @ts-ignore
import documentsRouter from '../routes/documents';
import { prisma } from '../services/database';

test('Documents API TDD tests', async (t) => {
  // Cleanup test documents from database first
  try {
    await prisma.pdfChunk.deleteMany({
      where: {
        documentName: 'tdd_test_document.pdf'
      }
    });
  } catch (err) {}

  const app = express();
  app.use(express.json());

  // Mock session untuk otentikasi admin
  app.use((req: any, res: any, next: any) => {
    req.session = {
      user: {
        id: 'test-admin-id',
        role: 'admin',
        email: 'admin@test.com',
      }
    };
    next();
  });
  app.use('/api/documents', documentsRouter);

  const server = app.listen(4098);
  const baseUrl = 'http://localhost:4098/api/documents';

  await t.test('GET /api/documents should return empty array or existing documents', async () => {
    const res = await fetch(baseUrl);
    assert.strictEqual(res.status, 200);
    const data = await res.json() as any[];
    assert.ok(Array.isArray(data));
  });

  await t.test('DELETE /api/documents/:id with invalid id should fail or respond properly', async () => {
    const res = await fetch(`${baseUrl}/invalid-id-12345`, {
      method: 'DELETE'
    });
    assert.strictEqual(res.status, 200); // Service deleteDocumentChunks resolves even if nothing deleted
    const data = await res.json() as any;
    assert.strictEqual(data.ok, true);
  });

  server.close();
});

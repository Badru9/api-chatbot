import { Router } from 'express';
import multer from 'multer';

import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { deleteDocumentChunks, prisma } from '../services/database.js';
import { ingestPdfBuffer } from '../services/ingestion.js';

const router = Router();
// Pastikan semua endpoint memerlukan otentikasi admin
router.use(requireAuth);
router.use(requireAdmin);

const upload = multer({ storage: multer.memoryStorage() });

// GET list all documents
router.get('/', async (req, res) => {
  try {
    const rawDocs = await prisma.pdfChunk.groupBy({
      by: ['documentId', 'documentName'],
      _count: {
        id: true,
      },
      _max: {
        createdAt: true,
      },
    });

    const documents = rawDocs.map((doc) => ({
      id: doc.documentId,
      name: doc.documentName,
      chunkCount: doc._count.id,
      uploadedAt: doc._max.createdAt,
    }));

    // Urutkan berdasarkan waktu unggah terbaru
    documents.sort((a, b) => {
      const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return dateB - dateA;
    });

    res.json(documents);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Gagal mengambil daftar dokumen.',
    });
  }
});

// POST upload PDF
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'Field file wajib diisi.' });
      return;
    }

    const document = await ingestPdfBuffer(
      file.buffer,
      file.originalname,
      file.size,
      file.mimetype,
    );

    res.status(201).json({ document });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Gagal memproses PDF.',
    });
  }
});

// DELETE chunks
router.delete('/:id', async (req, res) => {
  const documentId = req.params.id;

  if (!documentId || !documentId.trim()) {
    res.status(400).json({ error: 'Parameter id wajib diisi.' });
    return;
  }

  try {
    await deleteDocumentChunks(documentId);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Gagal menghapus dokumen.',
    });
  }
});

export default router;

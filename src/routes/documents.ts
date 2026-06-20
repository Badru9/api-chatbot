import { Router } from 'express';
import multer from 'multer';

import { deleteDocumentChunks } from '../services/database.js';
import { ingestPdfBuffer } from '../services/ingestion.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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

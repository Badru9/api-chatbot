import { Router } from 'express';

import { retrievePdfContext } from '../services/retriever.js';

const router = Router();

router.post('/context', async (req, res) => {
  try {
    const { prompt, documentIds, limit } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Field prompt wajib diisi.' });
      return;
    }

    const ids = Array.isArray(documentIds)
      ? documentIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];

    const context = await retrievePdfContext({
      prompt: prompt.trim(),
      documentIds: ids,
      limit: typeof limit === 'number' ? limit : undefined,
    });

    res.json({ context });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Gagal mengambil konteks.',
    });
  }
});

export default router;

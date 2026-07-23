import { Router } from "express";
import multer from "multer";

import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { deleteDocumentChunks, prisma } from "../services/database.js";
import { ingestPdfBuffer } from "../services/ingestion.js";
import { deletePdf, downloadPdf } from "../services/storage.js";

const router = Router();
// Pastikan semua endpoint memerlukan otentikasi
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage() });

// GET list all documents
router.get("/", async (req: any, res: any) => {
  try {
    const user = req.session?.user;
    const isUserAdmin = user?.role === "admin";
    const userId = user?.id;

    const whereClause = isUserAdmin
      ? {}
      : {
          metadata: {
            path: ["userId"],
            equals: userId,
          },
        };

    const rawDocs = await prisma.pdfChunk.groupBy({
      by: ["documentId", "documentName"],
      where: whereClause,
      _count: {
        id: true,
      },
      _max: {
        createdAt: true,
      },
    });

    const documents = rawDocs.map((doc: any) => ({
      id: doc.documentId,
      name: doc.documentName,
      chunkCount: doc._count.id,
      uploadedAt: doc._max.createdAt,
    }));

    // Urutkan berdasarkan waktu unggah terbaru
    documents.sort((a: any, b: any) => {
      const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return dateB - dateA;
    });

    res.json(documents);
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil daftar dokumen.",
    });
  }
});

// POST upload PDF
router.post("/", upload.single("file"), async (req: any, res: any) => {
  try {
    const file = req.file;
    const userId = req.session?.user?.id;

    console.log("file yang diupload", file);

    if (!file) {
      res.status(400).json({ error: "Field file wajib diisi." });
      return;
    }

    const document = await ingestPdfBuffer(
      file.buffer,
      file.originalname,
      file.size,
      file.mimetype,
      userId,
    );

    res.status(201).json({ document });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Gagal memproses PDF.",
    });
  }
});

// GET download/preview PDF
router.get("/:id/download", async (req: any, res: any) => {
  const documentId = req.params.id;
  const user = req.session?.user;

  if (!documentId || !documentId.trim()) {
    res.status(400).json({ error: "Parameter id wajib diisi." });
    return;
  }

  try {
    // Authorization check: non-admin can only download own files
    if (user?.role !== "admin") {
      const chunkCount = await prisma.pdfChunk.count({
        where: {
          documentId,
          metadata: {
            path: ["userId"],
            equals: user?.id,
          },
        },
      });
      if (chunkCount === 0) {
        res.status(403).json({
          error: "Forbidden: Dokumen tidak ditemukan atau bukan milik Anda.",
        });
        return;
      }
    }

    const stream = await downloadPdf(documentId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${documentId}.pdf"`,
    );
    stream.pipe(res);
  } catch (error: any) {
    if (error?.code === "NoSuchKey" || error?.code === "NotFound") {
      res.status(404).json({ error: "File PDF tidak ditemukan di storage." });
    } else {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Gagal mengunduh PDF.",
      });
    }
  }
});

// DELETE chunks
router.delete("/:id", async (req: any, res: any) => {
  const documentId = req.params.id;
  const user = req.session?.user;

  if (!documentId || !documentId.trim()) {
    res.status(400).json({ error: "Parameter id wajib diisi." });
    return;
  }

  try {
    if (user?.role !== "admin") {
      const chunkCount = await prisma.pdfChunk.count({
        where: {
          documentId,
          metadata: {
            path: ["userId"],
            equals: user?.id,
          },
        },
      });
      if (chunkCount === 0) {
        res.status(403).json({
          error: "Forbidden: Dokumen tidak ditemukan atau bukan milik Anda.",
        });
        return;
      }
    }

    await deleteDocumentChunks(documentId);
    await deletePdf(documentId);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Gagal menghapus dokumen.",
    });
  }
});

export default router;

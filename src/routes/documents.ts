import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { v4 as uuid } from "uuid";

import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  deleteDocumentChunks,
  prisma,
  replacePdfChunks,
} from "../services/database.js";
import { ingestPdfBuffer } from "../services/ingestion.js";
import { deletePdf, downloadPdf } from "../services/storage.js";
import { chunkPdfDocument } from "../services/chunker.js";
import { embedTexts } from "../services/embeddings.js";
import { validateBody, manualDatasetSchema } from "../middleware/validators.js";

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
    files: 1,
  },
});

/**
 * Validates that the buffer starts with PDF magic bytes (%PDF-).
 * Protects against MIME-type spoofing.
 */
function isPdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 5) return false;
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}

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

    if (!file) {
      res.status(400).json({ error: "Field file wajib diisi." });
      return;
    }

    if (!isPdfBuffer(file.buffer)) {
      res.status(400).json({ error: "File yang diunggah bukan PDF yang valid." });
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

// POST manual dataset input
router.post("/manual", requireAdmin, validateBody(manualDatasetSchema), async (req: any, res: any) => {
  try {
    const { name, description, source } = req.body;
    const userId = req.session?.user?.id;

    const documentHash = crypto.createHash("sha256").update(description).digest("hex");
    const documentId = `manual-${uuid()}`;

    const pages = [{ pageNumber: 1, text: description }];
    const chunks = chunkPdfDocument({
      documentId,
      documentName: name,
      documentHash,
      pages,
      userId,
    });

    if (chunks.length === 0) {
      res
        .status(400)
        .json({ error: "Deskripsi dataset tidak memiliki teks yang valid." });
      return;
    }

    const processedChunks = chunks.map((chunk) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        isPublic: true,
        source: source || "",
      },
    }));

    const embeddings = await embedTexts(
      processedChunks.map((c) => c.chunkText),
    );
    await replacePdfChunks(processedChunks, embeddings);

    res.status(201).json({
      document: {
        id: documentId,
        name,
        size: Buffer.byteLength(description, "utf-8"),
        type: "manual",
        uploadedAt: new Date().toISOString(),
        chunksCount: chunks.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Gagal menyimpan dataset manual.",
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

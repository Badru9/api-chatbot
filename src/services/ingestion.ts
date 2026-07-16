import { createHash, randomUUID } from "node:crypto";

import { chunkPdfDocument } from "./chunker.js";
import { deleteDocumentChunks, replacePdfChunks } from "./database.js";
import { embedTexts } from "./embeddings.js";
import { parsePdfPages } from "./pdfParser.js";
import type { PdfDocument } from "../types/index.js";

const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;

export async function ingestPdfBuffer(
  buffer: Buffer,
  fileName: string,
  fileSize: number,
  mimeType: string,
): Promise<PdfDocument> {
  if (fileSize > MAX_PDF_SIZE_BYTES) {
    throw new Error("Ukuran PDF maksimal 15 MB.");
  }

  if (mimeType && mimeType !== "application/pdf") {
    throw new Error("File harus berformat PDF.");
  }

  const documentHash = createHash("sha256").update(buffer).digest("hex");
  const documentId = documentHash || randomUUID();

  try {
    const pages = await parsePdfPages(buffer);
    const chunks = chunkPdfDocument({
      documentId,
      documentName: fileName,
      documentHash,
      pages,
    });

    if (chunks.length === 0) {
      throw new Error("PDF tidak memiliki teks yang bisa dibaca.");
    }

    const embeddings = await embedTexts(chunks.map((c) => c.chunkText));
    await replacePdfChunks(chunks, embeddings);

    return {
      id: documentId,
      name: fileName,
      size: fileSize,
      type: mimeType || "application/pdf",
      uploadedAt: Date.now(),
      chunksCount: chunks.length,
    };
  } catch (error) {
    await deleteDocumentChunks(documentId);
    throw error;
  }
}

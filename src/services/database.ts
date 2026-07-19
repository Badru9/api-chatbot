import { PrismaClient } from "@prisma/client";

interface PdfChunk {
  documentId: string;
  documentName: string;
  documentHash: string;
  pageNumber: number | null;
  chunkIndex: number;
  chunkText: string;
  tokenCount: number;
  metadata?: Record<string, unknown>;
}

interface RetrievedPdfChunk {
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  chunkIndex: number;
  chunkText: string;
  score: number;
}

const prisma = new PrismaClient();

export { prisma };

export async function insertPdfChunk(
  chunk: PdfChunk,
  embedding: number[],
): Promise<void> {
  const vectorStr = `[${embedding.join(",")}]`;

  await prisma.$executeRawUnsafe(
    `INSERT INTO vectors (
      document_id, document_name, document_hash,
      page_number, chunk_index, chunk_text,
      token_count, embedding, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9::jsonb)`,
    chunk.documentId,
    chunk.documentName,
    chunk.documentHash,
    chunk.pageNumber,
    chunk.chunkIndex,
    chunk.chunkText,
    chunk.tokenCount,
    vectorStr,
    JSON.stringify(chunk.metadata ?? {}),
  );
}

export async function replacePdfChunks(
  chunks: PdfChunk[],
  embeddings: number[][],
): Promise<void> {
  if (chunks.length !== embeddings.length) {
    throw new Error("Jumlah chunk dan embedding tidak sama.");
  }

  if (chunks.length === 0) return;

  await deleteDocumentChunks(chunks[0].documentId);

  for (let i = 0; i < chunks.length; i++) {
    await insertPdfChunk(chunks[i], embeddings[i]);
  }
}

export async function deleteDocumentChunks(documentId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    "DELETE FROM vectors WHERE document_id = $1",
    documentId,
  );
}

export async function searchPdfChunks({
  embedding,
  documentIds,
  limit = 8,
}: {
  embedding: number[];
  documentIds: string[];
  limit?: number;
}): Promise<RetrievedPdfChunk[]> {
  if (documentIds.length === 0) return [];

  const vectorStr = `[${embedding.join(",")}]`;
  const placeholders = documentIds.map((_, i) => `$${i + 2}`).join(", ");

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      document_id: string;
      document_name: string;
      page_number: number | null;
      chunk_index: number;
      chunk_text: string;
      score: number;
    }>
  >(
    `SELECT
      document_id,
      document_name,
      page_number,
      chunk_index,
      chunk_text,
      1 - (embedding <=> $1::vector) AS score
    FROM vectors
    WHERE document_id IN (${placeholders})
    ORDER BY score DESC
    LIMIT ${Number(limit)}`,
    vectorStr,
    ...documentIds,
  );

  return rows.map((row: any) => ({
    documentId: row.document_id,
    documentName: row.document_name,
    pageNumber: row.page_number,
    chunkIndex: row.chunk_index,
    chunkText: row.chunk_text,
    score: Number(row.score),
  }));
}

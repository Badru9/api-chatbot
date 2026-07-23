import { searchPdfChunks } from "./database.js";
import { embedText } from "./embeddings.js";

interface RetrievedPdfChunk {
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  chunkIndex: number;
  chunkText: string;
  score: number;
}

interface RetrievePdfContextInput {
  prompt: string;
  documentIds: string[];
  limit?: number;
  userId?: string;
}

export async function retrievePdfChunks({
  prompt,
  documentIds,
  limit = 8,
  userId,
}: RetrievePdfContextInput): Promise<RetrievedPdfChunk[]> {
  if (documentIds.length === 0) return [];

  const promptEmbedding = await embedText(prompt);

  const initialChunks = await searchPdfChunks({
    embedding: promptEmbedding,
    documentIds,
    limit,
    userId,
  });

  return initialChunks;
}

export function formatRetrievedPdfContext(chunks: RetrievedPdfChunk[]): string {
  if (chunks.length === 0) return '';

  return chunks
    .map((chunk: any, index: number) =>
      [
        `[Sumber PDF ${index + 1}]`,
        `Dokumen: ${chunk.documentName}`,
        `Halaman: ${chunk.pageNumber ?? '-'}`,
        `Chunk: ${chunk.chunkIndex}`,
        `Skor relevansi: ${chunk.score.toFixed(4)}`,
        chunk.chunkText,
      ].join('\n'),
    )
    .join('\n\n---\n\n');
}

export async function retrievePdfContext(input: RetrievePdfContextInput): Promise<string> {
  const chunks = await retrievePdfChunks(input);
  return formatRetrievedPdfContext(chunks);
}

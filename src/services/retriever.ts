import { searchPdfChunks } from './database.js';
import { embedText } from './embeddings.js';
import type { RetrievedPdfChunk } from '../types/index.js';

interface RetrievePdfContextInput {
  prompt: string;
  documentIds: string[];
  limit?: number;
}

export async function retrievePdfChunks({
  prompt,
  documentIds,
  limit = 8,
}: RetrievePdfContextInput): Promise<RetrievedPdfChunk[]> {
  if (documentIds.length === 0) return [];

  const promptEmbedding = await embedText(prompt);

  return searchPdfChunks({
    embedding: promptEmbedding,
    documentIds,
    limit,
  });
}

export function formatRetrievedPdfContext(chunks: RetrievedPdfChunk[]): string {
  if (chunks.length === 0) return '';

  return chunks
    .map((chunk, index) =>
      [
        `[Sumber PDF ${index + 1}]`,
        `Dokumen: ${chunk.documentName}`,
        `Halaman: ${chunk.pageNumber ?? '-'}`,
        `Chunk: ${chunk.chunkIndex}`,
        `Skor relevansi: ${chunk.score.toFixed(4)}`,
        chunk.chunkText,
      ].join('\n'),
    )
    .join('\n\n---\n\\n');
}

export async function retrievePdfContext(input: RetrievePdfContextInput): Promise<string> {
  const chunks = await retrievePdfChunks(input);
  return formatRetrievedPdfContext(chunks);
}

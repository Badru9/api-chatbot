import { searchPdfChunks } from './database.js';
import { embedText } from './embeddings.js';
import type { RetrievedPdfChunk } from '../types/index.js';

interface RetrievePdfContextInput {
  prompt: string;
  documentIds: string[];
  limit?: number;
}

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

async function rerankChunks(query: string, chunks: RetrievedPdfChunk[]): Promise<RetrievedPdfChunk[]> {
  if (chunks.length === 0) return [];

  try {
    const passages = chunks.map(chunk => chunk.chunkText);
    const response = await fetch(`${PYTHON_SERVICE_URL}/rerank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, passages }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Reranker failed (status: ${response.status}): ${errorText}. Falling back to dense scores.`);
      return chunks;
    }

    const data = (await response.json()) as { scores: number[] };

    const reranked = chunks.map((chunk, index) => ({
      ...chunk,
      score: data.scores[index] ?? chunk.score,
    }));

    return reranked.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Error during reranking:', error);
    return chunks;
  }
}

export async function retrievePdfChunks({
  prompt,
  documentIds,
  limit = 8,
}: RetrievePdfContextInput): Promise<RetrievedPdfChunk[]> {
  if (documentIds.length === 0) return [];

  const promptEmbedding = await embedText(prompt);

  const candidateLimit = Math.max(limit * 3, 25);

  const initialChunks = await searchPdfChunks({
    embedding: promptEmbedding,
    documentIds,
    limit: candidateLimit,
  });

  const rerankedChunks = await rerankChunks(prompt, initialChunks);

  return rerankedChunks.slice(0, limit);
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
    .join('\n\n---\n\n');
}

export async function retrievePdfContext(input: RetrievePdfContextInput): Promise<string> {
  const chunks = await retrievePdfChunks(input);
  return formatRetrievedPdfContext(chunks);
}
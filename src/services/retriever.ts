import { pipeline, env, type TextClassificationPipeline } from '@huggingface/transformers';
import { searchPdfChunks } from './database.js';
import { embedText } from './embeddings.js';
import type { RetrievedPdfChunk } from '../types/index.js';

interface RetrievePdfContextInput {
  prompt: string;
  documentIds: string[];
  limit?: number;
}

// Skip model download checks
env.allowLocalModels = false;
env.useBrowserCache = true;

let rerankerPipeline: TextClassificationPipeline | null = null;

async function getRerankerPipeline(): Promise<TextClassificationPipeline> {
  if (!rerankerPipeline) {
    rerankerPipeline = await pipeline('text-classification', 'Xenova/bge-reranker-v2-m3', {
      device: 'cpu',
      dtype: 'q4',
    });
  }
  return rerankerPipeline;
}

async function rerankChunks(query: string, chunks: RetrievedPdfChunk[]): Promise<RetrievedPdfChunk[]> {
  if (chunks.length === 0) return [];

  try {
    const reranker = await getRerankerPipeline();

    const passages = chunks.map(chunk => chunk.chunkText);
    const results = await reranker(query, { text_pair: passages });

    // results is array of { label: string, score: number } for each passage
    // BGE-reranker returns scores that can be converted to probabilities
    const scores = results.map(r => {
      // Convert logit-like score to proper probability
      // Higher is better, typical range: -10 to 10
      return typeof r.score === 'number' ? r.score : 0;
    });

    // Pair chunks with new reranker scores
    const reranked = chunks.map((chunk, index) => ({
      ...chunk,
      score: scores[index] ?? chunk.score,
    }));

    // Sort by reranker score descending
    return reranked.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.warn(`Reranker failed: ${error}. Falling back to dense scores.`);
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

  // Fetch more candidates (3x) for reranking
  const candidateLimit = Math.max(limit * 3, 25);

  const initialChunks = await searchPdfChunks({
    embedding: promptEmbedding,
    documentIds,
    limit: candidateLimit,
  });

  // Rerank using BGE-Reranker
  const rerankedChunks = await rerankChunks(prompt, initialChunks);

  // Return only the top N
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
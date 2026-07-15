import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

let embeddingPipeline: FeatureExtractionPipeline | null = null;

async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      device: 'cpu',
    });
  }
  return embeddingPipeline;
}

export async function embedText(text: string): Promise<number[]> {
  try {
    const extractor = await getEmbeddingPipeline();
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    });
    return output.tolist() as number[];
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Gagal membuat embedding dokumen.');
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const extractor = await getEmbeddingPipeline();
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += 32) {
      const batch = texts.slice(i, i + 32);
      const batchResults = await Promise.all(
        batch.map(async (text): Promise<number[]> => {
          const output = await extractor(text, {
            pooling: 'mean',
            normalize: true,
          });
          return output.tolist();
        })
      );
      results.push(...batchResults);
    }

    return results;
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw new Error('Gagal membuat embedding dokumen dalam batch.');
  }
}
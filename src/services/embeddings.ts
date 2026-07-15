import {
  pipeline,
  env,
  type FeatureExtractionPipeline,
  type Tensor,
} from "@huggingface/transformers";

// Skip model download checks since we're using existing models
env.allowLocalModels = false;
env.useBrowserCache = true;

let embeddingPipeline: FeatureExtractionPipeline | null = null;

async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline("feature-extraction", "Xenova/bge-m3", {
      device: "cpu", // Change to 'cuda' for GPU
      dtype: "q4", // Quantized for smaller memory: 'q4', 'q8', or 'f32'
    });
  }
  return embeddingPipeline;
}

function tensorToArray(tensor: Tensor): number[] {
  const data = tensor.data;
  if (data instanceof Float32Array) {
    return Array.from(data);
  }
  // Fallback for other types
  return Array.from(new Float32Array(data.buffer));
}

export async function embedText(text: string): Promise<number[]> {
  try {
    const extractor = await getEmbeddingPipeline();

    const output = await extractor(text, {
      pooling: "mean",
      normalize: true,
    });

    return tensorToArray(output);
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Gagal membuat embedding dokumen.");
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const extractor = await getEmbeddingPipeline();

    // Process in batches to avoid memory issues
    const batchSize = 32;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (text) => {
          const output = await extractor(text, {
            pooling: "mean",
            normalize: true,
          });
          return tensorToArray(output);
        }),
      );
      results.push(...batchResults);
    }

    return results;
  } catch (error) {
    console.error("Error generating batch embeddings:", error);
    throw new Error("Gagal membuat embedding dokumen dalam batch.");
  }
}

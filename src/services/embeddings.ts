/**
 * Embeddings service — OpenAI in production, local model in dev.
 *
 * Both use OpenAI-compatible API format, so the same fetch logic works.
 * Switch: set OPENAI_API_KEY → OpenAI; omit it → LOCAL_MODEL_URL.
 *
 * ⚠️  Dimension mismatch: OpenAI text-embedding-3-small = 1536-dim,
 *     all-MiniLM-L6-v2 = 384-dim. Don't mix in same vector DB.
 */

const OPENAI_MODEL = "text-embedding-3-small";

const baseUrl = (
  process.env.OPENAI_API_KEY
    ? process.env.OPENAI_URL || "https://api.openai.com/v1"
    : process.env.LOCAL_MODEL_URL || "http://localhost:1234/v1"
).replace(/\/embeddings\/?$/, "");

const model = process.env.OPENAI_API_KEY
  ? OPENAI_MODEL
  : "Xenova/all-MiniLM-L6-v2";

interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
}

async function fetchEmbeddings(input: string[]): Promise<number[][]> {
  const res = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.OPENAI_API_KEY && {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      }),
    },
    body: JSON.stringify({ model, input }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${text}`);
  }

  const json: EmbeddingResponse = await res.json();
  // Sort by index in case API returns out of order
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedText(text: string): Promise<number[]> {
  try {
    const [vector] = await fetchEmbeddings([text]);
    return vector;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Gagal membuat embedding dokumen.");
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    // OpenAI supports up to 2048 texts per request; local models may differ.
    // Batch in chunks to stay safe across providers.
    const BATCH_SIZE = 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchResults = await fetchEmbeddings(batch);
      results.push(...batchResults);
    }

    return results;
  } catch (error) {
    console.error("Error generating batch embeddings:", error);
    throw new Error("Gagal membuat embedding dokumen dalam batch.");
  }
}

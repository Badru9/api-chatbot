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

interface PdfPageText {
  pageNumber: number;
  text: string;
}

const DEFAULT_MAX_CHARS = 1800;
const DEFAULT_OVERLAP_CHARS = 250;
const APPROX_CHARS_PER_TOKEN = 4;

interface ChunkDocumentInput {
  documentId: string;
  documentName: string;
  documentHash: string;
  pages: PdfPageText[];
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / APPROX_CHARS_PER_TOKEN);
}

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitText(
  text: string,
  maxChars = DEFAULT_MAX_CHARS,
  overlapChars = DEFAULT_OVERLAP_CHARS,
) {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const hardEnd = Math.min(start + maxChars, normalized.length);
    const slice = normalized.slice(start, hardEnd);
    const softBreak = Math.max(
      slice.lastIndexOf("\n\n"),
      slice.lastIndexOf(". "),
    );
    const end =
      hardEnd === normalized.length || softBreak < maxChars * 0.55
        ? hardEnd
        : start + softBreak + 1;
    const chunk = normalized.slice(start, end).trim();

    if (chunk) chunks.push(chunk);
    if (end === normalized.length) break;

    start = Math.max(0, end - overlapChars);
  }

  return chunks;
}

export function chunkPdfDocument(input: ChunkDocumentInput): PdfChunk[] {
  let chunkIndex = 0;

  return input.pages.flatMap((page) =>
    splitText(page.text).map((chunkText) => ({
      documentId: input.documentId,
      documentName: input.documentName,
      documentHash: input.documentHash,
      pageNumber: page.pageNumber,
      chunkIndex: chunkIndex++,
      chunkText,
      tokenCount: estimateTokenCount(chunkText),
      metadata: {
        parser: "pdf-parse",
      },
    })),
  );
}

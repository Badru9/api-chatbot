export interface PdfDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: number;
  chunksCount: number;
}

export interface PdfPageText {
  pageNumber: number;
  text: string;
}

export interface PdfChunk {
  documentId: string;
  documentName: string;
  documentHash: string;
  pageNumber: number | null;
  chunkIndex: number;
  chunkText: string;
  tokenCount: number;
  metadata?: Record<string, unknown>;
}

export interface RetrievedPdfChunk {
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  chunkIndex: number;
  chunkText: string;
  score: number;
}

import { Client as MinioClient } from "minio";
import "dotenv/config";

/* ------------------------------------------------------------------ */
/*  S3-compatible Storage Client (MinIO / Cloudflare R2)               */
/* ------------------------------------------------------------------ */

const s3Client = new MinioClient({
  endPoint: process.env.S3_ENDPOINT || "localhost",
  port: Number(process.env.S3_PORT) || 9000,
  useSSL: process.env.S3_USE_SSL === "true",
  accessKey: process.env.S3_ACCESS_KEY || "minioadmin",
  secretKey: process.env.S3_SECRET_KEY || "minioadmin",
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "pdf-documents";

/**
 * Ensure the bucket exists. Call once at server startup.
 */
export async function initBucket(): Promise<void> {
  const exists = await s3Client.bucketExists(BUCKET_NAME);
  if (!exists) {
    await s3Client.makeBucket(BUCKET_NAME);
    console.log(`[storage] Bucket "${BUCKET_NAME}" created.`);
  } else {
    console.log(`[storage] Bucket "${BUCKET_NAME}" ready.`);
  }
}

/**
 * Upload a PDF buffer to object storage.
 */
export async function uploadPdf(
  documentId: string,
  buffer: Buffer,
  fileName: string,
): Promise<void> {
  await s3Client.putObject(BUCKET_NAME, documentId, buffer, buffer.length, {
    "Content-Type": "application/pdf",
    "X-Original-Filename": encodeURIComponent(fileName),
  });
}

/**
 * Download a PDF as a readable stream from object storage.
 */
export async function downloadPdf(
  documentId: string,
): Promise<NodeJS.ReadableStream> {
  return s3Client.getObject(BUCKET_NAME, documentId);
}

/**
 * Delete a PDF from object storage. Silently ignores missing files.
 */
export async function deletePdf(documentId: string): Promise<void> {
  try {
    await s3Client.removeObject(BUCKET_NAME, documentId);
  } catch {
    // Ignore — file may already have been removed
  }
}

/**
 * Generate a presigned download URL (for future use).
 * Default expiry: 1 hour (3600 seconds).
 */
export async function getPdfUrl(
  documentId: string,
  expiry = 3600,
): Promise<string> {
  return s3Client.presignedGetObject(BUCKET_NAME, documentId, expiry);
}

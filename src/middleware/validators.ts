import { z } from "zod";

/**
 * Chat POST / — main chat endpoint
 */
export const chatSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt tidak boleh kosong")
    .max(10000, "Prompt terlalu panjang (maks 10.000 karakter)"),
  documentIds: z
    .array(z.string().max(256))
    .max(20, "Maksimal 20 dokumen")
    .optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(30000),
      }),
    )
    .max(50, "Maksimal 50 pesan dalam histori")
    .optional(),
  activeTools: z
    .array(z.string().max(50))
    .max(10)
    .optional(),
});

/**
 * Chat POST /context — retrieval-only endpoint
 */
export const chatContextSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt tidak boleh kosong")
    .max(10000, "Prompt terlalu panjang"),
  documentIds: z
    .array(z.string().max(256))
    .max(20)
    .optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

/**
 * Auth login
 */
export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid").max(255),
  password: z.string().min(1).max(128),
});

/**
 * Manual dataset
 */
export const manualDatasetSchema = z.object({
  name: z.string().min(1).max(255, "Judul maks 255 karakter"),
  description: z.string().min(1).max(100000, "Deskripsi maks 100.000 karakter"),
  source: z.string().max(500).optional(),
});

/**
 * Generic middleware factory for body validation.
 * Returns 400 with structured error messages on validation failure.
 */
export function validateBody(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e: z.ZodIssue) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      res.status(400).json({ error: "Validasi gagal", details: errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

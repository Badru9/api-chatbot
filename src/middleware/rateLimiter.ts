import rateLimit from "express-rate-limit";

/**
 * General API rate limiter.
 * 60 requests per minute per IP/User.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Terlalu banyak request. Silakan coba lagi nanti." },
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: any) => {
    return req.session?.user?.id || req.ip || "unknown";
  },
});

/**
 * Strict rate limiter for LLM-calling endpoints.
 * 15 requests per minute per user — protects against cost abuse.
 */
export const llmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Batas request chat tercapai. Silakan tunggu sebentar." },
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: any) => {
    return req.session?.user?.id || req.ip || "unknown";
  },
});

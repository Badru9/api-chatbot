/**
 * Structured request logger middleware.
 *
 * Logs every request as JSON with:
 * - timestamp, method, path, statusCode, durationMs, ip
 * - userId (from session, if available — no PII like email)
 *
 * Does NOT log: request body, auth tokens, cookies, or email addresses.
 */
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.headers["x-forwarded-for"] || "unknown",
      userId: req.session?.user?.id || null,
      userAgent: req.headers["user-agent"]?.substring(0, 100) || null,
    };

    if (res.statusCode >= 500) {
      console.error("[request]", JSON.stringify(logEntry));
    } else if (res.statusCode >= 400) {
      console.warn("[request]", JSON.stringify(logEntry));
    } else {
      console.log("[request]", JSON.stringify(logEntry));
    }
  });

  next();
};

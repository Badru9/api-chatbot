import cors from "cors";
import express from "express";
import helmet from "helmet";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import documentRoutes from "./routes/documents.js";
import menuRoutes from "./routes/menus.js";
import scheduleRoutes from "./routes/schedules.js";
import { initBucket } from "./services/storage.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

import { requestLogger } from "./middleware/requestLogger.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
app.use(requestLogger);
app.use(generalLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/schedules", scheduleRoutes);

app.get("/health", (_req: any, res: any) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (_req: any, res: any) => {
  res.json({
    status: "ok",
    message:
      "Hello! 🐾 Welcome to the MB.AI Chatbot API! We are ready to help you chat, learn, and grow. Have a wonderful day! ✨",
  });
});

app.listen(PORT, async () => {
  console.log(`[api-chatbot] Server running on http://localhost:${PORT}`);

  // Ensure S3 bucket exists
  try {
    await initBucket();
  } catch (error) {
    console.warn("[storage] Failed to initialize bucket:", error instanceof Error ? error.message : error);
  }
});

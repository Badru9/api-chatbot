/**
 * Vercel serverless entry point.
 * Wraps Express app as a handler function.
 *
 * ⚠️ ponytail: This is the lazy bridge. Ideal: migrate to Next.js API routes.
 *    Works fine for now — Express on Vercel via this pattern is battle-tested.
 */

import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../src/services/auth.js";

import chatRoutes from "../src/routes/chat.js";
import documentRoutes from "../src/routes/documents.js";
import menuRoutes from "../src/routes/menus.js";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Better Auth handler BEFORE express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/menus", menuRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Vercel expects a default export — Express handles it
export default app;

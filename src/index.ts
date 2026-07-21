import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import documentRoutes from "./routes/documents.js";
import menuRoutes from "./routes/menus.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/menus", menuRoutes);

app.get("/health", (_req: any, res: any) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[api-chatbot] Server running on http://localhost:${PORT}`);
});

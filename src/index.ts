const cors = require("cors");
const express = require("express");
const { toNodeHandler } = require("better-auth/node");
const { auth } = require("./services/auth");

const chatRoutes = require("./routes/chat");
const documentRoutes = require("./routes/documents");
const menuRoutes = require("./routes/menus");

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

// Mount Better Auth handler BEFORE express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/menus", menuRoutes);

app.get("/health", (_req: any, res: any) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[api-chatbot] Server running on http://localhost:${PORT}`);
});

export {};

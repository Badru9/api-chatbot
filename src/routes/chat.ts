import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { retrievePdfContext } from "../services/retriever.js";

const router = Router();
router.use(requireAuth);

// Helper function to build instruction prompt
function buildSystemInstruction(): string {
  return "Anda adalah mb.ai, asisten AI akademik yang membantu dosen di universitas. Berikan jawaban yang akurat, informatif, dan profesional.";
}

router.post("/context", async (req: any, res: any) => {
  try {
    const { prompt, documentIds, limit } = req.body;
    const user = req.session?.user;
    const isUserAdmin = user?.role === "admin";
    const userId = isUserAdmin ? undefined : user?.id;

    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Field prompt wajib diisi." });
      return;
    }

    const ids = Array.isArray(documentIds)
      ? documentIds.filter(
          (id: unknown): id is string =>
            typeof id === "string" && (id as string).trim().length > 0,
        )
      : [];

    const context = await retrievePdfContext({
      prompt: prompt.trim(),
      documentIds: ids,
      limit: typeof limit === "number" ? limit : undefined,
      userId,
    });

    res.json({ context });
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Gagal mengambil konteks.",
    });
  }
});

router.post("/", async (req: any, res: any) => {
  try {
    const { prompt, documentIds, messages } = req.body;
    const user = req.session?.user;
    const isUserAdmin = user?.role === "admin";
    const userId = isUserAdmin ? undefined : user?.id;

    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "Field prompt wajib diisi." });
      return;
    }

    const ids = Array.isArray(documentIds)
      ? documentIds.filter(
          (id: unknown): id is string =>
            typeof id === "string" && (id as string).trim().length > 0,
        )
      : [];

    // 1. Get PDF Context
    let pdfContext = "";
    if (ids.length > 0) {
      try {
        pdfContext = await retrievePdfContext({
          prompt: prompt.trim(),
          documentIds: ids,
          userId,
        });
      } catch (err) {
        console.error("Failed to retrieve context:", err);
      }
    }

    // 2. Build RAG prompt
    const finalUserPrompt = pdfContext
      ? `Gunakan informasi dokumen berikut untuk menjawab pertanyaan.\n\n[DOKUMEN CONTEXT]\n${pdfContext}\n\n[PERTANYAAN]\n${prompt.trim()}`
      : prompt.trim();

    // 3. Format messages
    const finalMessages = Array.isArray(messages) ? [...messages] : [];
    if (finalMessages.length === 0) {
      finalMessages.push({ role: "user", content: prompt });
    }

    // Replace last user message content with context-enriched prompt
    for (let i = finalMessages.length - 1; i >= 0; i--) {
      if (finalMessages[i].role === "user") {
        finalMessages[i] = { ...finalMessages[i], content: finalUserPrompt };
        break;
      }
    }

    const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
    const ollamaModel = process.env.OLLAMA_MODEL || "qwen3.5";

    const ollamaMessages = [
      { role: "system", content: buildSystemInstruction() },
      ...finalMessages,
    ];

    // 4. Request Ollama with stream enabled
    const ollamaRes = await fetch(`${ollamaHost}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        messages: ollamaMessages,
        stream: true,
      }),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      res.status(500).json({ error: `Ollama error: ${errText}` });
      return;
    }

    // Set streaming headers
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = ollamaRes.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      res.status(500).json({ error: "Ollama response body is empty" });
      return;
    }

    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Save the last incomplete line back to the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const content = parsed.message?.content || "";
          if (content) {
            res.write(content);
          }
        } catch (err) {
          console.error(
            "Failed to parse Ollama chunk line:",
            err,
            "Line:",
            line,
          );
        }
      }
    }

    // Parse remaining buffer
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        const content = parsed.message?.content || "";
        if (content) {
          res.write(content);
        }
      } catch {}
    }

    res.end();
  } catch (error) {
    console.error("Chat error:", error);
    res
      .status(500)
      .json({
        error:
          error instanceof Error ? error.message : "Gagal memproses pesan.",
      });
  }
});

export default router;

import { Router } from "express";
import { login, logout, getSession } from "../services/auth.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// POST /api/auth/sign-in/email or /api/auth/login
router.post(["/login", "/sign-in/email"], async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email dan password wajib diisi." });
      return;
    }

    const ipAddress = req.ip || req.headers["x-forwarded-for"];
    const userAgent = req.headers["user-agent"];

    const result = await login(email, password, ipAddress, userAgent);
    if (!result) {
      res.status(401).json({ error: "Email atau password salah." });
      return;
    }

    res.cookie("session_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Gagal melakukan autentikasi.",
    });
  }
});

// POST /api/auth/logout or /api/auth/sign-out
router.post(["/logout", "/sign-out"], async (req: any, res: any) => {
  try {
    const authHeader = req.headers?.authorization;
    let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;

    if (!token && req.headers?.cookie) {
      const cookies = req.headers.cookie.split(";").map((c: string) => c.trim());
      const sessionCookie = cookies.find((c: string) => c.startsWith("session_token="));
      if (sessionCookie) token = sessionCookie.split("=")[1];
    }

    if (token) {
      await logout(token);
    }

    res.clearCookie("session_token");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Gagal logout.",
    });
  }
});

// GET /api/auth/me or /api/auth/get-session
router.get(["/me", "/get-session"], requireAuth, (req: any, res: any) => {
  res.json(req.session);
});

export default router;

import { getSession } from "../services/auth.js";

function extractToken(req: any): string | null {
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  if (req.headers?.cookie) {
    const cookies = req.headers.cookie.split(";").map((c: string) => c.trim());
    const sessionCookie = cookies.find((c: string) => c.startsWith("session_token="));
    if (sessionCookie) {
      return sessionCookie.split("=")[1];
    }
  }
  return null;
}

export const requireAdmin = async (req: any, res: any, next: any) => {
  let session = req.session;

  if (!session?.user) {
    const token = extractToken(req);
    if (token) {
      session = await getSession(token);
      if (session) {
        req.session = session;
      }
    }
  }

  if (!session || !session.user || session.user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: Admin access required" });
    return;
  }

  next();
};

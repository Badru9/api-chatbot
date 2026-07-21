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

export const requireAuth = async (req: any, res: any, next: any) => {
  if (req.session?.user) {
    next();
    return;
  }

  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result = await getSession(token);
  if (!result) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.session = result;
  next();
};

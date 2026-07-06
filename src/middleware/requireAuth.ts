import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../services/auth.js";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session =
    (req as any).session ||
    (await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    }));

  // console.log("Session:", session);

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Attach session to request
  (req as any).session = session;
  next();
};

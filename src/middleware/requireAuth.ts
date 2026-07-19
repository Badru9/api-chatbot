const { fromNodeHeaders } = require("better-auth/node");
const { auth } = require("../services/auth");

export const requireAuth = async (req: any, res: any, next: any) => {
  const session =
    req.session ||
    (await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    }));

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Attach session to request
  req.session = session;
  next();
};

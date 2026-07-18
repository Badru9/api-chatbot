const { fromNodeHeaders } = require("better-auth/node");
const { auth } = require("../services/auth");

export const requireAdmin = async (req: any, res: any, next: any) => {
  const session = req.session || await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session || session.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }

  next();
};

import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../services/auth.js';

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const session = (req as any).session || await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session || session.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }

  next();
};
